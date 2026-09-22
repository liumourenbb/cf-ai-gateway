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
    body { background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .navbar { background: #0f172a; }
    .card { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .badge-protocol { font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; }
    .code-box { background: #1e293b; color: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; word-break: break-all; }
  </style>
</head>
<body>
  <nav class="navbar navbar-dark px-4 py-3">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1 d-flex align-items-center gap-2">
        <i class="bi bi-cpu-fill text-warning"></i> Edge AI Gateway 控制台
      </span>
      <div id="nav-user" class="d-none text-light align-items-center gap-3">
        <span class="badge bg-success">管理员在线</span>
        <button class="btn btn-sm btn-outline-light" onclick="logout()">退出登录</button>
      </div>
    </div>
  </nav>

  <div class="container py-4">
    <!-- 登录模块 -->
    <div id="login-section" class="row justify-content-center py-5">
      <div class="col-md-5">
        <div class="card p-4">
          <h4 class="card-title text-center mb-4">管理员登录</h4>
          <div class="mb-3">
            <label class="form-label">管理员密码</label>
            <input type="password" id="admin-pwd" class="form-control" placeholder="默认密码: admin">
          </div>
          <button class="btn btn-primary w-100" onclick="login()">登录</button>
          <div id="login-err" class="text-danger small mt-2 text-center d-none"></div>
        </div>
      </div>
    </div>

    <!-- 主控面板 -->
    <div id="main-section" class="d-none">
      <div class="alert alert-info d-flex align-items-center mb-4">
        <i class="bi bi-check-circle-fill fs-4 me-3 text-info"></i>
        <div>
          <strong>Cloudflare Workers AI 边缘原生计算已接入！</strong> 
          当前系统默认直接调用 CF 边缘计算核心模型（如 <code>@cf/meta/llama-3.3-70b-instruct</code>、<code>@cf/meta/llama-3.1-8b-instruct</code>），无需购买或配置第三方 API Key。
        </div>
      </div>

      <ul class="nav nav-pills mb-4" id="pills-tab" role="tablist">
        <li class="nav-item">
          <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-keys" type="button"><i class="bi bi-key-fill"></i> 分发令牌 (API Keys)</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-channels" type="button"><i class="bi bi-hdd-network-fill"></i> 渠道与模型设置</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-guide" type="button"><i class="bi bi-terminal-fill"></i> CLI 接入指引</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-settings" type="button"><i class="bi bi-gear-fill"></i> 系统设置</button>
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

          <div class="card p-3">
            <h6 class="fw-bold mb-2"><i class="bi bi-cpu"></i> 默认 Cloudflare Workers AI 模型映射</h6>
            <div class="row g-2 align-items-center">
              <div class="col-md-5">
                <label class="form-label small text-muted">Claude Code 映射的 CF 边缘模型：</label>
                <input type="text" id="cf-claude-model" class="form-control form-control-sm" value="@cf/meta/llama-3.3-70b-instruct-fp8-fast">
              </div>
              <div class="col-md-5">
                <label class="form-label small text-muted">OpenAI / ZCode 映射的 CF 边缘模型：</label>
                <input type="text" id="cf-openai-model" class="form-control form-control-sm" value="@cf/meta/llama-3.3-70b-instruct-fp8-fast">
              </div>
              <div class="col-md-2 mt-4">
                <button class="btn btn-sm btn-outline-primary w-100" onclick="saveModelMapping()">保存映射</button>
              </div>
            </div>
            <small class="text-muted mt-2">支持模型：<code>@cf/meta/llama-3.3-70b-instruct</code>, <code>@cf/meta/llama-3.1-8b-instruct</code>, <code>@cf/deepseek-ai/deepseek-r1-distill-qwen-32b</code>, <code>@cf/qwen/qwen1.5-14b-chat-awq</code> 等。</small>
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
          <div class="card p-4 col-md-6">
            <h6 class="fw-bold mb-3">修改管理员密码</h6>
            <div class="mb-3">
              <label class="form-label">新密码</label>
              <input type="password" id="new-admin-pwd" class="form-control">
            </div>
            <button class="btn btn-outline-primary" onclick="changeAdminPwd()">更新密码</button>
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
          <td><code>\${k.key}</code></td>
          <td>\${k.used || 0} / \${k.quota === 0 ? '无限制' : k.quota}</td>
          <td><span class="badge \${k.enabled ? 'bg-success' : 'bg-secondary'}">\${k.enabled ? '有效' : '禁用'}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteKey('\${k.key}')">删除</button>
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

    async function deleteKey(key) {
      if (!confirm('确定删除此 Key 吗？客户端将立刻无法使用。')) return;
      await req('/keys?key=' + encodeURIComponent(key), { method: 'DELETE' });
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
              <button class="btn btn-sm btn-outline-danger" onclick="deleteChannel('\${c.id}')">删除</button>
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

    async function loadSettings() {
      const mapping = await req('/settings/mapping');
      if (mapping.claudeModel) document.getElementById('cf-claude-model').value = mapping.claudeModel;
      if (mapping.openaiModel) document.getElementById('cf-openai-model').value = mapping.openaiModel;
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

    if (token) {
      showDashboard();
    }
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

      // 4. 获取模型列表 /v1/models (适配 OpenAI CLI / 常见工具探活)
      if (url.pathname === "/v1/models" || url.pathname === "/models") {
        return jsonResp({
          object: "list",
          data: [
            { id: "@cf/meta/llama-3.3-70b-instruct", object: "model", owned_by: "cloudflare" },
            { id: "@cf/meta/llama-3.1-8b-instruct", object: "model", owned_by: "cloudflare" },
            { id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", object: "model", owned_by: "cloudflare" },
            { id: "@cf/qwen/qwen1.5-14b-chat-awq", object: "model", owned_by: "cloudflare" },
            { id: "claude-3-7-sonnet-20250219", object: "model", owned_by: "anthropic" },
            { id: "gpt-4o", object: "model", owned_by: "openai" }
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

  // 校验登录状态
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  const isValid = token && (await env.AI_GATEWAY_KV.get("SESSION:" + token));
  if (!isValid) {
    return jsonResp({ error: "未授权或登录已过期" }, 401);
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

  const chosenModel = (isClaude ? mapping.claudeModel : mapping.openaiModel) || "@cf/meta/llama-3.3-70b-instruct";

  try {
    if (isStream) {
      // 流式响应处理
      const aiStream = await env.AI.run(chosenModel, {
        messages: messages,
        stream: true,
      });

      return new Response(aiStream, {
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
