# 📖 Complete Setup Guide

## Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [API Keys Setup](#api-keys-setup)
4. [Domain Configuration](#domain-configuration)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

---

## Installation

```bash
git clone https://github.com/yourusername/hattay-ai-model.git
cd hattay-ai-model
```

---

## Configuration

### 1. Create your .env file

```bash
cp .env.example .env
```

### 2. Edit the .env file

Open `.env` in your text editor and configure the following sections:

#### Domain Configuration
For **local development**:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
STAGING_DOMAIN=localhost
```

For **production**:
```env
NEXT_PUBLIC_BASE_URL=https://app.yourdomain.com
STAGING_DOMAIN=staging.yourdomain.com
```

---

## API Keys Setup

### Where to Get API Keys

#### 1. OpenAI (GPT-4o) - **Required**
- Visit: https://platform.openai.com/api-keys
- Click "Create new secret key"
- Copy the key starting with `sk-...`
- Cost: ~$0.03 per 1k tokens

#### 2. Anthropic (Claude 3.5 Sonnet) - **Required**
- Visit: https://console.anthropic.com/
- Create account and navigate to API Keys
- Generate new key starting with `sk-ant-...`
- Cost: ~$0.003 per 1k tokens

#### 3. xAI (Grok) - **Optional**
- Visit: https://x.ai/api
- Sign up and create API key
- Copy key starting with `xai-...`
- Cost: ~$0.002 per 1k tokens

#### 4. Groq (Llama 3.1 405B) - **Optional**
- Visit: https://console.groq.com/
- Create API key
- Copy key starting with `gsk-...`
- Cost: ~$0.0005 per 1k tokens

#### 5. DeepSeek (DeepSeek Coder V3) - **Optional**
- Visit: https://platform.deepseek.com/
- Register and generate API key
- Copy key starting with `ds-...`
- Cost: Free tier available

#### 6. Google (Gemini 1.5 Pro) - **Optional**
- Visit: https://aistudio.google.com/app/apikey
- Create API key
- Copy key starting with `AIzaSy...`
- Cost: ~$0.002 per 1k tokens

#### 7. Mistral (Mistral Large 2) - **Optional**
- Visit: https://console.mistral.ai/
- Generate API key
- Copy key starting with `mistral-...`
- Cost: ~$0.001 per 1k tokens

### Add Keys to .env

```env
OPENAI_API_KEY=sk-your-actual-key-here
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
XAI_API_KEY=xai-your-actual-key-here
GROQ_API_KEY=gsk-your-actual-key-here
DEEPSEEK_API_KEY=ds-your-actual-key-here
GEMINI_API_KEY=AIzaSy-your-actual-key-here
MISTRAL_API_KEY=mistral-your-actual-key-here
```

**Note**: You don't need ALL keys. The system will work with just 2-3 models. More models = better results but higher cost.

---

## Domain Configuration

### For Local Development

No domain setup needed! Just use:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
STAGING_DOMAIN=localhost
```

### For Production with Custom Domain

#### Step 1: Point Your Domain to Your Server

In your domain registrar (Cloudflare, Namecheap, etc.), add these DNS records:

```
Type    Name        Value               TTL
A       app         YOUR_SERVER_IP      Auto
A       *.staging   YOUR_SERVER_IP      Auto
```

#### Step 2: Update .env

```env
NEXT_PUBLIC_BASE_URL=https://app.yourdomain.com
STAGING_DOMAIN=staging.yourdomain.com
```

#### Step 3: SSL Certificates (Optional for HTTPS)

Install Certbot in your nginx container:
```bash
docker exec -it hatty-ai-model-nginx sh
apk add certbot certbot-nginx
certbot --nginx -d app.yourdomain.com -d "*.staging.yourdomain.com"
```

---

## Running the Application

### Development Mode

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### First-Time Setup

After starting for the first time, initialize the database:

```bash
# Enter the API container
docker exec -it hatty-ai-model-api sh

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Exit container
exit
```

### Access Your Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **Database**: localhost:3306

---

## Troubleshooting

### Issue: "Cannot connect to MySQL"

**Solution**: Wait 30 seconds for MySQL to fully initialize on first run.

```bash
# Check MySQL logs
docker compose logs mysql

# Restart services
docker compose restart
```

### Issue: "API Keys not working"

**Solution**:
1. Verify keys in `.env` have no extra spaces
2. Check API provider's dashboard for valid keys
3. Ensure you have credits/billing enabled

```bash
# Restart API to reload environment
docker compose restart api
```

### Issue: "Staging previews not working"

**Solution**:
1. Ensure staging directory exists and has permissions:
```bash
mkdir -p ./staging
chmod 755 ./staging
```

2. Check Nginx configuration:
```bash
docker compose logs nginx
```

### Issue: "Models not generating code"

**Solutions**:
1. Check API logs:
```bash
docker compose logs api
```

2. Verify API keys are valid and have sufficient credits

3. Try with just 2 models first (OpenAI + Claude)

### Issue: "Port already in use"

**Solution**: Change ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:3001"  # Change left number to available port
```

---

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d

# Run any new migrations
docker exec -it hatty-ai-model-api npx prisma migrate deploy
```

---

## Monitoring Costs

Average costs per generation (using all 7 models):
- **Simple UI**: $0.05 - $0.08
- **Complex App**: $0.10 - $0.15
- **Full-Stack SaaS**: $0.20 - $0.30

### Reduce Costs

Edit `apps/api/src/orchestrator/multi-llm-graph.ts` and comment out models you don't want to use:

```typescript
// .addEdge("supervisor", "deepseek")  // Disable DeepSeek
// .addEdge("deepseek", "evaluate")
```

---

## Need Help?

- Check the logs: `docker compose logs -f`
- Open an issue on GitHub
- Review the [LangGraph documentation](https://langchain-ai.github.io/langgraphjs/)

---

**Next Steps**: Return to [README.md](./README.md) for usage examples