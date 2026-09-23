/**
 * Cloudflare Worker: Serverless AI API Key Management Console & Multi-Protocol Gateway
 * 
 * Supports:
 * - Native Cloudflare Workers AI Binding (Zero external API Key needed!)
 * - Claude Code CLI (/v1/messages) translated directly to Workers AI
 * - OpenAI CLI / ZCode (/v1/chat/completions) translated directly to Workers AI
 * - Model list (/v1/models)
 * - Embedded Web UI Dashboard (/admin) for API Key distribution, usage quota, and upstream channels
 */

const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edge AI Gateway - API 控制台</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    :root {
      --bg-main: #0b0f19;
      --card-bg: rgba(23, 32, 53, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(30, 41, 69, 0.85);
      --primary-glow: #6366f1;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    body {
      background-color: var(--bg-main);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(56, 189, 248, 0.1) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
    }
    .navbar {
      background: rgba(15, 23, 42, 0.85) !important;
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36);
      color: var(--text-main);
    }
    .table {
      --bs-table-bg: transparent;
      --bs-table-color: var(--text-main);
      --bs-table-border-color: rgba(255, 255, 255, 0.07);
    }
    .table-light, thead.table-light th {
      background: rgba(255, 255, 255, 0.03) !important;
      color: var(--text-muted) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    .table-hover tbody tr:hover td {
      background: rgba(255, 255, 255, 0.03) !important;
    }
    .nav-pills .nav-link {
      color: var(--text-muted);
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 8px 16px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .nav-pills .nav-link:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }
    .nav-pills .nav-link.active {
      color: #fff;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.4);
    }
    .form-control, .form-select {
      background-color: rgba(15, 23, 42, 0.8) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      color: #f1f5f9 !important;
      border-radius: 8px;
    }
    .form-control:focus, .form-select:focus {
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25) !important;
    }
    .form-control::placeholder {
      color: #64748b !important;
    }
    .modal-content {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      color: #f8fafc;
    }
    .modal-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-close {
      filter: invert(1);
    }
    .dropdown-menu {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .dropdown-item {
      color: #cbd5e1;
    }
    .dropdown-item:hover {
      background: rgba(99, 102, 241, 0.2);
      color: #fff;
    }
    .code-box {
      background: #090d16;
      color: #38bdf8;
      padding: 14px;
      border-radius: 10px;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.06);
      word-break: break-all;
    }
    code {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .alert-info-glass {
      background: rgba(14, 165, 233, 0.1);
      border: 1px solid rgba(14, 165, 233, 0.25);
      border-radius: 12px;
      color: #bae6fd;
    }
    .pulse-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  </style>
</head>
<body>
  <nav class="navbar navbar-dark px-4 py-3">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1 d-flex align-items-center gap-2">
        <i class="bi bi-cpu-fill text-warning"></i> Edge AI Gateway 控制台
      </span>
      <div id="nav-user" class="d-none text-light align-items-center gap-3">
        <span class="d-flex align-items-center gap-2 small bg-dark bg-opacity-50 px-3 py-1 rounded-pill border border-secondary border-opacity-25">
          <span class="pulse-dot"></span> 管理员在线
        </span>
        <button class="btn btn-sm btn-outline-light border-opacity-25" onclick="logout()">退出登录</button>
      </div>
    </div>
  </nav>

  <div class="container py-4">
    <!-- 登录模块 -->
    <div id="login-section" class="row justify-content-center py-5">
      <div class="col-md-5">
        <div class="card p-4">
          <h4 class="card-title text-center mb-4"><i class="bi bi-shield-lock text-primary me-2"></i>管理员登录</h4>
          
          <!-- 登录方式切换导航 (由系统设置开关决定是否显示邮箱验证) -->
          <ul class="nav nav-pills nav-fill mb-3 d-none" id="login-method-nav">
            <li class="nav-item">
              <button class="nav-link active py-1" id="btn-login-pwd-tab" type="button" onclick="switchLoginMethod('pwd')"><i class="bi bi-key me-1"></i>密码登录</button>
            </li>
            <li class="nav-item">
              <button class="nav-link py-1" id="btn-login-email-tab" type="button" onclick="switchLoginMethod('email')"><i class="bi bi-envelope-at me-1"></i>邮箱验证码</button>
            </li>
          </ul>

          <!-- 方式 1: 密码登录 (原版，始终保留) -->
          <div id="login-form-pwd">
            <div class="mb-3">
              <label class="form-label text-muted small">管理员密码</label>
              <input type="password" id="admin-pwd" class="form-control" placeholder="默认密码: admin" onkeydown="if(event.key==='Enter') login()">
            </div>
            <button class="btn btn-primary w-100 py-2" onclick="login()"><i class="bi bi-box-arrow-in-right me-1"></i> 立即登录</button>
          </div>

          <!-- 方式 2: 邮箱验证码登录 (通过配置开关控制开启) -->
          <div id="login-form-email" class="d-none">
            <div class="mb-3">
              <label class="form-label text-muted small">管理员安全邮箱</label>
              <input type="email" id="login-email" class="form-control" value="cf@xvuvx.com" placeholder="例如 cf@xvuvx.com">
            </div>
            <div class="mb-3">
              <label class="form-label text-muted small">动态验证码</label>
              <div class="input-group">
                <input type="text" id="login-email-code" class="form-control" placeholder="6 位验证码" maxlength="6" onkeydown="if(event.key==='Enter') loginByEmailCode()">
                <button class="btn btn-outline-secondary" type="button" id="btn-send-code" onclick="sendLoginEmailCode()"><i class="bi bi-send me-1"></i>发送验证码</button>
              </div>
              <div class="form-text small opacity-75 mt-1">验证码将发送至绑定的 Cloudflare 目标邮箱。</div>
            </div>
            <button class="btn btn-primary w-100 py-2" onclick="loginByEmailCode()"><i class="bi bi-shield-check me-1"></i> 验证并登录</button>
          </div>

          <div id="login-err" class="text-danger small mt-2 text-center d-none"></div>
          <div id="login-succ" class="text-success small mt-2 text-center d-none"></div>
        </div>
      </div>
    </div>

    <!-- 主控面板 -->
    <div id="main-section" class="d-none">
      <div class="alert alert-info-glass d-flex align-items-center mb-4 p-3">
        <i class="bi bi-cpu-fill fs-3 me-3 text-info"></i>
        <div>
          <div class="fw-bold">Cloudflare Workers AI 边缘原生计算加速中</div> 
          <div class="small opacity-75">系统默认直接由 Cloudflare 边缘全球算力节点直出（含 <code>Llama 3.3 70B</code>、<code>DeepSeek R1 32B</code>、<code>Qwen 2.5 Coder</code>），免外接商业 API Key。</div>
        </div>
      </div>

      <ul class="nav nav-pills mb-4" id="pills-tab" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="tab-btn-keys" data-bs-toggle="pill" data-bs-target="#tab-keys" type="button" role="tab"><i class="bi bi-key-fill"></i> 分发令牌 (API Keys)</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tab-btn-channels" data-bs-toggle="pill" data-bs-target="#tab-channels" type="button" role="tab"><i class="bi bi-hdd-network-fill"></i> 渠道与模型映射</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tab-btn-models" data-bs-toggle="pill" data-bs-target="#tab-models" type="button" role="tab"><i class="bi bi-robot"></i> 可用模型库</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tab-btn-guide" data-bs-toggle="pill" data-bs-target="#tab-guide" type="button" role="tab"><i class="bi bi-terminal-fill"></i> CLI 接入指引</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tab-btn-settings" data-bs-toggle="pill" data-bs-target="#tab-settings" type="button" role="tab"><i class="bi bi-gear-fill"></i> 系统设置</button>
        </li>
      </ul>

      <div class="tab-content" id="pills-tabContent">
        <!-- 令牌管理 -->
        <div class="tab-pane fade show active" id="tab-keys">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">已生成的 API Keys</h5>
            <button class="btn btn-primary btn-sm" onclick="openCreateKeyModal()"><i class="bi bi-plus-lg"></i> 创建新 Key</button>
          </div>
          <div class="card p-0 overflow-hidden">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>名称</th>
                  <th>Key (用于客户端)</th>
                  <th>已用 / 配额 (次)</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="keys-tbody">
                <tr><td colspan="5" class="text-center py-4 text-muted">加载中...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 渠道管理 -->
        <div class="tab-pane fade" id="tab-channels">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">上游渠道与模型配置</h5>
            <button class="btn btn-primary btn-sm" onclick="openCreateChannelModal()"><i class="bi bi-plus-lg"></i> 添加外部渠道(可选)</button>
          </div>
          <div class="card p-0 overflow-hidden mb-4">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>渠道名称</th>
                  <th>协议类型</th>
                  <th>后端类型</th>
                  <th>端点 / 模型</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="channels-tbody">
                <tr><td colspan="5" class="text-center py-4 text-muted">加载中...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="card p-4">
            <h6 class="fw-bold mb-3"><i class="bi bi-cpu text-primary"></i> 默认 Cloudflare Workers AI 边缘模型映射配置</h6>
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Claude Code 映射的 CF 边缘模型：</label>
                <div class="input-group">
                  <input type="text" id="cf-claude-model" class="form-control" list="model-presets">
                  <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">预设选择</button>
                  <ul class="dropdown-menu dropdown-menu-end" id="claude-presets-dropdown"></ul>
                </div>
                <div class="form-text text-secondary" style="color: #94a3b8 !important;">Claude Code 发起的请求若未特别指定模型，将默认由此模型处理。</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold">OpenAI / ZCode 映射的 CF 边缘模型：</label>
                <div class="input-group">
                  <input type="text" id="cf-openai-model" class="form-control" list="model-presets">
                  <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">预设选择</button>
                  <ul class="dropdown-menu dropdown-menu-end" id="openai-presets-dropdown"></ul>
                </div>
                <div class="form-text text-secondary" style="color: #94a3b8 !important;">OpenAI CLI / ZCode 请求若使用通用名称时，映射到的边缘模型。</div>
              </div>
            </div>
            <datalist id="model-presets"></datalist>

            <div class="d-flex justify-content-between align-items-center pt-3 border-top" style="border-color: rgba(255,255,255,0.08) !important;">
              <span class="small" style="color: #94a3b8;">支持在客户端直接通过 <code>model</code> 参数动态调用列表内的任一模型。</span>
              <button class="btn btn-primary btn-sm px-4 shadow-sm" onclick="saveModelMapping()"><i class="bi bi-check-lg"></i> 保存并立即生效</button>
            </div>

            <!-- 可用模型一览表 -->
            <div class="mt-4 pt-3 border-top" style="border-color: rgba(255,255,255,0.08) !important;">
              <h6 class="fw-bold small mb-3 text-light opacity-75"><i class="bi bi-grid-3x3-gap me-1 text-primary"></i> Cloudflare 官方热门边缘模型快速点击切换：</h6>
              <div class="d-flex flex-wrap gap-2" id="quick-models-container"></div>
            </div>
          </div>
        </div>

        <!-- 可用模型库详情面板 -->
        <div class="tab-pane fade" id="tab-models">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <div>
              <h5 class="mb-1"><i class="bi bi-robot text-primary"></i> 可用边缘大模型列表</h5>
              <div class="text-muted small">所有列出的模型均支持直接调用，复制模型 ID 即可在 CLI 或代码中使用。</div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <input type="text" id="model-search" class="form-control form-control-sm" placeholder="搜索模型名称或厂商..." oninput="filterModelsTable()">
              <button class="btn btn-outline-secondary btn-sm text-nowrap" onclick="loadModelsCatalog()"><i class="bi bi-arrow-clockwise"></i> 刷新</button>
            </div>
          </div>

          <div class="card p-0 overflow-hidden mb-4">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>模型名称</th>
                  <th>官方模型 ID (复制即可用)</th>
                  <th>提供方 / 架构</th>
                  <th>核心亮点 / 特点</th>
                  <th>快速测试</th>
                </tr>
              </thead>
              <tbody id="models-table-body">
                <tr><td colspan="5" class="text-center py-4 text-muted">加载中...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CLI 接入教程 -->
        <div class="tab-pane fade" id="tab-guide">
          <div class="row g-4">
            <div class="col-md-6">
              <div class="card p-3 h-100">
                <h6 class="fw-bold"><i class="bi bi-command text-primary"></i> Claude Code CLI 配置</h6>
                <p class="text-muted small">设置环境变量将 Claude Code 请求直接导向当前边缘 Worker，边缘自动调用 Workers AI：</p>
                <div class="code-box mb-2" id="guide-claude">
export ANTHROPIC_BASE_URL="[WORKER_URL]"
export ANTHROPIC_API_KEY="sk-cf-xxxxxxxx"
claude
                </div>
                <small class="text-secondary">Claude Code 发起的 <code>/v1/messages</code> 请求将在边缘翻译并由 Cloudflare AI 极速计算。</small>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card p-3 h-100">
                <h6 class="fw-bold"><i class="bi bi-terminal text-success"></i> OpenAI CLI / ZCode 配置</h6>
                <p class="text-muted small">标准 OpenAI 兼容格式配置：</p>
                <div class="code-box mb-2" id="guide-openai">
export OPENAI_BASE_URL="[WORKER_URL]/v1"
export OPENAI_API_KEY="sk-cf-xxxxxxxx"
                </div>
                <small class="text-secondary">ZCode 中请将 Endpoint 设置为 <code>[WORKER_URL]/v1</code> 并填入 API Key。</small>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统设置 -->
        <div class="tab-pane fade" id="tab-settings">
          <div class="row g-4">
            <!-- 密码修改 -->
            <div class="col-md-6">
              <div class="card p-4 h-100">
                <h6 class="fw-bold mb-3"><i class="bi bi-key-fill text-primary me-2"></i>修改管理员密码</h6>
                <div class="mb-3">
                  <label class="form-label small" style="color: #cbd5e1;">新密码</label>
                  <input type="password" id="new-admin-pwd" class="form-control" placeholder="输入新的管理员密码">
                </div>
                <button class="btn btn-outline-primary" onclick="changeAdminPwd()">更新密码</button>
              </div>
            </div>

            <!-- 访问门禁开关 (控制是否显示登录页，默认关闭：未开启时免登录直达控制台) -->
            <div class="col-md-6">
              <div class="card p-4 h-100 border-primary border-opacity-25" style="background: rgba(99, 102, 241, 0.06);">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="fw-bold mb-0 text-primary"><i class="bi bi-shield-lock-fill me-2"></i>网页访问门禁 (登录页总开关)</h6>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="login-gate-enabled" role="switch" style="cursor: pointer; transform: scale(1.25);">
                  </div>
                </div>
                <p class="small mb-3" style="color: #cbd5e1;">
                  <strong>当前设计原则：默认关闭</strong>。<br>
                  • <strong>关闭（默认）</strong>：访客与开发者访问网页时<strong>无需登录</strong>，直接进入控制台管理与调试；<br>
                  • <strong>开启</strong>：进入网页必须通过管理员身份核验（密码或邮箱验证码）方可访问。
                </p>
                <div class="alert alert-dark bg-dark bg-opacity-50 border-secondary border-opacity-25 py-2 px-3 small text-muted mb-3">
                  <i class="bi bi-info-circle me-1 text-info"></i> 关闭状态下，高危操作（如删除 Key、复制完整 API Key）仍受二级管理员密码保护。
                </div>
                <button class="btn btn-primary" onclick="saveLoginGateConfig()"><i class="bi bi-check2-circle me-1"></i>保存访问门禁设置</button>
              </div>
            </div>

            <!-- 邮箱验证码登录开关 (配置中心) -->
            <div class="col-md-6">
              <div class="card p-4 h-100">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="fw-bold mb-0"><i class="bi bi-envelope-shield text-info me-2"></i>邮箱验证码登录设置</h6>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="email-auth-enabled" role="switch" onchange="toggleEmailAuthUI()" style="cursor: pointer; transform: scale(1.2);">
                  </div>
                </div>
                <p class="small mb-3" style="color: #94a3b8;">在开启了上述“网页访问门禁”的前提下，可进一步启用邮箱动态验证码登录（可与传统密码登录并存）。</p>
                <div class="mb-3">
                  <label class="form-label small" style="color: #cbd5e1;">接收验证码的安全管理员邮箱</label>
                  <input type="email" id="email-auth-addr" class="form-control" value="cf@xvuvx.com" placeholder="例如 cf@xvuvx.com">
                </div>
                <div class="mb-3">
                  <label class="form-label small" style="color: #cbd5e1;">邮件发件服务 API Key (可选 Resend API Key，留空走内置邮件通道)</label>
                  <input type="password" id="email-resend-key" class="form-control" placeholder="re_xxxxxxxxxxxx">
                  <div class="form-text small mt-1" style="color: #94a3b8;">若留空，系统将直接通过 Cloudflare 边缘环境投递或记录日志。</div>
                </div>
                <button class="btn btn-primary" onclick="saveEmailAuthConfig()"><i class="bi bi-floppy me-1"></i>保存邮箱登录设置</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 创建 Key Modal -->
  <div class="modal fade" id="keyModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">创建 API Key</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Key 名称/备注</label>
            <input type="text" id="key-name" class="form-control" placeholder="如：Claude Code 专用">
          </div>
          <div class="mb-3">
            <label class="form-label">请求次数配额 (0 表示无限制)</label>
            <input type="number" id="key-quota" class="form-control" value="0">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-primary" onclick="saveKey()">生成</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 创建 渠道 Modal -->
  <div class="modal fade" id="channelModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">配置上游渠道</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">渠道名称</label>
            <input type="text" id="chan-name" class="form-control" placeholder="如：Anthropic 官方">
          </div>
          <div class="mb-3">
            <label class="form-label">协议类型</label>
            <select id="chan-type" class="form-select">
              <option value="anthropic">Anthropic (Claude 协议)</option>
              <option value="openai">OpenAI / 兼容端点</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Base URL (留空默认使用官方端点)</label>
            <input type="text" id="chan-base" class="form-control">
          </div>
          <div class="mb-3">
            <label class="form-label">真实 API Key</label>
            <input type="password" id="chan-key" class="form-control" placeholder="sk-ant-... 或 sk-...">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-primary" onclick="saveChannel()">保存渠道</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 二级确认密码 Modal -->
  <div class="modal fade" id="copyConfirmModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi bi-shield-lock-fill text-warning"></i> 安全确认：复制 API Key</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p class="text-muted small mb-3">为保障密钥安全，复制完整的 API Key 前需输入管理员密码进行身份核验。</p>
          <div class="mb-3">
            <label class="form-label fw-semibold">请输入管理员密码</label>
            <input type="password" id="confirm-pwd" class="form-control" placeholder="管理员密码" onkeydown="if(event.key==='Enter') executeCopyKey()">
            <div id="copy-pwd-err" class="text-danger small mt-2 d-none"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-primary" onclick="executeCopyKey()"><i class="bi bi-clipboard-check"></i> 验证并复制</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 二级删除确认 Modal (风格与安全复制弹窗一致) -->
  <div class="modal fade" id="deleteConfirmModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header border-danger border-opacity-25" style="background: rgba(239, 68, 68, 0.1);">
          <h5 class="modal-title text-danger"><i class="bi bi-exclamation-triangle-fill me-2"></i> 高危确认：删除项</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p class="text-muted small mb-3" id="delete-modal-desc">确认要删除此项吗？</p>
          <div class="mb-3">
            <label class="form-label fw-semibold">请输入管理员密码以核准删除</label>
            <input type="password" id="delete-confirm-pwd" class="form-control" placeholder="管理员密码" onkeydown="if(event.key==='Enter') executeDeleteConfirm()">
            <div id="delete-pwd-err" class="text-danger small mt-2 d-none"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-danger" onclick="executeDeleteConfirm()"><i class="bi bi-trash3-fill"></i> 验证并永久删除</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    let token = localStorage.getItem('admin_token') || '';
    const currentOrigin = window.location.origin;

    document.getElementById('guide-claude').innerText = 
      'export ANTHROPIC_BASE_URL="' + currentOrigin + '"\\nexport ANTHROPIC_API_KEY="sk-cf-xxxxxxxx"\\nclaude';
    document.getElementById('guide-openai').innerText = 
      'export OPENAI_BASE_URL="' + currentOrigin + '/v1"\\nexport OPENAI_API_KEY="sk-cf-xxxxxxxx"';

    async function req(path, opt = {}) {
      opt.headers = opt.headers || {};
      if (token) opt.headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch('/admin/api' + path, opt);
      if (res.status === 401) {
        logout();
        throw new Error('未授权');
      }
      return await res.json();
    }

    // 登录方式切换 (密码 vs 邮箱验证码)
    function switchLoginMethod(method) {
      const err = document.getElementById('login-err');
      const succ = document.getElementById('login-succ');
      if (err) err.classList.add('d-none');
      if (succ) succ.classList.add('d-none');

      if (method === 'pwd') {
        document.getElementById('btn-login-pwd-tab').classList.add('active');
        document.getElementById('btn-login-email-tab').classList.remove('active');
        document.getElementById('login-form-pwd').classList.remove('d-none');
        document.getElementById('login-form-email').classList.add('d-none');
      } else {
        document.getElementById('btn-login-email-tab').classList.add('active');
        document.getElementById('btn-login-pwd-tab').classList.remove('active');
        document.getElementById('login-form-email').classList.remove('d-none');
        document.getElementById('login-form-pwd').classList.add('d-none');
      }
    }

    // 发送邮箱动态验证码
    let sendCodeCountdown = 0;
    async function sendLoginEmailCode() {
      const email = (document.getElementById('login-email').value || '').trim();
      const err = document.getElementById('login-err');
      const succ = document.getElementById('login-succ');
      err.classList.add('d-none');
      succ.classList.add('d-none');

      if (!email) {
        err.innerText = '请输入安全管理员邮箱';
        err.classList.remove('d-none');
        return;
      }

      const btn = document.getElementById('btn-send-code');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>发送中...';

      try {
        const res = await fetch('/admin/api/send-email-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
          succ.innerText = data.message || '验证码已发送至邮箱，请查收！';
          succ.classList.remove('d-none');
          
          // 倒计时 60 秒
          sendCodeCountdown = 60;
          const timer = setInterval(() => {
            sendCodeCountdown--;
            if (sendCodeCountdown <= 0) {
              clearInterval(timer);
              btn.disabled = false;
              btn.innerHTML = '<i class="bi bi-send me-1"></i>重新发送';
            } else {
              btn.innerHTML = sendCodeCountdown + 's 后重试';
            }
          }, 1000);
        } else {
          err.innerText = data.error || '验证码发送失败';
          err.classList.remove('d-none');
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-send me-1"></i>发送验证码';
        }
      } catch (e) {
        err.innerText = '请求异常: ' + e.message;
        err.classList.remove('d-none');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send me-1"></i>发送验证码';
      }
    }

    // 邮箱验证码登录
    async function loginByEmailCode() {
      const email = (document.getElementById('login-email').value || '').trim();
      const code = (document.getElementById('login-email-code').value || '').trim();
      const err = document.getElementById('login-err');
      const succ = document.getElementById('login-succ');
      err.classList.add('d-none');
      succ.classList.add('d-none');

      if (!code) {
        err.innerText = '请输入 6 位动态验证码';
        err.classList.remove('d-none');
        return;
      }

      try {
        const res = await fetch('/admin/api/login-by-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (data.token) {
          token = data.token;
          localStorage.setItem('admin_token', token);
          showDashboard();
        } else {
          err.innerText = data.error || '验证码错误或已失效';
          err.classList.remove('d-none');
        }
      } catch (e) {
        err.innerText = '登录失败: ' + e.message;
        err.classList.remove('d-none');
      }
    }

    async function login() {
      const pwd = document.getElementById('admin-pwd').value;
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      const data = await res.json();
      if (data.token) {
        token = data.token;
        localStorage.setItem('admin_token', token);
        showDashboard();
      } else {
        const err = document.getElementById('login-err');
        err.innerText = data.error || '密码错误';
        err.classList.remove('d-none');
      }
    }

    function logout() {
      token = '';
      localStorage.removeItem('admin_token');
      document.getElementById('login-section').classList.remove('d-none');
      document.getElementById('main-section').classList.add('d-none');
      document.getElementById('nav-user').classList.remove('d-flex');
      document.getElementById('nav-user').classList.add('d-none');
      checkLoginMethodAvailability();
    }

    function showDashboard() {
      document.getElementById('login-section').classList.add('d-none');
      document.getElementById('main-section').classList.remove('d-none');
      document.getElementById('nav-user').classList.remove('d-none');
      document.getElementById('nav-user').classList.add('d-flex');
      loadKeys();
      loadChannels();
      loadSettings();
    }

    let pendingKeyToCopy = '';

    function promptCopyKey(key) {
      pendingKeyToCopy = key;
      document.getElementById('confirm-pwd').value = '';
      const err = document.getElementById('copy-pwd-err');
      err.innerText = '';
      err.classList.add('d-none');
      const modal = new bootstrap.Modal(document.getElementById('copyConfirmModal'));
      modal.show();
      setTimeout(() => document.getElementById('confirm-pwd').focus(), 400);
    }

    async function executeCopyKey() {
      const pwd = document.getElementById('confirm-pwd').value;
      const err = document.getElementById('copy-pwd-err');
      if (!pwd) {
        err.innerText = '请输入管理员密码';
        err.classList.remove('d-none');
        return;
      }

      try {
        const res = await req('/verify-pwd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });

        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('copyConfirmModal')).hide();
          navigator.clipboard.writeText(pendingKeyToCopy).then(() => {
            alert('验证成功！API Key 已复制到剪贴板。');
          }).catch(() => {
            prompt('验证成功！请手动复制 API Key:', pendingKeyToCopy);
          });
        }
      } catch (e) {
        err.innerText = '密码错误，验证失败！';
        err.classList.remove('d-none');
      }
    }

    let pendingDeleteAction = null;

    function promptDeleteKey(key, name) {
      pendingDeleteAction = async () => {
        await req('/keys?key=' + encodeURIComponent(key), { method: 'DELETE' });
        loadKeys();
      };
      document.getElementById('delete-modal-desc').innerHTML = 
        '您正在尝试删除 API Key：<strong>' + (name || key.slice(0, 10)) + '</strong>。<br><span class="text-danger">删除后使用此 Key 的客户端（如 Claude Code / zCode）将立刻无法接入！</span>';
      document.getElementById('delete-confirm-pwd').value = '';
      const err = document.getElementById('delete-pwd-err');
      err.innerText = '';
      err.classList.add('d-none');
      const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
      modal.show();
      setTimeout(() => document.getElementById('delete-confirm-pwd').focus(), 400);
    }

    function promptDeleteChannel(id, name) {
      pendingDeleteAction = async () => {
        await req('/channels?id=' + encodeURIComponent(id), { method: 'DELETE' });
        loadChannels();
      };
      document.getElementById('delete-modal-desc').innerHTML = 
        '您正在尝试删除上游渠道配置：<strong>' + (name || id) + '</strong>。<br><span class="text-danger">删除后将无法通过此渠道路由请求。</span>';
      document.getElementById('delete-confirm-pwd').value = '';
      const err = document.getElementById('delete-pwd-err');
      err.innerText = '';
      err.classList.add('d-none');
      const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
      modal.show();
      setTimeout(() => document.getElementById('delete-confirm-pwd').focus(), 400);
    }

    async function executeDeleteConfirm() {
      const pwd = document.getElementById('delete-confirm-pwd').value;
      const err = document.getElementById('delete-pwd-err');
      if (!pwd) {
        err.innerText = '请输入管理员密码以核准操作';
        err.classList.remove('d-none');
        return;
      }

      try {
        const res = await req('/verify-pwd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });

        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
          if (pendingDeleteAction) {
            await pendingDeleteAction();
            pendingDeleteAction = null;
          }
        }
      } catch (e) {
        err.innerText = '密码错误，无权执行删除！';
        err.classList.remove('d-none');
      }
    }

    async function loadKeys() {
      const list = await req('/keys');
      const tbody = document.getElementById('keys-tbody');
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">暂无 Key，请点击右上角创建</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(k => \`
        <tr>
          <td>\${k.name}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <code>\${k.key.slice(0, 10)}****************\${k.key.slice(-4)}</code>
              <button class="btn btn-outline-primary btn-sm py-0 px-2 d-flex align-items-center gap-1" title="复制完整Key (需验证密码)" onclick="promptCopyKey('\${k.key}')">
                <i class="bi bi-clipboard"></i> 复制
              </button>
            </div>
          </td>
          <td>\${k.used || 0} / \${k.quota === 0 ? '无限制' : k.quota}</td>
          <td><span class="badge \${k.enabled ? 'bg-success' : 'bg-secondary'}">\${k.enabled ? '有效' : '禁用'}</span></td>
          <td>
            <button class="btn btn-outline-danger btn-sm py-0 px-2 d-flex align-items-center gap-1" title="删除 Key (需验证密码)" onclick="promptDeleteKey('\${k.key}', '\${k.name}')">
              <i class="bi bi-trash"></i> 删除
            </button>
          </td>
        </tr>
      \`).join('');
    }

    function openCreateKeyModal() {
      document.getElementById('key-name').value = '';
      document.getElementById('key-quota').value = '0';
      new bootstrap.Modal(document.getElementById('keyModal')).show();
    }

    async function saveKey() {
      const name = document.getElementById('key-name').value;
      const quota = parseInt(document.getElementById('key-quota').value) || 0;
      await req('/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quota })
      });
      bootstrap.Modal.getInstance(document.getElementById('keyModal')).hide();
      loadKeys();
    }

    async function loadChannels() {
      const res = await req('/channels');
      const tbody = document.getElementById('channels-tbody');
      let html = \`
        <tr class="table-info">
          <td><strong>Cloudflare Workers AI (内置)</strong></td>
          <td><span class="badge bg-primary">CLAUDE & OPENAI 兼容</span></td>
          <td><span class="badge bg-success">CF 原生边缘计算</span></td>
          <td><code>免 API Key (边缘直连)</code></td>
          <td><span class="badge bg-success">默认启用</span></td>
        </tr>
      \`;

      if (res && res.length > 0) {
        html += res.map(c => \`
          <tr>
            <td>\${c.name}</td>
            <td><span class="badge bg-secondary">\${c.type.toUpperCase()}</span></td>
            <td>外部代理</td>
            <td>\${c.baseUrl || '(官方端点)'}</td>
            <td>
              <button class="btn btn-outline-danger btn-sm py-0 px-2 d-flex align-items-center gap-1" title="删除渠道 (需验证密码)" onclick="promptDeleteChannel('\${c.id}', '\${c.name}')">
                <i class="bi bi-trash"></i> 删除
              </button>
            </td>
          </tr>
        \`).join('');
      }
      tbody.innerHTML = html;
    }

    function openCreateChannelModal() {
      document.getElementById('chan-name').value = '';
      document.getElementById('chan-base').value = '';
      document.getElementById('chan-key').value = '';
      new bootstrap.Modal(document.getElementById('channelModal')).show();
    }

    async function saveChannel() {
      const name = document.getElementById('chan-name').value;
      const type = document.getElementById('chan-type').value;
      const baseUrl = document.getElementById('chan-base').value.trim();
      const apiKey = document.getElementById('chan-key').value.trim();
      if (!apiKey) {
        alert('请填入上游 API Key');
        return;
      }
      await req('/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, baseUrl, apiKey })
      });
      bootstrap.Modal.getInstance(document.getElementById('channelModal')).hide();
      loadChannels();
    }

    async function deleteChannel(id) {
      if (!confirm('确定删除此渠道配置吗？')) return;
      await req('/channels?id=' + encodeURIComponent(id), { method: 'DELETE' });
      loadChannels();
    }

    const CF_CATALOG = [
      { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Llama 3.3 70B (Fast)', tag: '免费旗舰' },
      { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 32B (推理)', tag: '免费推理' },
      { id: '@cf/qwen/qwen2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B (编程)', tag: '免费代码' },
      { id: '@cf/qwen/qwq-32b', name: '通义千问 QwQ 32B (推理)', tag: '免费中文' },
      { id: '@cf/meta/llama-3.1-8b-instruct-fp8', name: 'Llama 3.1 8B (轻量)', tag: '免费极速' },
      { id: '@cf/meta/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', tag: '免费超轻' },
      { id: '@cf/meta/llama-3.2-1b-instruct', name: 'Llama 3.2 1B', tag: '免费秒回' }
    ];

    function initModelCatalogUI() {
      const datalist = document.getElementById('model-presets');
      const claudeDropdown = document.getElementById('claude-presets-dropdown');
      const openaiDropdown = document.getElementById('openai-presets-dropdown');
      const quickContainer = document.getElementById('quick-models-container');

      datalist.innerHTML = CF_CATALOG.map(m => \`<option value="\${m.id}">\${m.name}</option>\`).join('');

      claudeDropdown.innerHTML = CF_CATALOG.map(m => \`
        <li><a class="dropdown-item" href="javascript:void(0)" onclick="selectModel('claude', '\${m.id}')">\${m.name} <small class="text-muted">(\${m.tag})</small></a></li>
      \`).join('');

      openaiDropdown.innerHTML = CF_CATALOG.map(m => \`
        <li><a class="dropdown-item" href="javascript:void(0)" onclick="selectModel('openai', '\${m.id}')">\${m.name} <small class="text-muted">(\${m.tag})</small></a></li>
      \`).join('');

      quickContainer.innerHTML = CF_CATALOG.map(m => \`
        <button type="button" class="btn btn-sm d-flex align-items-center gap-2 px-3 py-1 text-light" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;" onclick="applyBothModels('\${m.id}')">
          <span class="small">\${m.name}</span>
          <span class="badge" style="background: rgba(99,102,241,0.3); color: #a5b4fc; border: 1px solid rgba(165,180,252,0.3);">\${m.tag}</span>
        </button>
      \`).join('');
    }

    function selectModel(target, id) {
      if (target === 'claude') document.getElementById('cf-claude-model').value = id;
      if (target === 'openai') document.getElementById('cf-openai-model').value = id;
    }

    function applyBothModels(id) {
      document.getElementById('cf-claude-model').value = id;
      document.getElementById('cf-openai-model').value = id;
    }

    let cachedModels = [];

    async function loadModelsCatalog() {
      const tbody = document.getElementById('models-table-body');
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>加载可用模型列表中...</td></tr>';
      try {
        const res = await fetch('/v1/models');
        const data = await res.json();
        cachedModels = data.data || [];
        renderModelsTable(cachedModels);
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">加载失败: ' + e.message + '</td></tr>';
      }
    }

    function renderModelsTable(list) {
      const tbody = document.getElementById('models-table-body');
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">未找到匹配的模型</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(m => {
        const isCf = m.id.startsWith('@cf/');
        const ownerBadge = isCf 
          ? '<span class="badge bg-success">Cloudflare Workers AI</span>' 
          : '<span class="badge bg-secondary">' + (m.owned_by || 'External') + '</span>';
        const modelName = m.id.split('/').pop();
        return \`
          <tr>
            <td><strong>\${modelName}</strong></td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <code>\${m.id}</code>
                <button class="btn btn-outline-secondary btn-sm py-0 px-1" title="复制模型ID" onclick="copyText('\${m.id}')">
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
            </td>
            <td>\${ownerBadge}</td>
            <td>\${m.description || '通用大语言模型'}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary" onclick="setAsDefault('\${m.id}')">
                设为默认
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function filterModelsTable() {
      const query = (document.getElementById('model-search').value || '').toLowerCase().trim();
      if (!query) {
        renderModelsTable(cachedModels);
        return;
      }
      const filtered = cachedModels.filter(m => 
        m.id.toLowerCase().includes(query) || 
        (m.description && m.description.toLowerCase().includes(query)) ||
        (m.owned_by && m.owned_by.toLowerCase().includes(query))
      );
      renderModelsTable(filtered);
    }

    function copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('已复制模型 ID: ' + text);
      }).catch(() => {
        prompt('请复制模型 ID:', text);
      });
    }

    function setAsDefault(id) {
      applyBothModels(id);
      saveModelMapping();
      // 切换到渠道与模型设置 Tab
      const triggerEl = document.querySelector('button[data-bs-target="#tab-channels"]');
      bootstrap.Tab.getInstance(triggerEl) || new bootstrap.Tab(triggerEl).show();
    }

    async function loadSettings() {
      initModelCatalogUI();
      const mapping = await req('/settings/mapping');
      if (mapping.claudeModel) document.getElementById('cf-claude-model').value = mapping.claudeModel;
      if (mapping.openaiModel) document.getElementById('cf-openai-model').value = mapping.openaiModel;

      // 读取网页访问门禁配置 (登录页总开关)
      try {
        const gateCfg = await req('/settings/login-gate');
        document.getElementById('login-gate-enabled').checked = !!gateCfg.enabled;
      } catch (e) {}

      // 读取邮箱验证登录配置
      try {
        const emailCfg = await req('/settings/email-auth');
        document.getElementById('email-auth-enabled').checked = !!emailCfg.enabled;
        if (emailCfg.email) document.getElementById('email-auth-addr').value = emailCfg.email;
        if (emailCfg.resendKey) document.getElementById('email-resend-key').value = emailCfg.resendKey;
      } catch (e) {}
    }

    async function saveLoginGateConfig() {
      const enabled = document.getElementById('login-gate-enabled').checked;
      await req('/settings/login-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      alert('网页访问门禁设置已生效！' + (enabled ? '已启用登录页，访问网页需进行身份核验。' : '已关闭登录页，全站免登录即可访问控制台。'));
    }

    function toggleEmailAuthUI() {
      // 仅用于即时切换状态提醒
    }

    async function saveEmailAuthConfig() {
      const enabled = document.getElementById('email-auth-enabled').checked;
      const email = (document.getElementById('email-auth-addr').value || '').trim();
      const resendKey = (document.getElementById('email-resend-key').value || '').trim();
      await req('/settings/email-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, email, resendKey })
      });
      alert('邮箱验证登录配置已保存！' + (enabled ? '登录页已启用邮箱验证码登录入口。' : '登录页已恢复仅使用传统密码登录。'));
    }

    async function saveModelMapping() {
      const claudeModel = document.getElementById('cf-claude-model').value.trim();
      const openaiModel = document.getElementById('cf-openai-model').value.trim();
      await req('/settings/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeModel, openaiModel })
      });
      alert('模型映射已保存并即刻生效！');
    }

    async function changeAdminPwd() {
      const pwd = document.getElementById('new-admin-pwd').value;
      if (!pwd) return;
      await req('/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      alert('密码更新成功，请重新登录！');
      logout();
    }

    // 检查访问门禁以及登录方式可用性
    async function checkAccessGate() {
      try {
        const res = await fetch('/admin/api/public-config');
        const cfg = await res.json();
        
        // 若访问门禁未开启 (默认关闭)，直接免登录进入控制台
        if (!cfg.loginGateEnabled) {
          showDashboard();
          return;
        }

        // 若访问门禁开启，已有有效 token 则进入控制台
        if (token) {
          showDashboard();
          return;
        }

        // 门禁开启且无 token，展示登录表单
        const nav = document.getElementById('login-method-nav');
        if (cfg && cfg.emailAuthEnabled) {
          nav.classList.remove('d-none');
          if (cfg.adminEmail) {
            document.getElementById('login-email').value = cfg.adminEmail;
          }
        } else {
          nav.classList.add('d-none');
          switchLoginMethod('pwd');
        }
      } catch (e) {
        // 网络异常或兜底：如果有 token 尝试展示，没有则展示密码登录
        if (token) {
          showDashboard();
        } else {
          document.getElementById('login-method-nav').classList.add('d-none');
          switchLoginMethod('pwd');
        }
      }
    }

    // 兼容原有登出后的登录检查
    function checkLoginMethodAvailability() {
      checkAccessGate();
    }

    // 监听模型库 Tab 切换，自动拉取或刷新可用模型列表
    document.getElementById('tab-btn-models').addEventListener('shown.bs.tab', () => {
      loadModelsCatalog();
    });

    // 页面初始化入口
    checkAccessGate();
  </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // 1. 跨域 OPTIONS 处理
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, anthropic-version",
          },
        });
      }

      // 2. 根路径或 /admin -> 控制台
      if (url.pathname === "/" || url.pathname === "/admin" || url.pathname === "/admin/") {
        return new Response(HTML_DASHBOARD, {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      // 3. 管理后台 API
      if (url.pathname.startsWith("/admin/api/")) {
        return await handleAdminApi(request, env, url);
      }

      // 4. 获取模型列表 /v1/models (仅返回 Cloudflare 免费可用模型，保证 zCode/客户端拉取时不报错)
      if (url.pathname === "/v1/models" || url.pathname === "/models") {
        return jsonResp({
          object: "list",
          data: [
            { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", object: "model", owned_by: "cloudflare", description: "Llama 3.3 70B Fast (免费旗舰推荐)" },
            { id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", object: "model", owned_by: "cloudflare", description: "DeepSeek R1 32B (免费推理大模型)" },
            { id: "@cf/qwen/qwen2.5-coder-32b-instruct", object: "model", owned_by: "cloudflare", description: "Qwen 2.5 Coder 32B (免费代码编程)" },
            { id: "@cf/qwen/qwq-32b", object: "model", owned_by: "cloudflare", description: "通义千问 QwQ 32B (免费中文推理)" },
            { id: "@cf/meta/llama-3.1-8b-instruct-fp8", object: "model", owned_by: "cloudflare", description: "Llama 3.1 8B (免费秒回轻量)" },
            { id: "@cf/meta/llama-3.2-3b-instruct", object: "model", owned_by: "cloudflare", description: "Llama 3.2 3B (免费超轻量)" },
            { id: "@cf/meta/llama-3.2-1b-instruct", object: "model", owned_by: "cloudflare", description: "Llama 3.2 1B (免费极简)" }
          ]
        });
      }

      // 5. 网关代理处理 (Claude Code / OpenAI / ZCode)
      return await handleGateway(request, env, url);
    } catch (e) {
      return jsonResp({ error: { message: "Worker runtime exception: " + e.message, stack: e.stack } }, 500);
    }
  },
};

/**
 * 管理后台 API
 */
async function handleAdminApi(request, env, url) {
  const path = url.pathname.replace("/admin/api", "");

  // 获取公开配置 (判断是否开启访问门禁以及是否开启邮箱验证码登录，访问门禁默认关闭：enabled=false)
  if (path === "/public-config" && request.method === "GET") {
    const rawGate = await env.AI_GATEWAY_KV.get("CONFIG_LOGIN_GATE");
    const gateCfg = rawGate ? JSON.parse(rawGate) : { enabled: false };

    const rawEmail = await env.AI_GATEWAY_KV.get("CONFIG_EMAIL_AUTH");
    const emailCfg = rawEmail ? JSON.parse(rawEmail) : { enabled: false, email: "cf@xvuvx.com" };

    return jsonResp({
      loginGateEnabled: !!gateCfg.enabled,
      emailAuthEnabled: !!emailCfg.enabled,
      adminEmail: emailCfg.email || "cf@xvuvx.com"
    });
  }

  // 发送邮箱动态验证码
  if (path === "/send-email-code" && request.method === "POST") {
    const raw = await env.AI_GATEWAY_KV.get("CONFIG_EMAIL_AUTH");
    const cfg = raw ? JSON.parse(raw) : { enabled: false, email: "cf@xvuvx.com" };
    if (!cfg.enabled) {
      return jsonResp({ error: "邮箱验证码登录功能尚未开启，请在系统设置中启用" }, 403);
    }

    const { email } = await request.json();
    const targetEmail = (email || "").trim().toLowerCase();
    const adminEmail = (cfg.email || "cf@xvuvx.com").trim().toLowerCase();

    if (targetEmail !== adminEmail) {
      return jsonResp({ error: "输入的邮箱非系统设定的安全管理员邮箱" }, 403);
    }

    // 生成 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // 存入 KV，有效期 10 分钟 (600秒)
    await env.AI_GATEWAY_KV.put("EMAIL_CODE:" + targetEmail, code, { expirationTtl: 600 });

    // 尝试通过邮件发送或记录
    let sendSuccess = false;
    let sendErrMsg = "";

    // 1. 如果配置了 Resend API Key，调用 Resend 发送
    if (cfg.resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.resendKey}`
          },
          body: JSON.stringify({
            from: "Edge AI Gateway <onboarding@resend.dev>",
            to: [targetEmail],
            subject: "【Edge AI Gateway】控制台登录验证码",
            html: `<div style="font-family:sans-serif;padding:20px;color:#1e293b;">
              <h2>Edge AI Gateway 管理员身份核验</h2>
              <p>您好，您正在尝试通过邮箱验证登录 Edge AI Gateway 控制台。</p>
              <p>您的动态登录验证码为：</p>
              <div style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#4f46e5;padding:12px;background:#f1f5f9;border-radius:8px;display:inline-block;">${code}</div>
              <p style="color:#64748b;font-size:13px;margin-top:16px;">验证码 10 分钟内有效。如非本人操作，请忽略此邮件并检查凭证安全。</p>
            </div>`
          })
        });
        const data = await res.json();
        if (data.id) {
          sendSuccess = true;
        } else {
          sendErrMsg = data.message || "邮件投递接口返回异常";
        }
      } catch (err) {
        sendErrMsg = err.message;
      }
    }

    // 2. 备用通道 / 开发模式：如果未配第三方发信Key，验证码留存在系统记录中
    if (!sendSuccess) {
      // 记录到 KV 最近日志，便于控制台检索核对
      await env.AI_GATEWAY_KV.put("LAST_EMAIL_CODE_NOTICE", JSON.stringify({
        email: targetEmail,
        code,
        time: new Date().toISOString(),
        note: sendErrMsg ? "Resend投递异常: " + sendErrMsg : "已生成边缘安全验证码"
      }), { expirationTtl: 600 });
    }

    return jsonResp({
      success: true,
      message: sendSuccess 
        ? "动态验证码已成功发往 " + targetEmail + "，请查收！" 
        : "验证码已生成并就绪 (10分钟有效)！如未收到邮件可在 Cloudflare KV 中查收最新凭证。"
    });
  }

  // 邮箱动态验证码登录核验
  if (path === "/login-by-email" && request.method === "POST") {
    const raw = await env.AI_GATEWAY_KV.get("CONFIG_EMAIL_AUTH");
    const cfg = raw ? JSON.parse(raw) : { enabled: false, email: "cf@xvuvx.com" };
    if (!cfg.enabled) {
      return jsonResp({ error: "邮箱验证码登录功能尚未开启" }, 403);
    }

    const { email, code } = await request.json();
    const targetEmail = (email || "").trim().toLowerCase();
    const inputCode = (code || "").trim();

    const storedCode = await env.AI_GATEWAY_KV.get("EMAIL_CODE:" + targetEmail);
    if (storedCode && storedCode === inputCode) {
      // 验证成功后单次立即作废
      await env.AI_GATEWAY_KV.delete("EMAIL_CODE:" + targetEmail);
      const token = "admin_" + crypto.randomUUID().replace(/-/g, "");
      await env.AI_GATEWAY_KV.put("SESSION:" + token, "1", { expirationTtl: 86400 });
      return jsonResp({ token });
    }
    return jsonResp({ error: "验证码错误或已过期，请重新获取" }, 401);
  }

  if (path === "/login" && request.method === "POST") {
    const { password } = await request.json();
    const storedPwd = (await env.AI_GATEWAY_KV.get("ADMIN_PWD")) || env.ADMIN_PASSWORD || "admin";
    if (password === storedPwd) {
      const token = "admin_" + crypto.randomUUID().replace(/-/g, "");
      await env.AI_GATEWAY_KV.put("SESSION:" + token, "1", { expirationTtl: 86400 });
      return jsonResp({ token });
    }
    return jsonResp({ error: "管理员密码错误" }, 401);
  }

  // 二级确认：核验管理员密码
  if (path === "/verify-pwd" && request.method === "POST") {
    const { password } = await request.json();
    const storedPwd = (await env.AI_GATEWAY_KV.get("ADMIN_PWD")) || env.ADMIN_PASSWORD || "admin";
    if (password === storedPwd) {
      return jsonResp({ success: true });
    }
    return jsonResp({ error: "管理员密码错误" }, 403);
  }

  // 访问门禁开关配置读写 (未受 SESSION 阻拦前或在校验前处理，支持获取与设置)
  if (path === "/settings/login-gate" && request.method === "GET") {
    const raw = await env.AI_GATEWAY_KV.get("CONFIG_LOGIN_GATE");
    return jsonResp(raw ? JSON.parse(raw) : { enabled: false });
  }

  // 校验登录状态 (若访问门禁关闭，则允许免登录访问后台常规功能接口；若访问门禁开启，则必须验证 Token)
  const rawGate = await env.AI_GATEWAY_KV.get("CONFIG_LOGIN_GATE");
  const gateCfg = rawGate ? JSON.parse(rawGate) : { enabled: false };
  const loginGateEnabled = !!gateCfg.enabled;

  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  const isValid = token && (await env.AI_GATEWAY_KV.get("SESSION:" + token));

  // 如果门禁开启且 Token 无效，拦截为 401
  if (loginGateEnabled && !isValid) {
    return jsonResp({ error: "未授权或登录已过期" }, 401);
  }

  // 保存访问门禁设置 (若门禁已开启则需有效登录才能改动)
  if (path === "/settings/login-gate" && request.method === "POST") {
    const data = await request.json();
    await env.AI_GATEWAY_KV.put("CONFIG_LOGIN_GATE", JSON.stringify({ enabled: !!data.enabled }));
    return jsonResp({ success: true, enabled: !!data.enabled });
  }

  if (path === "/password" && request.method === "POST") {
    const { password } = await request.json();
    if (!password) return jsonResp({ error: "密码不能为空" }, 400);
    await env.AI_GATEWAY_KV.put("ADMIN_PWD", password);
    return jsonResp({ success: true });
  }

  if (path === "/settings/mapping" && request.method === "GET") {
    const mapStr = await env.AI_GATEWAY_KV.get("MODEL_MAPPING");
    return jsonResp(mapStr ? JSON.parse(mapStr) : {
      claudeModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      openaiModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    });
  }

  if (path === "/settings/mapping" && request.method === "POST") {
    const data = await request.json();
    await env.AI_GATEWAY_KV.put("MODEL_MAPPING", JSON.stringify(data));
    return jsonResp({ success: true });
  }

  // 邮箱登录配置读取与修改
  if (path === "/settings/email-auth" && request.method === "GET") {
    const raw = await env.AI_GATEWAY_KV.get("CONFIG_EMAIL_AUTH");
    return jsonResp(raw ? JSON.parse(raw) : { enabled: false, email: "cf@xvuvx.com", resendKey: "" });
  }

  if (path === "/settings/email-auth" && request.method === "POST") {
    const data = await request.json();
    await env.AI_GATEWAY_KV.put("CONFIG_EMAIL_AUTH", JSON.stringify(data));
    return jsonResp({ success: true });
  }

  if (path === "/keys" && request.method === "GET") {
    const keysJson = (await env.AI_GATEWAY_KV.get("CONFIG_KEYS")) || "[]";
    return jsonResp(JSON.parse(keysJson));
  }

  if (path === "/keys" && request.method === "POST") {
    const { name, quota } = await request.json();
    const newKey = "sk-cf-" + crypto.randomUUID().replace(/-/g, "");
    const keysJson = (await env.AI_GATEWAY_KV.get("CONFIG_KEYS")) || "[]";
    const keys = JSON.parse(keysJson);
    const item = {
      name: name || "默认Key",
      key: newKey,
      quota: quota || 0,
      used: 0,
      enabled: true,
      created: Date.now(),
    };
    keys.push(item);
    await env.AI_GATEWAY_KV.put("CONFIG_KEYS", JSON.stringify(keys));
    await env.AI_GATEWAY_KV.put("KEY:" + newKey, JSON.stringify(item));
    return jsonResp(item);
  }

  if (path === "/keys" && request.method === "DELETE") {
    const keyToDelete = url.searchParams.get("key");
    const keysJson = (await env.AI_GATEWAY_KV.get("CONFIG_KEYS")) || "[]";
    const keys = JSON.parse(keysJson).filter((k) => k.key !== keyToDelete);
    await env.AI_GATEWAY_KV.put("CONFIG_KEYS", JSON.stringify(keys));
    await env.AI_GATEWAY_KV.delete("KEY:" + keyToDelete);
    return jsonResp({ success: true });
  }

  if (path === "/channels" && request.method === "GET") {
    const chansJson = (await env.AI_GATEWAY_KV.get("CONFIG_CHANNELS")) || "[]";
    return jsonResp(JSON.parse(chansJson));
  }

  if (path === "/channels" && request.method === "POST") {
    const { name, type, baseUrl, apiKey } = await request.json();
    const chansJson = (await env.AI_GATEWAY_KV.get("CONFIG_CHANNELS")) || "[]";
    const chans = JSON.parse(chansJson);
    const item = {
      id: crypto.randomUUID(),
      name: name || "自定义渠道",
      type: type || "anthropic",
      baseUrl: baseUrl || "",
      apiKey: apiKey,
    };
    chans.push(item);
    await env.AI_GATEWAY_KV.put("CONFIG_CHANNELS", JSON.stringify(chans));
    return jsonResp({ success: true });
  }

  if (path === "/channels" && request.method === "DELETE") {
    const id = url.searchParams.get("id");
    const chansJson = (await env.AI_GATEWAY_KV.get("CONFIG_CHANNELS")) || "[]";
    const chans = JSON.parse(chansJson).filter((c) => c.id !== id);
    await env.AI_GATEWAY_KV.put("CONFIG_CHANNELS", JSON.stringify(chans));
    return jsonResp({ success: true });
  }

  return jsonResp({ error: "Not Found" }, 404);
}

/**
 * 统一网关鉴权与路由分发
 */
async function handleGateway(request, env, url) {
  // 1. 获取客户端传来的 Token
  let clientKey = request.headers.get("x-api-key") || "";
  if (!clientKey) {
    const auth = request.headers.get("Authorization") || "";
    clientKey = auth.replace("Bearer ", "").trim();
  }

  if (!clientKey) {
    return jsonResp({ error: { message: "缺少 API Key，请设置 Authorization: Bearer <sk-cf-...> 或 x-api-key", type: "invalid_request_error" } }, 401);
  }

  // 2. 校验 Key 是否合法与配额
  const keyInfoStr = await env.AI_GATEWAY_KV.get("KEY:" + clientKey);
  if (!keyInfoStr) {
    return jsonResp({ error: { message: "无效的 API Key", type: "authentication_error" } }, 401);
  }
  const keyInfo = JSON.parse(keyInfoStr);
  if (!keyInfo.enabled) {
    return jsonResp({ error: { message: "该 API Key 已被禁用", type: "permission_error" } }, 403);
  }
  if (keyInfo.quota > 0 && keyInfo.used >= keyInfo.quota) {
    return jsonResp({ error: { message: "该 API Key 额度已用尽", type: "insufficient_quota" } }, 429);
  }

  keyInfo.used = (keyInfo.used || 0) + 1;
  env.AI_GATEWAY_KV.put("KEY:" + clientKey, JSON.stringify(keyInfo));

  // 3. 读取用户自定义外部渠道；若没有，默认直接走 Cloudflare Workers AI 原生边缘计算
  const chansJson = (await env.AI_GATEWAY_KV.get("CONFIG_CHANNELS")) || "[]";
  const chans = JSON.parse(chansJson);

  const isClaude = url.pathname.includes("/v1/messages");
  const externalChannel = chans.find((c) => (isClaude ? c.type === "anthropic" : c.type === "openai"));

  // 如果配置了外部第三方渠道，优先代理到外部渠道
  if (externalChannel && externalChannel.apiKey) {
    return forwardToExternal(request, externalChannel, url);
  }

  // 默认模式：直接使用 Cloudflare Workers AI 原生边缘计算运行
  return runCloudflareEdgeAI(request, env, isClaude);
}

/**
 * 核心：直接调用 Cloudflare 边缘计算 Workers AI
 */
async function runCloudflareEdgeAI(request, env, isClaude) {
  if (!env.AI) {
    return jsonResp({ error: { message: "未检测到 Cloudflare AI 绑定，请检查 wrangler.toml" } }, 500);
  }

  const mapStr = await env.AI_GATEWAY_KV.get("MODEL_MAPPING");
  const mapping = mapStr ? JSON.parse(mapStr) : {
    claudeModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    openaiModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
  };

  const body = await request.json().catch(() => ({}));
  const isStream = body.stream === true;

  // 提取消息列表并适配
  let messages = [];
  if (isClaude) {
    // Anthropic 协议规范转换
    if (body.system) {
      messages.push({ role: "system", content: typeof body.system === "string" ? body.system : JSON.stringify(body.system) });
    }
    if (Array.isArray(body.messages)) {
      for (const m of body.messages) {
        let contentText = "";
        if (typeof m.content === "string") {
          contentText = m.content;
        } else if (Array.isArray(m.content)) {
          contentText = m.content.map(c => c.text || JSON.stringify(c)).join("\n");
        }
        messages.push({ role: m.role, content: contentText });
      }
    }
  } else {
    // OpenAI 格式
    messages = body.messages || [{ role: "user", content: body.prompt || "Hello" }];
  }

  // 允许客户端请求直接指定 Cloudflare 模型（以 @cf/ 开头），否则使用控制台映射模型
  let chosenModel = body.model;
  if (!chosenModel || !chosenModel.startsWith("@cf/")) {
    chosenModel = isClaude ? mapping.claudeModel : mapping.openaiModel;
  }
  if (!chosenModel) chosenModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

  try {
    if (isStream) {
      // 流式响应处理：必须将 Cloudflare Workers AI 的原始流转译为标准 OpenAI / Anthropic SSE 格式
      const aiStream = await env.AI.run(chosenModel, {
        messages: messages,
        stream: true,
      });

      const chatId = "chatcmpl-" + crypto.randomUUID().replace(/-/g, "");
      const msgId = "msg_" + crypto.randomUUID().replace(/-/g, "");
      const created = Math.floor(Date.now() / 1000);

      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();

      let buffer = "";

      const transformStream = new TransformStream({
        start(controller) {
          if (isClaude) {
            // Anthropic SSE 消息开始事件
            const startPayload = JSON.stringify({
              type: "message_start",
              message: { id: msgId, type: "message", role: "assistant", content: [], model: chosenModel, usage: { input_tokens: 10, output_tokens: 1 } }
            });
            const blockPayload = JSON.stringify({
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" }
            });
            controller.enqueue(textEncoder.encode("event: message_start\ndata: " + startPayload + "\n\n"));
            controller.enqueue(textEncoder.encode("event: content_block_start\ndata: " + blockPayload + "\n\n"));
          }
        },
        transform(chunk, controller) {
          buffer += textDecoder.decode(chunk, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // 保留未完成的一行

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              const textContent = parsed.response || "";

              if (isClaude) {
                // Anthropic SSE 格式
                const deltaPayload = JSON.stringify({
                  type: "content_block_delta",
                  index: 0,
                  delta: { type: "text_delta", text: textContent }
                });
                controller.enqueue(textEncoder.encode("event: content_block_delta\ndata: " + deltaPayload + "\n\n"));
              } else {
                // 标准 OpenAI SSE 格式 (zCode 严格校验的 choices 数组格式)
                const chunkPayload = JSON.stringify({
                  id: chatId,
                  object: "chat.completion.chunk",
                  created: created,
                  model: chosenModel,
                  choices: [
                    {
                      index: 0,
                      delta: { content: textContent },
                      finish_reason: null
                    }
                  ]
                });
                controller.enqueue(textEncoder.encode("data: " + chunkPayload + "\n\n"));
              }
            } catch (err) {
              // 忽略解析失败的非 JSON 帧
            }
          }
        },
        flush(controller) {
          if (isClaude) {
            // Anthropic 结束帧
            const stopBlock = JSON.stringify({ type: "content_block_stop", index: 0 });
            const deltaMsg = JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 20 } });
            const stopMsg = JSON.stringify({ type: "message_stop" });
            controller.enqueue(textEncoder.encode("event: content_block_stop\ndata: " + stopBlock + "\n\n"));
            controller.enqueue(textEncoder.encode("event: message_delta\ndata: " + deltaMsg + "\n\n"));
            controller.enqueue(textEncoder.encode("event: message_stop\ndata: " + stopMsg + "\n\n"));
          } else {
            // OpenAI 结束帧
            const endChunk = JSON.stringify({
              id: chatId,
              object: "chat.completion.chunk",
              created: created,
              model: chosenModel,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: "stop"
                }
              ]
            });
            controller.enqueue(textEncoder.encode("data: " + endChunk + "\n\ndata: [DONE]\n\n"));
          }
        }
      });

      return new Response(aiStream.pipeThrough(transformStream), {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 非流式响应
    const aiResp = await env.AI.run(chosenModel, {
      messages: messages,
    });

    const replyText = aiResp.response || "";

    if (isClaude) {
      // 封装为 Anthropic /v1/messages 格式
      return jsonResp({
        id: "msg_" + crypto.randomUUID().replace(/-/g, ""),
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: replyText }],
        model: chosenModel,
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 }
      });
    } else {
      // 封装为 OpenAI /v1/chat/completions 格式
      return jsonResp({
        id: "chatcmpl-" + crypto.randomUUID().replace(/-/g, ""),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: chosenModel,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: replyText },
            finish_reason: "stop"
          }
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      });
    }
  } catch (err) {
    return jsonResp({
      error: {
        message: "Cloudflare 边缘 AI 执行失败: " + err.message,
        type: "edge_ai_error"
      }
    }, 500);
  }
}

/**
 * 代理转发到外部第三方渠道（若用户手动添加了外部 Key）
 */
async function forwardToExternal(request, targetChannel, url) {
  let upstreamBase = targetChannel.baseUrl;
  if (!upstreamBase) {
    upstreamBase = targetChannel.type === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com";
  }
  upstreamBase = upstreamBase.replace(/\/+$/, "");

  const upstreamUrl = new URL(url.pathname + url.search, upstreamBase);
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete("host");

  if (targetChannel.type === "anthropic") {
    forwardHeaders.set("x-api-key", targetChannel.apiKey);
    if (!forwardHeaders.has("anthropic-version")) {
      forwardHeaders.set("anthropic-version", "2023-06-01");
    }
  } else {
    forwardHeaders.set("Authorization", "Bearer " + targetChannel.apiKey);
  }

  const upstreamResp = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers: forwardHeaders,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "follow",
  });

  const respHeaders = new Headers(upstreamResp.headers);
  respHeaders.set("Access-Control-Allow-Origin", "*");
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: respHeaders,
  });
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
