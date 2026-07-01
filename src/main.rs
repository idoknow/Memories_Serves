use anyhow::{Context, Result};
use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, HeaderMap, HeaderValue, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use chrono::{Local, Timelike};
use rand::{distributions::Alphanumeric, Rng};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::{env, net::SocketAddr, path::PathBuf, sync::Arc, time::Duration};
use subtle::ConstantTimeEq;
use tokio::{fs, net::TcpListener, signal, time::sleep};
use tower_http::{limit::RequestBodyLimitLayer, trace::TraceLayer};
use tracing::{error, info, warn};
use url::Url;

const TOKEN_TTL_MS: i64 = 10 * 60 * 1000;
const PAGE_LIMIT: i64 = 20;
const PROBE_START_HOUR: u32 = 0;
const PROBE_END_HOUR: u32 = 6;
const PROBE_DELAY: Duration = Duration::from_secs(1);
const BACKUP_HOUR: u32 = 1;

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
    client: Client,
    data_dir: PathBuf,
    db_path: PathBuf,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    error: String,
}

#[derive(Debug, Serialize)]
struct HealthBody {
    ok: bool,
}

#[derive(Debug, Deserialize)]
struct CreateImageRequest {
    url: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct ImageBody {
    id: i64,
    url: String,
    uploaded_at: i64,
}

#[derive(Debug, Serialize)]
struct ImageListBody {
    data: Vec<ImageBody>,
    next_after_id: Option<i64>,
    limit: i64,
}

#[derive(Debug, Deserialize)]
struct ImageListQuery {
    after_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct AdminTokenQuery {
    key: String,
}

#[derive(Debug, Serialize)]
struct AdminTokenBody {
    token: String,
    expires_at: i64,
    ttl_seconds: i64,
}

#[derive(Debug, Deserialize)]
struct DeleteImageRequest {
    token: Option<String>,
    id: i64,
}

#[derive(Debug, Deserialize)]
struct BackupConfigRequest {
    token: Option<String>,
    enabled: bool,
    webdav_url: Option<String>,
    username: Option<String>,
    password: Option<String>,
}

#[derive(Debug, Serialize)]
struct BackupConfigBody {
    enabled: bool,
    webdav_url: Option<String>,
    username: Option<String>,
    password_configured: bool,
}

#[derive(Debug, sqlx::FromRow)]
struct AdminState {
    admin_key_hash: Option<String>,
    token: Option<String>,
    token_hash: Option<String>,
    token_expires_at: Option<i64>,
}

#[derive(Debug, sqlx::FromRow)]
struct SchedulerState {
    last_image_id: i64,
    last_backup_date: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct ProbeImage {
    id: i64,
    url: String,
}

#[derive(Debug, sqlx::FromRow)]
struct BackupConfigRow {
    enabled: i64,
    webdav_url: Option<String>,
    username: Option<String>,
    password: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(env::var("RUST_LOG").unwrap_or_else(|_| "info,tower_http=warn".into()))
        .init();

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3000);
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let data_dir = PathBuf::from(env::var("DATA_DIR").unwrap_or_else(|_| "data".to_string()));
    let db_path = PathBuf::from(env::var("DB_PATH").unwrap_or_else(|_| {
        data_dir
            .join("images.sqlite")
            .to_string_lossy()
            .into_owned()
    }));
    let admin_path = env::var("ADMIN_PATH").unwrap_or_else(|_| "/admin/token".to_string());

    fs::create_dir_all(&data_dir)
        .await
        .context("create data directory")?;
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)
            .await
            .context("create database directory")?;
    }

    let db = open_database(&db_path).await?;
    init_database(&db).await?;

    let state = Arc::new(AppState {
        db,
        client: Client::builder()
            .timeout(Duration::from_secs(10))
            .pool_idle_timeout(Duration::from_secs(30))
            .build()
            .context("build http client")?,
        data_dir,
        db_path,
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/images", post(create_image).get(list_images))
        .route("/images/:id", delete(delete_image))
        .route("/admin/images/delete", post(delete_image_post))
        .route(
            "/admin/backup",
            get(get_backup_config).post(set_backup_config),
        )
        .route(&admin_path, get(admin_token))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            admin_middleware,
        ))
        .layer(RequestBodyLimitLayer::new(64 * 1024))
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    tokio::spawn(probe_loop(state.clone()));
    tokio::spawn(backup_loop(state.clone()));

    let addr: SocketAddr = format!("{host}:{port}")
        .parse()
        .context("parse listen address")?;
    let listener = TcpListener::bind(addr).await.context("bind tcp listener")?;
    info!(%addr, "server started");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("serve")?;

    Ok(())
}

async fn open_database(db_path: &PathBuf) -> Result<SqlitePool> {
    let url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());
    SqlitePoolOptions::new()
        .max_connections(
            env::var("DB_MAX_CONNECTIONS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8),
        )
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&url)
        .await
        .context("connect sqlite")
}

async fn init_database(db: &SqlitePool) -> Result<()> {
    sqlx::query("PRAGMA journal_mode = WAL").execute(db).await?;
    sqlx::query("PRAGMA synchronous = NORMAL")
        .execute(db)
        .await?;
    sqlx::query("PRAGMA temp_store = MEMORY")
        .execute(db)
        .await?;
    sqlx::query("PRAGMA cache_size = -65536")
        .execute(db)
        .await?;
    sqlx::query("PRAGMA busy_timeout = 5000")
        .execute(db)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            uploaded_at INTEGER NOT NULL,
            last_requested_at INTEGER,
            request_count INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(db)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_images_id ON images(id)")
        .execute(db)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS admin_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            admin_key_hash TEXT,
            token TEXT,
            token_hash TEXT,
            token_expires_at INTEGER
        )
        "#,
    )
    .execute(db)
    .await?;
    let _ = sqlx::query("ALTER TABLE admin_state ADD COLUMN token TEXT")
        .execute(db)
        .await;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS scheduler_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_image_id INTEGER NOT NULL DEFAULT 0,
            last_backup_date TEXT
        )
        "#,
    )
    .execute(db)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS backup_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            enabled INTEGER NOT NULL DEFAULT 0,
            webdav_url TEXT,
            username TEXT,
            password TEXT
        )
        "#,
    )
    .execute(db)
    .await?;

    sqlx::query("INSERT OR IGNORE INTO admin_state (id) VALUES (1)")
        .execute(db)
        .await?;
    sqlx::query("INSERT OR IGNORE INTO scheduler_state (id) VALUES (1)")
        .execute(db)
        .await?;
    sqlx::query("INSERT OR IGNORE INTO backup_config (id) VALUES (1)")
        .execute(db)
        .await?;

    Ok(())
}

async fn health() -> Json<HealthBody> {
    Json(HealthBody { ok: true })
}

async fn create_image(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateImageRequest>,
) -> Response {
    let Some(url) = normalize_url(&payload.url) else {
        return error_response(
            StatusCode::BAD_REQUEST,
            "valid http or https url is required",
        );
    };

    let uploaded_at = now_ms();
    match sqlx::query("INSERT INTO images (url, uploaded_at) VALUES (?, ?)")
        .bind(&url)
        .bind(uploaded_at)
        .execute(&state.db)
        .await
    {
        Ok(result) => (
            StatusCode::CREATED,
            Json(ImageBody {
                id: result.last_insert_rowid(),
                url,
                uploaded_at,
            }),
        )
            .into_response(),
        Err(error) => {
            error!(?error, "insert image failed");
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "database write failed")
        }
    }
}

async fn list_images(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ImageListQuery>,
) -> Response {
    let after_id = query.after_id.unwrap_or(0).max(0);
    match sqlx::query_as::<_, ImageBody>(
        "SELECT id, url, uploaded_at FROM images WHERE id > ? ORDER BY id ASC LIMIT ?",
    )
    .bind(after_id)
    .bind(PAGE_LIMIT)
    .fetch_all(&state.db)
    .await
    {
        Ok(rows) => {
            let next_after_id = if rows.len() == PAGE_LIMIT as usize {
                rows.last().map(|row| row.id)
            } else {
                None
            };
            Json(ImageListBody {
                data: rows,
                next_after_id,
                limit: PAGE_LIMIT,
            })
            .into_response()
        }
        Err(error) => {
            error!(?error, "list images failed");
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "database read failed")
        }
    }
}

async fn admin_token(
    State(state): State<Arc<AppState>>,
    Query(query): Query<AdminTokenQuery>,
) -> Response {
    if query.key.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "key query parameter is required");
    }

    let key_hash = hash_secret(&query.key);
    let admin = match get_admin_state(&state.db).await {
        Ok(admin) => admin,
        Err(error) => {
            error!(?error, "load admin state failed");
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "admin state unavailable");
        }
    };

    match admin.admin_key_hash {
        None => {
            if let Err(error) =
                sqlx::query("UPDATE admin_state SET admin_key_hash = ? WHERE id = 1")
                    .bind(&key_hash)
                    .execute(&state.db)
                    .await
            {
                error!(?error, "set admin key failed");
                return error_response(StatusCode::INTERNAL_SERVER_ERROR, "admin key write failed");
            }
        }
        Some(stored_hash) if !constant_eq(&stored_hash, &key_hash) => {
            return error_response(StatusCode::UNAUTHORIZED, "invalid key");
        }
        Some(_) => {}
    }

    if let (Some(token), Some(expires_at)) = (admin.token, admin.token_expires_at) {
        if expires_at > now_ms() {
            return Json(AdminTokenBody {
                token,
                expires_at,
                ttl_seconds: (expires_at - now_ms()).max(0) / 1000,
            })
            .into_response();
        }
    }

    let token = random_token();
    let token_hash = hash_secret(&token);
    let expires_at = now_ms() + TOKEN_TTL_MS;

    match sqlx::query(
        "UPDATE admin_state SET token = ?, token_hash = ?, token_expires_at = ? WHERE id = 1",
    )
    .bind(&token)
    .bind(token_hash)
    .bind(expires_at)
    .execute(&state.db)
    .await
    {
        Ok(_) => Json(AdminTokenBody {
            token,
            expires_at,
            ttl_seconds: TOKEN_TTL_MS / 1000,
        })
        .into_response(),
        Err(error) => {
            error!(?error, "set token failed");
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "token write failed")
        }
    }
}

async fn delete_image(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> Response {
    delete_image_by_id(&state.db, id).await
}

async fn delete_image_post(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeleteImageRequest>,
) -> Response {
    match validate_admin_token(&state.db, payload.token.as_deref()).await {
        Ok(true) => {}
        Ok(false) => {
            return error_response(StatusCode::UNAUTHORIZED, "invalid or expired admin token")
        }
        Err(error) => {
            error!(?error, "admin token validation failed");
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "admin validation unavailable",
            );
        }
    }

    delete_image_by_id(&state.db, payload.id).await
}

async fn delete_image_by_id(db: &SqlitePool, id: i64) -> Response {
    if id <= 0 {
        return error_response(StatusCode::BAD_REQUEST, "valid image id is required");
    }

    match sqlx::query("DELETE FROM images WHERE id = ?")
        .bind(id)
        .execute(db)
        .await
    {
        Ok(result) => Json(serde_json::json!({ "deleted": result.rows_affected() > 0, "id": id }))
            .into_response(),
        Err(error) => {
            error!(?error, "delete image failed");
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "database delete failed")
        }
    }
}

async fn get_backup_config(State(state): State<Arc<AppState>>) -> Response {
    match get_backup_row(&state.db).await {
        Ok(config) => Json(BackupConfigBody {
            enabled: config.enabled == 1,
            webdav_url: config.webdav_url,
            username: config.username,
            password_configured: config.password.is_some_and(|password| !password.is_empty()),
        })
        .into_response(),
        Err(error) => {
            error!(?error, "get backup config failed");
            error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "backup config unavailable",
            )
        }
    }
}

async fn set_backup_config(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<BackupConfigRequest>,
) -> Response {
    match validate_admin_token(&state.db, payload.token.as_deref()).await {
        Ok(true) => {}
        Ok(false) => {
            return error_response(StatusCode::UNAUTHORIZED, "invalid or expired admin token")
        }
        Err(error) => {
            error!(?error, "admin token validation failed");
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "admin validation unavailable",
            );
        }
    }

    let webdav_url = payload
        .webdav_url
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    if payload.enabled {
        let Some(url) = webdav_url.as_ref() else {
            return error_response(
                StatusCode::BAD_REQUEST,
                "valid webdav_url is required when backup is enabled",
            );
        };
        if normalize_url(url).is_none() {
            return error_response(
                StatusCode::BAD_REQUEST,
                "valid webdav_url is required when backup is enabled",
            );
        }
    }

    match sqlx::query("UPDATE backup_config SET enabled = ?, webdav_url = ?, username = ?, password = ? WHERE id = 1")
        .bind(if payload.enabled { 1 } else { 0 })
        .bind(webdav_url)
        .bind(payload.username)
        .bind(payload.password)
        .execute(&state.db)
        .await
    {
        Ok(_) => Json(serde_json::json!({ "ok": true, "enabled": payload.enabled })).into_response(),
        Err(error) => {
            error!(?error, "set backup config failed");
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "backup config write failed")
        }
    }
}

async fn admin_middleware(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let path = request.uri().path();
    let method = request.method().clone();
    let protected = (method == axum::http::Method::DELETE && path.starts_with("/images/"))
        || (method == axum::http::Method::GET && path == "/admin/backup");

    if !protected {
        return next.run(request).await;
    }

    let token =
        extract_token(request.headers()).or_else(|| extract_query_token(request.uri().query()));

    match validate_admin_token(&state.db, token.as_deref()).await {
        Ok(true) => next.run(request).await,
        Ok(false) => error_response(StatusCode::UNAUTHORIZED, "invalid or expired admin token"),
        Err(error) => {
            error!(?error, "admin token validation failed");
            error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "admin validation unavailable",
            )
        }
    }
}

async fn validate_admin_token(db: &SqlitePool, token: Option<&str>) -> Result<bool> {
    let Some(token) = token else {
        return Ok(false);
    };
    let admin = get_admin_state(db).await?;
    let Some(token_hash) = admin.token_hash else {
        return Ok(false);
    };
    let Some(expires_at) = admin.token_expires_at else {
        return Ok(false);
    };

    if expires_at <= now_ms() {
        sqlx::query(
            "UPDATE admin_state SET token = NULL, token_hash = NULL, token_expires_at = NULL WHERE id = 1",
        )
        .execute(db)
        .await?;
        return Ok(false);
    }

    Ok(constant_eq(&token_hash, &hash_secret(token)))
}

async fn get_admin_state(db: &SqlitePool) -> Result<AdminState, sqlx::Error> {
    sqlx::query_as::<_, AdminState>(
        "SELECT admin_key_hash, token, token_hash, token_expires_at FROM admin_state WHERE id = 1",
    )
    .fetch_one(db)
    .await
}

async fn get_backup_row(db: &SqlitePool) -> Result<BackupConfigRow, sqlx::Error> {
    sqlx::query_as::<_, BackupConfigRow>(
        "SELECT enabled, webdav_url, username, password FROM backup_config WHERE id = 1",
    )
    .fetch_one(db)
    .await
}

async fn probe_loop(state: Arc<AppState>) {
    loop {
        if !is_probe_window() {
            sleep(Duration::from_secs(60)).await;
            continue;
        }

        if let Err(error) = probe_once(&state).await {
            warn!(?error, "probe iteration failed");
            sleep(Duration::from_secs(30)).await;
            continue;
        }

        sleep(PROBE_DELAY).await;
    }
}

async fn probe_once(state: &AppState) -> Result<()> {
    let scheduler = sqlx::query_as::<_, SchedulerState>(
        "SELECT last_image_id, last_backup_date FROM scheduler_state WHERE id = 1",
    )
    .fetch_one(&state.db)
    .await?;

    let mut image = sqlx::query_as::<_, ProbeImage>(
        "SELECT id, url FROM images WHERE id > ? ORDER BY id ASC LIMIT 1",
    )
    .bind(scheduler.last_image_id)
    .fetch_optional(&state.db)
    .await?;

    if image.is_none() {
        image =
            sqlx::query_as::<_, ProbeImage>("SELECT id, url FROM images ORDER BY id ASC LIMIT 1")
                .fetch_optional(&state.db)
                .await?;
    }

    let Some(image) = image else {
        sleep(Duration::from_secs(60)).await;
        return Ok(());
    };

    if let Err(error) = state.client.get(&image.url).send().await {
        warn!(
            ?error,
            image_id = image.id,
            "scheduled image request failed"
        );
    }

    sqlx::query(
        "UPDATE images SET last_requested_at = ?, request_count = request_count + 1 WHERE id = ?",
    )
    .bind(now_ms())
    .bind(image.id)
    .execute(&state.db)
    .await?;
    sqlx::query("UPDATE scheduler_state SET last_image_id = ? WHERE id = 1")
        .bind(image.id)
        .execute(&state.db)
        .await?;

    Ok(())
}

async fn backup_loop(state: Arc<AppState>) {
    loop {
        let current = Local::now();
        let today = current.format("%Y-%m-%d").to_string();

        match should_backup(&state.db, current.hour(), &today).await {
            Ok(true) => {
                if let Err(error) = backup_database(&state).await {
                    error!(?error, "backup failed");
                } else if let Err(error) =
                    sqlx::query("UPDATE scheduler_state SET last_backup_date = ? WHERE id = 1")
                        .bind(&today)
                        .execute(&state.db)
                        .await
                {
                    error!(?error, "record backup date failed");
                }
            }
            Ok(false) => {}
            Err(error) => error!(?error, "backup check failed"),
        }

        sleep(Duration::from_secs(10 * 60)).await;
    }
}

async fn should_backup(db: &SqlitePool, hour: u32, today: &str) -> Result<bool> {
    if hour != BACKUP_HOUR {
        return Ok(false);
    }

    let scheduler = sqlx::query_as::<_, SchedulerState>(
        "SELECT last_image_id, last_backup_date FROM scheduler_state WHERE id = 1",
    )
    .fetch_one(db)
    .await?;
    let config = get_backup_row(db).await?;
    Ok(config.enabled == 1 && scheduler.last_backup_date.as_deref() != Some(today))
}

async fn backup_database(state: &AppState) -> Result<()> {
    let config = get_backup_row(&state.db).await?;
    let Some(webdav_url) = config.webdav_url else {
        return Ok(());
    };

    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&state.db)
        .await?;

    let backup_name = format!("images-{}.sqlite", Local::now().format("%Y%m%d-%H%M%S"));
    let backup_path = state.data_dir.join(&backup_name);
    fs::copy(&state.db_path, &backup_path)
        .await
        .context("copy sqlite database")?;
    let bytes = fs::read(&backup_path).await.context("read backup file")?;

    let mut target = Url::parse(&webdav_url).context("parse webdav url")?;
    if !target.path().ends_with('/') {
        target.set_path(&format!("{}/", target.path()));
    }
    let path = format!("{}{}", target.path(), backup_name);
    target.set_path(&path);

    let mut request = state.client.put(target).body(bytes);
    if config.username.is_some() || config.password.is_some() {
        request = request.basic_auth(config.username.unwrap_or_default(), config.password);
    }

    let response = request.send().await.context("upload backup")?;
    if !response.status().is_success() {
        anyhow::bail!("webdav upload failed with {}", response.status());
    }

    let _ = fs::remove_file(backup_path).await;
    Ok(())
}

fn normalize_url(value: &str) -> Option<String> {
    if value.len() > 4096 {
        return None;
    }
    let parsed = Url::parse(value.trim()).ok()?;
    match parsed.scheme() {
        "http" | "https" => Some(parsed.to_string()),
        _ => None,
    }
}

fn is_probe_window() -> bool {
    let hour = Local::now().hour();
    (PROBE_START_HOUR..PROBE_END_HOUR).contains(&hour)
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn random_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(64)
        .map(char::from)
        .collect()
}

fn hash_secret(secret: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn constant_eq(left: &str, right: &str) -> bool {
    left.as_bytes().ct_eq(right.as_bytes()).into()
}

fn extract_token(headers: &HeaderMap<HeaderValue>) -> Option<String> {
    let value = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    value
        .strip_prefix("Bearer ")
        .map(|token| token.trim().to_string())
}

fn extract_query_token(query: Option<&str>) -> Option<String> {
    query?
        .split('&')
        .find_map(|part| part.strip_prefix("token=").map(|token| token.to_string()))
}

fn error_response(status: StatusCode, message: &str) -> Response {
    (
        status,
        Json(ErrorBody {
            error: message.to_string(),
        }),
    )
        .into_response()
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
