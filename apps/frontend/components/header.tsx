'use client'

import { Sparkles, Zap } from 'lucide-react'

export function Header() {
  return (
    <header className="glass-dark border-bottom" style={{ borderColor: 'rgba(51, 65, 85, 0.5)' }}>
      <div className="d-flex align-items-center justify-content-between px-4 py-3">
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative">
            <div
              className="position-absolute top-0 start-0 w-100 h-100 rounded opacity-75"
              style={{
                background: 'linear-gradient(to right, #2563eb, #9333ea)',
                filter: 'blur(8px)'
              }}
            ></div>
            <div
              className="position-relative p-2 rounded"
              style={{ background: 'linear-gradient(to right, #2563eb, #9333ea)' }}
            >
              <Sparkles size={24} color="white" />
            </div>
          </div>
          <div>
            <h1 className="h4 fw-bold mb-0 gradient-text">
              Hatty AI Model
            </h1>
            <p className="small text-secondary mb-0">Multi-LLM Orchestration Platform</p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-none d-md-flex align-items-center gap-2 px-3 py-2 rounded glass-dark">
            <Zap size={16} color="#eab308" />
            <span className="small text-light">7 AI Models Active</span>
          </div>
        </div>
      </div>
    </header>
  )
}