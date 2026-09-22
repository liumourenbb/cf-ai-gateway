# Edge AI Gateway (Serverless AI Key 管理控制台与智能网关)

基于 **Cloudflare Workers + Workers KV + Workers AI** 构建的纯边缘 Serverless 多合一 AI 密钥管理平台与智能多协议网关。

支持直接利用 **Cloudflare 原生边缘算力 (免外部 API Key)**，或代理转发至 Anthropic、OpenAI 官方端点，统一分发管理可控的 API Key，无缝适配 **Claude Code CLI**、**OpenAI CLI**、**ZCode** 等主流工具。

---

## ✨ 核心特性

- 🚀 **100% Serverless 纯边缘架构**：无需购买/维护服务器或 Docker，直接部署在 Cloudflare 全球 300+ 边缘数据中心。
- ⚡ **原生 Workers AI 接入**：默认直接调用 Cloudflare 边缘计算模型（如 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`、`@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`），**无需充值或配置任何第三方 API Key**。
- 🔄 **双协议实时自动转译**：
  - **Anthropic 协议 (`/v1/messages`)**：原生兼容 **Claude Code CLI**。
  - **OpenAI 兼容协议 (`/v1/chat/completions`, `/v1/models`)**：兼容 **OpenAI CLI**、**ZCode**、Chatbox 等工具。
- 🖥️ **内置 Web 管理控制台**：
  - 密码认证防护。
  - 密钥生命周期管理：生成、启用/禁用、调用额度配额、实时用量统计。
  - 模型动态映射：在控制台自由切换 Claude 与 OpenAI 映射的边缘大模型。
  - 外部渠道聚合：可选配置真实的 Anthropic/OpenAI 上游渠道。

---

## 🛠️ 快速开始与部署

### 1. 安装依赖与配置
```bash
git clone https://github.com/liumourenbb/cf-ai-gateway.git
cd cf-ai-gateway
npm install
```

### 2. 创建 Workers KV
```bash
npx wrangler kv namespace create AI_GATEWAY_KV
```
将输出的 KV `id` 填写到 `wrangler.toml` 中的 `[[kv_namespaces]]` 对应位置。

### 3. 一键部署到 Cloudflare
```bash
npx wrangler deploy
```

---

## 💻 客户端接入指引

### 1. Claude Code CLI
```bash
export ANTHROPIC_BASE_URL="https://your-domain.com"
export ANTHROPIC_API_KEY="sk-cf-xxxxxxxx"

claude
```

### 2. OpenAI CLI
```bash
export OPENAI_BASE_URL="https://your-domain.com/v1"
export OPENAI_API_KEY="sk-cf-xxxxxxxx"
```

### 3. ZCode CLI
在设置中配置：
- **Base URL / Endpoint**: `https://your-domain.com/v1`
- **API Key**: `sk-cf-xxxxxxxx`
- **Model**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

---

## 📄 开源许可证
MIT License
