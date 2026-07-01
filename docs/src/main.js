import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import http from 'highlight.js/lib/languages/http';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/github-dark.css';
import './styles.css';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('http', http);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);

const translations = {
  zh: {
    subtitle: 'API Documentation', navOverview: '概览', navApi: '接口参考', navOperations: '运维说明', navAi: 'AI 对接', githubLabel: '打开 GitHub', langLabel: '切换语言', menuLabel: '展开导航', copy: '复制', copied: '已复制', copyFailed: '复制失败', copyCode: '复制代码', copyMarkdown: '复制 Markdown', preview: '在线预览', rawMarkdown: 'Markdown 原文', loadingMarkdown: '正在加载 Markdown 原文...', markdownFailed: 'Markdown 原文加载失败，请稍后重试。',
    overviewTitle: '面向业务系统的图片 URL 接口服务文档', overviewLead: '一套正式、清晰、可交付的接口文档，覆盖项目资料、核心能力、REST API、备份策略、后台任务与 AI Agent 对接契约。', viewApi: '查看接口参考', aiQuickStart: 'AI 快速接入', repository: '仓库', organization: '组织', developer: '开发人员', version: '版本', pageSize: '分页规模', pageSizeValue: '20 条/页', pageSizeText: '固定 keyset 分页，适合稳定读取。', authStrategy: '认证策略', authValue: '10 分钟 token', authText: '管理员 key 换取短期操作 token。', runtime: '运行环境', runtimeValue: '2c2g 友好', runtimeText: 'Rust 异步服务配合 SQLite WAL。', backup: '备份能力', backupText: '每日自动备份 SQLite 数据库。', projectProfile: '项目资料', projectProfileText: 'Memories Serves 是一个使用 Rust、Axum、SQLx 与 SQLite 构建的轻量 API 服务，主要用于保存图片 URL、记录上传时间戳、按 ID 顺序读取，并支持管理员删除和 WebDAV 备份。', dataFormat: '数据格式', database: '数据库', quickStart: '启动服务',
    apiTitle: '接口参考', apiIntro: '所有接口均返回 JSON。管理类接口需要管理员 token，公开读取和写入接口不需要认证。', health: '健康检查', create: '上传 URL', list: '读取列表', token: '管理员 token', delete: '删除数据', webdavBackup: 'WebDAV 备份', healthText: '健康检查接口，用于部署平台探活。', createText: '写入单条图片 URL，并返回自增 ID 与上传时间戳。', listText: '读取图片列表，每页最多 20 条。传入上一页返回的 next_after_id 继续读取。', tokenText: '获取管理员 token。首次请求会设置管理员 key，后续必须使用同一个 key。', deleteText: '推荐删除方式，在 body 中携带 token 和目标 ID。', backupApiText: '配置 WebDAV 自动备份。关闭备份时只需传入 token 和 enabled=false。', field: '字段', type: '类型', required: '必填', description: '说明', yes: '是', urlRule: '必须是 http 或 https URL', tokenRule1: 'token 有效期 10 分钟。', tokenRule2: '有效期内重复请求返回当前 token。', tokenRule3: '过期后使用正确 key 自动生成新 token。',
    operationsTitle: '运维说明', operationsIntro: '覆盖启动、环境变量、后台调度、WebDAV 备份和小规格服务器运行建议。', startup: '启动方式', envVars: '环境变量', variable: '变量', defaultValue: '默认值', portText: 'HTTP 服务端口', hostText: '监听地址', dataDirText: '数据目录', dbPathText: 'SQLite 文件路径', adminPathText: '管理员 token 接口路径', dbConnectionsText: 'SQLite 连接池最大连接数', logText: '日志级别', nightTask: '夜间顺序请求', nightTaskText: '每天 0 点到 6 点顺序请求数据库 URL，每秒约 1 次，并记录最后处理 ID。', webdavTitle: 'WebDAV 备份', webdavText: '每天 1 点执行一次 SQLite 备份，启用后通过 WebDAV PUT 上传到目标目录。', sqlitePerf: 'SQLite 性能', sqlitePerfText: '使用 WAL、NORMAL synchronous、busy timeout 和 SQLx 连接池，适合单实例部署。', deployAdvice: '部署建议', deployAdviceText: '建议使用 systemd 或同类进程管理工具保持单实例运行，不要多进程写同一个 SQLite 文件。',
    aiTitle: 'AI 快速对接', aiIntro: '面向 AI Agent、自动化脚本和第三方系统的最小接口契约。', openMarkdown: '打开 Markdown 原文', flow: '调用流程', contract: '最小契约', errors: '错误处理', recommendedFlow: '推荐调用流程', flow1: '调用 GET /health 判断服务是否可用。', flow2: '调用 POST /images 写入单条图片 URL。', flow3: '调用 GET /images?after_id=0 读取第一页数据。', flow4: '调用 GET /admin/token?key=YOUR_KEY 获取管理员 token。', flow5: '使用 token 调用删除或备份配置接口。', minContract: '最小接口契约', errorsText: '错误响应通常为 { "error": "message" }。AI Agent 应按 HTTP 状态码决定是否重试、刷新 token 或交给人工处理。', statusCode: '状态码', meaning: '含义', suggestion: '建议', code400Meaning: '参数或 JSON 错误', code400Suggestion: '修正请求后重试', code401Meaning: 'token 缺失、错误或过期', code401Suggestion: '重新获取 token', code404Meaning: '资源不存在', code404Suggestion: '停止当前资源操作', code500Meaning: '服务内部错误', code500Suggestion: '稍后重试或人工检查日志', jsExample: 'JavaScript 示例', markdownSectionTitle: 'AI 对接 Markdown 原文', markdownSectionText: '在页面内直接查看渲染后的文档或完整 Markdown，便于在线核对、复制并交给 AI Agent 使用。',
  },
  en: {
    subtitle: 'API Documentation', navOverview: 'Overview', navApi: 'API Reference', navOperations: 'Operations', navAi: 'AI Integration', githubLabel: 'Open GitHub', langLabel: 'Switch language', menuLabel: 'Toggle navigation', copy: 'Copy', copied: 'Copied', copyFailed: 'Copy failed', copyCode: 'Copy code', copyMarkdown: 'Copy Markdown', preview: 'Live preview', rawMarkdown: 'Raw Markdown', loadingMarkdown: 'Loading Markdown source...', markdownFailed: 'Failed to load Markdown source. Please try again later.',
    overviewTitle: 'Image URL API service docs for business systems', overviewLead: 'A formal, clear, delivery-ready documentation set covering project details, core capabilities, REST APIs, backup strategy, background jobs, and AI Agent integration contracts.', viewApi: 'View API reference', aiQuickStart: 'AI quick start', repository: 'Repository', organization: 'Organization', developer: 'Developer', version: 'Version', pageSize: 'Page size', pageSizeValue: '20 items/page', pageSizeText: 'Stable keyset pagination for reliable reads.', authStrategy: 'Auth strategy', authValue: '10 minute token', authText: 'Exchange an admin key for a short-lived operation token.', runtime: 'Runtime', runtimeValue: '2c2g friendly', runtimeText: 'Rust async service with SQLite WAL.', backup: 'Backup', backupText: 'Automatic daily SQLite database backup.', projectProfile: 'Project profile', projectProfileText: 'Memories Serves is a lightweight API service built with Rust, Axum, SQLx, and SQLite. It stores image URLs, records upload timestamps, reads by ID order, and supports admin deletion plus WebDAV backups.', dataFormat: 'Data format', database: 'Database', quickStart: 'Start service',
    apiTitle: 'API Reference', apiIntro: 'All endpoints return JSON. Admin endpoints require an admin token; public read and write endpoints do not require authentication.', health: 'Health check', create: 'Upload URL', list: 'List images', token: 'Admin token', delete: 'Delete data', webdavBackup: 'WebDAV backup', healthText: 'Health check endpoint for deployment probes.', createText: 'Writes a single image URL and returns the auto-increment ID plus upload timestamp.', listText: 'Reads image records with a maximum of 20 items per page. Use next_after_id from the previous response to continue.', tokenText: 'Gets an admin token. The first request stores the admin key; future requests must use the same key.', deleteText: 'Recommended delete endpoint, carrying the token and target ID in the request body.', backupApiText: 'Configures automatic WebDAV backups. To disable backups, send token and enabled=false.', field: 'Field', type: 'Type', required: 'Required', description: 'Description', yes: 'Yes', urlRule: 'Must be an http or https URL', tokenRule1: 'Tokens are valid for 10 minutes.', tokenRule2: 'Requests during the valid window return the current token.', tokenRule3: 'After expiration, the correct key generates a new token.',
    operationsTitle: 'Operations', operationsIntro: 'Covers startup, environment variables, background scheduling, WebDAV backups, and small-server deployment guidance.', startup: 'Startup', envVars: 'Environment variables', variable: 'Variable', defaultValue: 'Default', portText: 'HTTP service port', hostText: 'Listen address', dataDirText: 'Data directory', dbPathText: 'SQLite file path', adminPathText: 'Admin token endpoint path', dbConnectionsText: 'Maximum SQLite pool connections', logText: 'Log level', nightTask: 'Nightly sequential requests', nightTaskText: 'Requests stored URLs sequentially from midnight to 6 AM, roughly once per second, and records the last processed ID.', webdavTitle: 'WebDAV backup', webdavText: 'Runs one SQLite backup at 1 AM daily and uploads it to the target directory through WebDAV PUT when enabled.', sqlitePerf: 'SQLite performance', sqlitePerfText: 'Uses WAL, NORMAL synchronous, busy timeout, and the SQLx pool for single-instance deployments.', deployAdvice: 'Deployment advice', deployAdviceText: 'Use systemd or a similar process manager to keep one instance running. Avoid multiple processes writing the same SQLite file.',
    aiTitle: 'AI Integration', aiIntro: 'A minimal API contract for AI Agents, automation scripts, and third-party systems.', openMarkdown: 'Open Markdown source', flow: 'Flow', contract: 'Contract', errors: 'Errors', recommendedFlow: 'Recommended flow', flow1: 'Call GET /health to check service availability.', flow2: 'Call POST /images to write one image URL.', flow3: 'Call GET /images?after_id=0 to read the first page.', flow4: 'Call GET /admin/token?key=YOUR_KEY to get an admin token.', flow5: 'Use the token for delete or backup configuration endpoints.', minContract: 'Minimum contract', errorsText: 'Error responses are usually { "error": "message" }. AI Agents should use HTTP status codes to decide whether to retry, refresh a token, or hand off to a human.', statusCode: 'Status', meaning: 'Meaning', suggestion: 'Suggestion', code400Meaning: 'Parameter or JSON error', code400Suggestion: 'Fix the request and retry', code401Meaning: 'Missing, invalid, or expired token', code401Suggestion: 'Request a new token', code404Meaning: 'Resource not found', code404Suggestion: 'Stop the current resource operation', code500Meaning: 'Internal server error', code500Suggestion: 'Retry later or inspect logs manually', jsExample: 'JavaScript example', markdownSectionTitle: 'AI Integration Markdown Source', markdownSectionText: 'View the rendered document or full Markdown in-page for online review, copying, and AI Agent handoff.',
  },
};

const icons = {
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.1c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z"/></svg>',
  language: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.87 15.07a8.16 8.16 0 0 0 1.94-4.03H17V9h-5V7h-2v2H5v2.04h7.77a6.18 6.18 0 0 1-1.35 2.72 12.44 12.44 0 0 1-1.97-2.4H7.2a14.5 14.5 0 0 0 2.7 3.85l-3.4 3.35L7.93 20l3.46-3.47 2.15 1.94 1.33-1.5-2-1.9ZM19.5 20l-1.1-3h-3.8l-1.1 3h-2.13L15 10h3l3.63 10H19.5Zm-4.18-4.95h2.36L16.5 11.8l-1.18 3.25Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 2.8L17.2 8H14V4.8ZM6 20V4h6v6h6v10H6Z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 12c-3.79 0-7.17-2.13-8.8-5C4.83 9.13 8.21 7 12 7s7.17 2.13 8.8 5c-1.63 2.87-5.01 5-8.8 5Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>',
  server: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 11h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Zm2-7.5v2h2v-2H6Zm0 10v2h2v-2H6Z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5.5v6.2c0 5.04 3.42 9.72 8 10.9 4.58-1.18 8-5.86 8-10.9V5.5L12 2Zm0 2.18 6 2.63v4.89c0 3.92-2.48 7.63-6 8.8-3.52-1.17-6-4.88-6-8.8V6.81l6-2.63Z"/></svg>',
  database: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C7.58 2 4 3.57 4 5.5v13C4 20.43 7.58 22 12 22s8-1.57 8-3.5v-13C20 3.57 16.42 2 12 2Zm0 2c3.87 0 6 1.16 6 1.5S15.87 7 12 7 6 5.84 6 5.5 8.13 4 12 4Zm6 6.2c0 .34-2.13 1.5-6 1.5s-6-1.16-6-1.5V8.03C7.44 8.65 9.56 9 12 9s4.56-.35 6-.97v2.17Zm0 4.15c0 .34-2.13 1.5-6 1.5s-6-1.16-6-1.5v-2.17c1.44.62 3.56.97 6 .97s4.56-.35 6-.97v2.17Zm-6 5.65c-3.87 0-6-1.16-6-1.5v-2.17c1.44.62 3.56.97 6 .97s4.56-.35 6-.97v2.17c0 .34-2.13 1.5-6 1.5Z"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.45 5.05L18.5 8.5l-5.05 1.45L12 15l-1.45-5.05L5.5 8.5l5.05-1.45L12 2Zm6.5 10 1 3.5L23 16.5l-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1 1-3.5ZM5.5 13l.78 2.72L9 16.5l-2.72.78L5.5 20l-.78-2.72L2 16.5l2.72-.78L5.5 13Z"/></svg>',
};

const storageKey = 'memories-serves-docs-lang';
let currentLanguage = localStorage.getItem(storageKey) || (navigator.language?.startsWith('zh') ? 'zh' : 'en');

function t(key) { return translations[currentLanguage]?.[key] || translations.zh[key] || key; }

function setButtonState(button, stateKey) {
  const icon = button.dataset.icon ? icons[button.dataset.icon] : '';
  button.innerHTML = `${icon}<span>${t(stateKey)}</span>`;
  button.setAttribute('aria-label', t(button.dataset.label || stateKey));
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const icon = element.dataset.icon ? icons[element.dataset.icon] : '';
    element.innerHTML = icon ? `${icon}<span>${t(element.dataset.i18n)}</span>` : t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nLabel));
    element.setAttribute('title', t(element.dataset.i18nLabel));
  });
  document.querySelectorAll('[data-i18n-copy]').forEach((button) => setButtonState(button, button.dataset.i18nCopy));
  const languageButton = document.querySelector('[data-language-toggle]');
  if (languageButton) languageButton.querySelector('span').textContent = currentLanguage === 'zh' ? 'EN' : '中';
}

function setupIcons() {
  document.querySelectorAll('[data-icon]').forEach((element) => {
    const icon = icons[element.dataset.icon];
    if (icon && !element.querySelector('svg')) element.insertAdjacentHTML('afterbegin', icon);
  });
  document.querySelectorAll('[data-icon-card]').forEach((element) => {
    const icon = icons[element.dataset.iconCard];
    if (icon && !element.querySelector('.card-icon')) element.insertAdjacentHTML('afterbegin', `<span class="card-icon">${icon}</span>`);
  });
}

function setupLanguageToggle() {
  const button = document.querySelector('[data-language-toggle]');
  if (!button) return;
  button.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
    localStorage.setItem(storageKey, currentLanguage);
    applyTranslations();
  });
}

function setupNavToggle() {
  const button = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('.nav-links');
  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    button.setAttribute('aria-expanded', String(isOpen));
  });
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      button.setAttribute('aria-expanded', 'false');
    });
  });
}

function setupCopyButtons() {
  document.querySelectorAll('pre').forEach((block) => {
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.type = 'button';
    button.dataset.icon = 'copy';
    button.dataset.label = 'copyCode';
    button.dataset.i18nCopy = 'copy';
    setButtonState(button, 'copy');
    button.addEventListener('click', async () => {
      const code = block.querySelector('code');
      const text = code ? code.innerText.trim() : block.innerText.trim();
      try {
        await navigator.clipboard.writeText(text);
        setButtonState(button, 'copied');
      } catch {
        setButtonState(button, 'copyFailed');
      }
      window.setTimeout(() => setButtonState(button, 'copy'), 1400);
    });
    block.appendChild(button);
  });
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function inlineMarkdown(value) {
  return escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(source) {
  const html = [];
  let listType = null;
  let inFence = false;
  let fenceLanguage = '';
  let fenceLines = [];
  const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = null; } };
  const flushFence = () => { html.push(`<pre><code class="language-${escapeHtml(fenceLanguage || 'text')}">${escapeHtml(fenceLines.join('\n'))}</code></pre>`); fenceLanguage = ''; fenceLines = []; };

  source.split('\n').forEach((line) => {
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      if (inFence) { flushFence(); inFence = false; } else { closeList(); inFence = true; fenceLanguage = fence[1] || ''; }
      return;
    }
    if (inFence) { fenceLines.push(line); return; }
    if (!line.trim()) { closeList(); return; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { closeList(); const level = heading[1].length + 1; html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); return; }
    const unordered = line.match(/^-\s+(.+)$/);
    if (unordered) { if (listType !== 'ul') { closeList(); listType = 'ul'; html.push('<ul>'); } html.push(`<li>${inlineMarkdown(unordered[1])}</li>`); return; }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) { if (listType !== 'ol') { closeList(); listType = 'ol'; html.push('<ol>'); } html.push(`<li>${inlineMarkdown(ordered[1])}</li>`); return; }
    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  });
  closeList();
  if (inFence) flushFence();
  return html.join('');
}

async function setupMarkdownPreview() {
  const section = document.querySelector('[data-markdown-source]');
  if (!section) return;
  const raw = section.querySelector('[data-markdown-raw]');
  const preview = section.querySelector('[data-markdown-preview]');
  const copyButton = section.querySelector('[data-markdown-copy]');
  let markdownText = '';

  try {
    const response = await fetch(section.dataset.markdownSource);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    markdownText = await response.text();
    raw.textContent = markdownText;
    preview.innerHTML = renderMarkdown(markdownText);
    preview.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
  } catch {
    raw.textContent = t('markdownFailed');
    preview.textContent = t('markdownFailed');
    copyButton.disabled = true;
  }

  section.querySelectorAll('[data-markdown-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.markdownTab;
      section.querySelectorAll('[data-markdown-tab]').forEach((item) => item.classList.toggle('active', item === tab));
      section.querySelectorAll('[data-markdown-panel]').forEach((panel) => { panel.hidden = panel.dataset.markdownPanel !== mode; });
    });
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setButtonState(copyButton, 'copied');
    } catch {
      setButtonState(copyButton, 'copyFailed');
    }
    window.setTimeout(() => setButtonState(copyButton, 'copyMarkdown'), 1400);
  });
}

function finishPageLoad() {
  window.requestAnimationFrame(() => {
    document.body.classList.add('is-ready');
    document.body.classList.remove('is-loading');
  });
}

setupIcons();
setupLanguageToggle();
setupNavToggle();
setupCopyButtons();
applyTranslations();
hljs.highlightAll();
setupMarkdownPreview().finally(finishPageLoad);