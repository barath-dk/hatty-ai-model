import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { MultiLLMOrchestrator } from './orchestrator/multi-llm-graph';
import { PreviewDeployment } from './services/preview-deployment';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();
const orchestrator = new MultiLLMOrchestrator();
const previewDeployment = new PreviewDeployment();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================
// PROJECT ENDPOINTS
// =====================

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    res.json(projects);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
      }
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Database error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Project name already exists' });
    }
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get single project with messages
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
      }
    });

    res.json(project);
  } catch (error: any) {
    console.error('Database error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project (cascades to messages)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// =====================
// CHAT MESSAGE ENDPOINTS
// =====================

// Get messages for a project
app.get('/api/projects/:projectId/messages', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 100 } = req.query;

    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit as string),
    });

    res.json(messages);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create a chat message
app.post('/api/projects/:projectId/messages', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role, content, code, previewUrl, models, bestModel, score } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId,
        role,
        content,
        code: code || null,
        previewUrl: previewUrl || null,
        models: models ? JSON.stringify(models) : null,
        bestModel: bestModel || null,
        score: score || null,
      }
    });

    // Update project's updatedAt timestamp
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Delete a single message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.chatMessage.delete({
      where: { id }
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Clear all messages for a project
app.delete('/api/projects/:projectId/messages', async (req, res) => {
  try {
    const { projectId } = req.params;

    await prisma.chatMessage.deleteMany({
      where: { projectId }
    });

    res.json({ message: 'All messages cleared successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

// =====================
// AI GENERATION ENDPOINTS
// =====================

// Generate code with multi-LLM orchestration
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, projectId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`Starting multi-LLM orchestration for: ${prompt.slice(0, 100)}...`);

    // Generate code using all 7 models
    const result = await orchestrator.generate(prompt);

    // Deploy to staging if code was generated
    let previewUrl = null;
    if (result.code) {
      const deploymentId = uuidv4().slice(0, 8);
      previewUrl = await previewDeployment.deploy(result.code, deploymentId);

      // Save generation to database
      await prisma.generation.create({
        data: {
          projectId: projectId || null,
          prompt,
          code: result.code,
          bestModel: result.model,
          score: result.score,
          previewUrl,
          models: JSON.stringify(result.models),
        }
      });

      // If projectId provided, save as chat messages
      if (projectId) {
        // Save user message
        await prisma.chatMessage.create({
          data: {
            projectId,
            role: 'user',
            content: prompt,
          }
        });

        // Save assistant message
        await prisma.chatMessage.create({
          data: {
            projectId,
            role: 'assistant',
            content: `Generated using ${result.models?.length || 7} AI models in parallel. **${result.model}** won with score ${result.score}/10.`,
            code: result.code,
            previewUrl,
            models: JSON.stringify(result.models),
            bestModel: result.model,
            score: result.score,
          }
        });

        // Update project timestamp
        await prisma.project.update({
          where: { id: projectId },
          data: { updatedAt: new Date() }
        });
      }
    }

    res.json({
      ...result,
      previewUrl,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: 'Generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get generation history
app.get('/api/generations', async (req, res) => {
  try {
    const { projectId, limit = 20 } = req.query;

    const generations = await prisma.generation.findMany({
      where: projectId ? { projectId: projectId as string } : {},
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(generations);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch generations' });
  }
});

// Model status and health check
app.get('/api/models/status', async (req, res) => {
  const models = [
    { name: 'OpenAI GPT-4o', status: 'active', cost: '$0.03/1k tokens' },
    { name: 'Claude 3.5 Sonnet', status: 'active', cost: '$0.003/1k tokens' },
    { name: 'Grok', status: 'active', cost: '$0.002/1k tokens' },
    { name: 'Llama-3.1-405B', status: 'active', cost: '$0.0005/1k tokens' },
    { name: 'DeepSeek-Coder-V3', status: 'active', cost: 'Free tier' },
    { name: 'Gemini-1.5-Pro', status: 'active', cost: '$0.002/1k tokens' },
    { name: 'Mistral-Large-2', status: 'active', cost: '$0.001/1k tokens' },
  ];

  res.json({ models, totalActive: models.length });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Hatty AI Model API running on port ${port}`);
  console.log(`📊 Multi-LLM orchestration active with 7 models`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;