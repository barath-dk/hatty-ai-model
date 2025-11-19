'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { ChatInterface } from '@/components/chat-interface'
import { PreviewPane } from '@/components/preview-pane'
import { Header } from '@/components/header'
import { Button } from 'react-bootstrap'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  return (
    <div className="vh-100 d-flex flex-column">
      <Header />

      <div className="d-flex flex-grow-1 overflow-hidden position-relative">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="glass-dark" style={{ width: '18rem', borderRight: '1px solid rgba(51, 65, 85, 0.5)' }}>
            <Sidebar
              currentProject={currentProject}
              onProjectSelect={setCurrentProject}
            />
          </div>
        )}

        {/* Toggle Sidebar Button */}
        <div className="position-absolute" style={{ top: '0.9rem', left: '1rem', zIndex: 10 }}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="glass-dark"
          >
            {sidebarOpen ? (
              <PanelLeftClose size={16} />
            ) : (
              <PanelLeftOpen size={16} />
            )}
          </Button>
        </div>

        {/* Main Content */}
        <div className="d-flex flex-grow-1 overflow-hidden">
          {/* Chat Interface */}
          <div className="flex-grow-1 d-flex flex-column">
            <ChatInterface
              currentProject={currentProject}
              onPreviewGenerated={setPreviewUrl}
            />
          </div>

          {/* Preview Pane */}
          {previewUrl && (
            <div className="w-50 glass-dark" style={{ borderLeft: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <PreviewPane url={previewUrl} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}