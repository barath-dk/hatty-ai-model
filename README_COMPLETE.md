# 🚀 Hatty AI Model - Self-Hosted Multi-LLM AI App Builder

> **AI-powered app builder running on your infrastructure with unlimited projects and zero monthly fees**

Build production-ready apps using **7 AI models in parallel**. The system automatically evaluates and picks the best code from:
- **OpenAI GPT-4o** - Speed & reliability
- **Claude 3.5 Sonnet** - Beautiful UI/UX
- **Grok** - Creative problem-solving
- **Llama 3.1 405B** - Advanced reasoning
- **DeepSeek Coder V3** - Clean code generation
- **Gemini 1.5 Pro** - Complex logic
- **Mistral Large 2** - Balanced performance

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-LLM Orchestration** | 7 AI models compete in parallel, automatically picking the best output |
| 🎯 **LangGraph.js Powered** | Advanced agent workflows with retry logic and self-correction |
| 🌐 **Wildcard Staging Domains** | Instant preview deployments at `*.staging.yourdomain.com` |
| 🗄️ **MySQL Database** | Complete project and generation history tracking |
| 🎨 **Beautiful UI** | Next.js 15 + Tailwind CSS + shadcn/ui components |
| 🐳 **One-Command Deploy** | Complete Docker Compose stack |
| 💰 **Zero Monthly Fees** | You only pay for AI API tokens you actually use |
| 🔒 **Self-Hosted** | 100% control over your data and infrastructure |

---

## 📋 Prerequisites

- **Docker** & **Docker Compose** installed
- **Domain name** (for production) or **localhost** (for development)
- **API Keys** from at least 2 providers (minimum: OpenAI + Claude recommended)

---

## 🚀 Quick Start (5 Minutes)

### 1. Clone and Configure

```bash
git clone https://github.com/yourusername/hattay-ai-model.git
cd hattay-ai-model
cp .env.example .env
```

### 2. Add Your API Keys

Edit `.env` and add at minimum:
```env
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get keys from:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

### 3. Start the Stack

```bash
docker compose up -d
```

### 4. Initialize Database

```bash
docker exec -it hatty-ai-model-api npx prisma migrate deploy
```

### 5. Open Your App

Visit: **http://localhost:3000**

---

## 💡 Usage Examples

### Example 1: Build a Landing Page

**Prompt**:
```
Build a modern SaaS landing page with:
- Hero section with gradient background
- Feature cards with icons
- Pricing table with 3 tiers
- Dark mode toggle
- Responsive design
```

**Result**:
- 7 models generate code in parallel (~6 seconds)
- System evaluates and picks best output
- Instant preview at `app-abc123.staging.localhost`

### Example 2: Create a Dashboard

**Prompt**:
```
Create a analytics dashboard with:
- Sidebar navigation
- Chart.js line and bar charts
- Data table with sorting
- Dark theme
- Tailwind CSS
```

**Result**: Production-ready dashboard with all features working

### Example 3: Build an E-commerce Page

**Prompt**:
```
Build a product listing page with:
- Grid of products with images
- Filter by category
- Shopping cart functionality
- Add to cart animations
- Mobile responsive
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Chat UI    │  │  Preview     │  │   Projects      │   │
│  │  Interface  │  │  Pane        │  │   Sidebar       │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────┴──────────────────────────────────┐
│                    API (Express + LangGraph)                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           SUPERVISOR NODE (Analyzes Request)          │ │
│  └──────────────────┬────────────────────────────────────┘ │
│                     │ Parallel Execution                   │
│    ┌────────┬───────┼───────┬────────┬─────────┬─────────┐ │
│    │ OpenAI │ Claude│ Grok  │ Llama  │DeepSeek │ Gemini  │ │
│    │        │       │       │        │         │         │ │
│    └────────┴───────┴───────┴────────┴─────────┴─────────┘ │
│                     │ Results                              │
│    ┌────────────────┴──────────────────────────────────┐  │
│    │  EVALUATOR NODE (Claude scores all outputs)       │  │
│    └────────────────┬──────────────────────────────────┘  │
│                     │ Best Code                           │
│    ┌────────────────┴──────────────────────────────────┐  │
│    │  DEPLOYMENT SERVICE (Creates preview)             │  │
│    └───────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                  STORAGE & SERVING                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   MySQL DB   │  │  Nginx (Proxy)   │  │  Staging Dir  │ │
│  │  (History)   │  │  (Wildcards)     │  │  (Previews)   │ │
│  └──────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
hattay-ai-model/
├── apps/
│   ├── frontend/                 # Next.js frontend
│   │   ├── app/
│   │   │   ├── api/             # API route handlers (proxy)
│   │   │   ├── page.tsx         # Main app page
│   │   │   ├── layout.tsx       # Root layout
│   │   │   └── globals.css      # Global styles
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── chat-interface.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── preview-pane.tsx
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                      # Express backend
│       ├── src/
│       │   ├── orchestrator/
│       │   │   ├── multi-llm-graph.ts      # Main orchestration
│       │   │   ├── grok-chat.ts            # Grok integration
│       │   │   ├── deepseek-chat.ts        # DeepSeek integration
│       │   │   └── llama-groq-chat.ts      # Llama integration
│       │   ├── services/
│       │   │   └── preview-deployment.ts   # Deployment logic
│       │   └── index.ts                    # Express server
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/
│   └── schema.prisma            # Database schema
│
├── nginx/
│   └── nginx.conf               # Nginx configuration
│
├── staging/                     # Preview deployments folder
│
├── docker-compose.yml           # Docker services
├── .env.example                 # Environment template
├── README.md                    # This file
└── SETUP.md                     # Detailed setup guide
```

---

## 🔧 Configuration

### Environment Variables

See `.env.example` for all configuration options.

**Critical Settings**:
- `OPENAI_API_KEY` - OpenAI API key (required)
- `ANTHROPIC_API_KEY` - Claude API key (required)
- `DATABASE_URL` - MySQL connection string
- `STAGING_DOMAIN` - Domain for preview deployments

**Optional Keys** (for additional models):
- `XAI_API_KEY` - Grok
- `GROQ_API_KEY` - Llama 405B
- `DEEPSEEK_API_KEY` - DeepSeek Coder
- `GEMINI_API_KEY` - Google Gemini
- `MISTRAL_API_KEY` - Mistral Large

---

## 💰 Cost Estimation

### Per Generation Cost (using all 7 models):
- **Simple UI Component**: $0.05 - $0.08
- **Full Page with Multiple Sections**: $0.10 - $0.15
- **Complex Full-Stack App**: $0.20 - $0.30

### Monthly Cost Examples:
- **10 generations/day**: ~$30-45/month
- **50 generations/day**: ~$150-225/month
- **100 generations/day**: ~$300-450/month

**Tip**: Use only 2-3 models (OpenAI + Claude + Llama) to reduce costs by 60% while maintaining quality.

---

## 🛠️ How It Works

### The Orchestration Flow

1. **User submits prompt** → Frontend sends to API

2. **Supervisor analyzes** → Determines requirements, framework, complexity

3. **Parallel generation** → All 7 models generate code simultaneously (~6 seconds)

4. **Evaluation** → Claude Sonnet scores each submission on:
   - Code quality (30%)
   - Functionality (25%)
   - UI/UX design (20%)
   - Performance (15%)
   - Innovation (10%)

5. **Winner selection** → Best code automatically chosen

6. **Deployment** → Code deployed to staging URL

7. **Response** → User gets code + live preview link

### Auto-Retry Logic

If best score < 8.5/10 → Automatically retry with refined prompt (max 2 attempts)

---

## 🚢 Deployment

### Local Development

Already covered in [Quick Start](#-quick-start-5-minutes)

### Production Deployment

#### Option 1: VPS (DigitalOcean, Linode, AWS EC2)

1. Get a server with Docker installed
2. Clone repository
3. Configure `.env` with your domain
4. Point DNS to server IP
5. Run `docker compose up -d`

#### Option 2: Railway / Render

Use `docker-compose.yml` to deploy multi-container app

#### Option 3: Kubernetes

Convert `docker-compose.yml` using Kompose:
```bash
kompose convert
kubectl apply -f .
```

---

## 📊 Monitoring

### Check System Status

```bash
# All services status
docker compose ps

# View logs
docker compose logs -f

# API health
curl http://localhost:3001/health

# Model status
curl http://localhost:3001/api/models/status
```

### Database Management

```bash
# Access Prisma Studio
docker exec -it hatty-ai-model-api npx prisma studio

# Run migrations
docker exec -it hatty-ai-model-api npx prisma migrate deploy

# View database directly
docker exec -it hatty-ai-model-mysql mysql -u hatty -p hatty
```

---

## 🔐 Security Best Practices

1. **Change default passwords** in `.env`
2. **Use strong JWT_SECRET** (min 32 characters)
3. **Enable SSL/TLS** with Certbot
4. **Rate limit API** (already configured in Nginx)
5. **Restrict database access** (only from API container)
6. **Keep API keys secure** (never commit `.env`)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

Built with:
- [LangChain / LangGraph](https://github.com/langchain-ai/langgraphjs)
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

Built for developers who want complete control over their AI tooling

---

## 📚 Additional Resources

- **[Detailed Setup Guide](./SETUP.md)** - Complete configuration instructions
- **[LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)**
- **[Next.js Documentation](https://nextjs.org/docs)**
- **[Prisma Documentation](https://www.prisma.io/docs)**

---

## 💬 Support

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions or share your builds
- **Discord**: [Join our community](#) (coming soon)

---

## ⭐ Star History

If you find this project useful, please give it a star! ⭐

---

**Built with ❤️ by the community**

Made possible by the amazing AI models from OpenAI, Anthropic, xAI, Meta, DeepSeek, Google, and Mistral.