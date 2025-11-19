'use client'

import { useState, useRef, useEffect } from 'react'
import { Button, Card, Badge, Form, Dropdown } from 'react-bootstrap'
import { Send, Loader2, Zap, Eye, Code, Sparkles, Brain, Copy, Check, Trash2, MoreVertical } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  projectId?: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  previewUrl?: string
  models?: string[]
  bestModel?: string
  score?: number
  createdAt: Date | string
}

interface ChatInterfaceProps {
  currentProject: Project | null
  onPreviewGenerated: (url: string) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function ChatInterface({ currentProject, onPreviewGenerated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [orchestrationStatus, setOrchestrationStatus] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load messages when project changes
  useEffect(() => {
    if (currentProject) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [currentProject?.id])

  const loadMessages = async () => {
    if (!currentProject) return

    try {
      setLoadingMessages(true)
      const response = await axios.get(`${API_URL}/api/projects/${currentProject.id}/messages`)
      const loadedMessages = response.data.map((msg: any) => ({
        ...msg,
        models: msg.models ? JSON.parse(msg.models) : null
      }))
      setMessages(loadedMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
      toast.error('Failed to load chat history')
    } finally {
      setLoadingMessages(false)
    }
  }

  const copyToClipboard = (code: string, messageId: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(messageId)
    toast.success('Code copied to clipboard!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const deleteMessage = async (messageId: string) => {
    try {
      await axios.delete(`${API_URL}/api/messages/${messageId}`)
      setMessages(prev => prev.filter(m => m.id !== messageId))
      toast.success('Message deleted')
    } catch (error) {
      console.error('Failed to delete message:', error)
      toast.error('Failed to delete message')
    }
  }

  const clearAllMessages = async () => {
    if (!currentProject) return

    try {
      await axios.delete(`${API_URL}/api/projects/${currentProject.id}/messages`)
      setMessages([])
      toast.success('All messages cleared')
    } catch (error) {
      console.error('Failed to clear messages:', error)
      toast.error('Failed to clear messages')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (!currentProject) {
      toast.error('Please select or create a project first')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setOrchestrationStatus('Initializing multi-LLM orchestration...')

    try {
      const response = await axios.post(`${API_URL}/api/generate`, {
        prompt: input,
        projectId: currentProject.id
      })

      const { code, previewUrl, models, bestModel, score } = response.data

      // Reload messages from DB to get the persisted versions
      await loadMessages()

      if (previewUrl) {
        onPreviewGenerated(previewUrl)
        toast.success(`Preview deployed at ${previewUrl}`)
      }

    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('Failed to generate code. Please check your API keys.')

      // Save error message to DB
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating your code. Please make sure your API keys are configured correctly.',
        createdAt: new Date()
      }

      try {
        await axios.post(`${API_URL}/api/projects/${currentProject.id}/messages`, {
          role: 'assistant',
          content: errorMessage.content
        })
        await loadMessages()
      } catch (saveError) {
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      setOrchestrationStatus('')
    }
  }

  const aiModels = [
    { name: 'OpenAI GPT-4o', color: '#10b981' },
    { name: 'Claude 3.5 Sonnet', color: '#f97316' },
    { name: 'Grok', color: '#3b82f6' },
    { name: 'Llama-405B', color: '#a855f7' },
    { name: 'DeepSeek', color: '#6366f1' },
    { name: 'Gemini Pro', color: '#eab308' },
    { name: 'Mistral Large', color: '#ef4444' }
  ]

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="p-4 glass-dark border-bottom" style={{ borderColor: 'rgba(51, 65, 85, 0.5)' }}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="position-relative">
              <div
                className="position-absolute top-0 start-0 w-100 h-100 rounded opacity-50"
                style={{
                  background: 'linear-gradient(to right, #9333ea, #2563eb)',
                  filter: 'blur(8px)'
                }}
              ></div>
              <div
                className="position-relative p-2 rounded"
                style={{ background: 'linear-gradient(to right, #9333ea, #2563eb)' }}
              >
                <Brain size={20} color="white" />
              </div>
            </div>
            <div>
              <h2 className="fw-semibold text-light h5 mb-1">
                {currentProject ? currentProject.name : 'AI Orchestrator'}
              </h2>
              <Badge
                bg="transparent"
                className="border"
                style={{
                  background: 'linear-gradient(to right, rgba(147, 51, 234, 0.2), rgba(37, 99, 235, 0.2))',
                  borderColor: 'rgba(168, 85, 247, 0.5)',
                  color: '#c4b5fd'
                }}
              >
                <Zap size={12} className="me-1" />
                7 Models Active
              </Badge>
            </div>
          </div>
          {currentProject && messages.length > 0 && (
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm" id="chat-options">
                <MoreVertical size={16} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="bg-dark border-secondary">
                <Dropdown.Item
                  className="text-danger"
                  onClick={clearAllMessages}
                >
                  <Trash2 size={14} className="me-2" />
                  Clear All Messages
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
        {orchestrationStatus && (
          <div className="mt-3 d-flex align-items-center gap-2 small text-secondary glass-dark px-3 py-2 rounded">
            <Loader2 size={12} className="animate-spin text-primary" />
            {orchestrationStatus}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-grow-1 overflow-auto p-4">
        {!currentProject ? (
          <div className="text-center py-5">
            <div className="position-relative d-inline-block mb-4">
              <div
                className="position-absolute top-0 start-0 w-100 h-100 rounded-circle animate-pulse opacity-50"
                style={{
                  background: 'linear-gradient(to right, #2563eb, #9333ea)',
                  filter: 'blur(16px)'
                }}
              ></div>
              <div
                className="position-relative p-4 rounded-circle"
                style={{ background: 'linear-gradient(to right, #2563eb, #9333ea)' }}
              >
                <Sparkles size={48} color="white" />
              </div>
            </div>
            <h3 className="h4 fw-bold text-light mb-3">Select or Create a Project</h3>
            <p className="small text-secondary mx-auto mb-4" style={{ maxWidth: '28rem' }}>
              Create a new project or select an existing one from the sidebar to start building with AI.
            </p>
          </div>
        ) : loadingMessages ? (
          <div className="text-center py-5">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="small text-muted mt-3">Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-5">
            <div className="position-relative d-inline-block mb-4">
              <div
                className="position-absolute top-0 start-0 w-100 h-100 rounded-circle animate-pulse opacity-50"
                style={{
                  background: 'linear-gradient(to right, #2563eb, #9333ea)',
                  filter: 'blur(16px)'
                }}
              ></div>
              <div
                className="position-relative p-4 rounded-circle"
                style={{ background: 'linear-gradient(to right, #2563eb, #9333ea)' }}
              >
                <Sparkles size={48} color="white" />
              </div>
            </div>
            <h3 className="h4 fw-bold text-light mb-3">Start Building with AI</h3>
            <p className="small text-secondary mx-auto mb-4" style={{ maxWidth: '28rem' }}>
              Describe what you want to build and our multi-LLM orchestration will generate the perfect code using the best AI models available.
            </p>
            <div className="d-flex justify-content-center gap-2 flex-wrap mx-auto" style={{ maxWidth: '42rem' }}>
              {aiModels.map((model, idx) => (
                <Badge
                  key={idx}
                  bg="transparent"
                  className="border"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    borderColor: '#334155',
                    color: '#cbd5e1'
                  }}
                >
                  {model.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`d-flex mb-4 ${message.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
              <Card
                className="border-0 position-relative"
                style={{
                  maxWidth: '85%',
                  background: message.role === 'user'
                    ? 'linear-gradient(to right, #2563eb, #9333ea)'
                    : 'rgba(15, 23, 42, 0.5)',
                  backdropFilter: message.role === 'assistant' ? 'blur(4px)' : 'none',
                  borderColor: message.role === 'assistant' ? '#1e293b' : 'transparent',
                  boxShadow: message.role === 'user'
                    ? '0 10px 15px -3px rgba(30, 58, 138, 0.5)'
                    : '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Button
                  variant="link"
                  size="sm"
                  className="position-absolute p-1 text-danger opacity-50"
                  style={{ top: '0.25rem', right: '0.25rem' }}
                  onClick={() => deleteMessage(message.id)}
                  title="Delete message"
                >
                  <Trash2 size={12} />
                </Button>
                <Card.Body className="p-4">
                  <div
                    className="small"
                    style={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.625',
                      color: message.role === 'user' ? 'white' : '#e2e8f0'
                    }}
                  >
                    {message.content}
                  </div>

                  {message.code && (
                    <div className="mt-3">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <Code size={16} color="#94a3b8" />
                          <span className="small fw-medium text-light">Generated Code</span>
                          {message.bestModel && (
                            <Badge
                              bg="transparent"
                              className="border"
                              style={{
                                background: 'linear-gradient(to right, rgba(5, 150, 105, 0.2), rgba(22, 163, 74, 0.2))',
                                borderColor: 'rgba(16, 185, 129, 0.5)',
                                color: '#6ee7b7'
                              }}
                            >
                              {message.bestModel} &bull; {message.score}/10
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => copyToClipboard(message.code!, message.id)}
                          style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                        >
                          {copiedCode === message.id ? (
                            <><Check size={12} className="me-1" /> Copied</>
                          ) : (
                            <><Copy size={12} className="me-1" /> Copy</>
                          )}
                        </Button>
                      </div>
                      <div className="rounded overflow-hidden border" style={{ borderColor: '#334155' }}>
                        <SyntaxHighlighter
                          language="typescript"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            fontSize: '12px',
                            maxHeight: '400px',
                            background: 'rgb(15, 23, 42)'
                          }}
                        >
                          {message.code}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}

                  {message.previewUrl && (
                    <div className="mt-3 pt-3 border-top" style={{ borderColor: '#1e293b' }}>
                      <Button
                        size="sm"
                        onClick={() => window.open(message.previewUrl, '_blank')}
                        className="btn-primary"
                      >
                        <Eye size={12} className="me-2" />
                        View Live Preview
                      </Button>
                    </div>
                  )}

                  {message.models && (
                    <div className="mt-3 pt-3 border-top" style={{ borderColor: '#1e293b' }}>
                      <div className="small text-light">
                        Orchestrated: {Array.isArray(message.models) ? message.models.join(' • ') : message.models}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 glass-dark border-top" style={{ borderColor: 'rgba(51, 65, 85, 0.5)' }}>
        <Form onSubmit={handleSubmit} className="d-flex gap-3">
          <Form.Control
            as="textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentProject ? "Describe what you want to build..." : "Select a project first..."}
            rows={3}
            style={{ resize: 'none' }}
            disabled={!currentProject}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim() || !currentProject}
            className="align-self-end btn-primary"
            style={{
              height: '2.75rem',
              width: '2.75rem',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </Button>
        </Form>
        <p className="small text-light mt-2 text-center">
          Press <kbd className="px-2 py-1 rounded text-light" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>Enter</kbd> to send &bull; <kbd className="px-2 py-1 rounded text-light" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}