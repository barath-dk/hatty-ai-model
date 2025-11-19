'use client'

interface PreviewPaneProps {
  url: string
}

export function PreviewPane({ url }: PreviewPaneProps) {
  return (
    <div className="h-100 d-flex flex-column">
      <div className="border-bottom p-3" style={{ borderColor: '#334155' }}>
        <h3 className="fw-semibold text-light mb-0">Preview</h3>
      </div>

      <div className="flex-grow-1">
        <iframe
          src={url}
          className="w-100 h-100 border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}