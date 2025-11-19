'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2 } from 'lucide-react'
import { Button, Modal, Form } from 'react-bootstrap'
import { toast } from 'react-hot-toast'
import axios from 'axios'

interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  _count?: {
    messages: number
  }
}

interface SidebarProps {
  currentProject: Project | null
  onProjectSelect: (project: Project | null) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function Sidebar({ currentProject, onProjectSelect }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/projects`)
      setProjects(response.data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    try {
      const response = await axios.post(`${API_URL}/api/projects`, {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null
      })

      const newProject = response.data
      setProjects(prev => [newProject, ...prev])
      onProjectSelect(newProject)
      setNewProjectName('')
      setNewProjectDescription('')
      setShowModal(false)
      toast.success(`Project "${newProject.name}" created!`)
    } catch (error: any) {
      console.error('Failed to create project:', error)
      if (error.response?.data?.error === 'Project name already exists') {
        toast.error('Project name already exists')
      } else {
        toast.error('Failed to create project')
      }
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      await axios.delete(`${API_URL}/api/projects/${projectToDelete.id}`)

      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id))

      if (currentProject?.id === projectToDelete.id) {
        onProjectSelect(null)
      }

      toast.success(`Project "${projectToDelete.name}" deleted`)
      setShowDeleteModal(false)
      setProjectToDelete(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
      toast.error('Failed to delete project')
    }
  }

  const confirmDelete = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete(project)
    setShowDeleteModal(true)
  }

  return (
    <div className="d-flex flex-column h-100 p-4">
      <div className="my-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="h5 fw-semibold text-light mb-0">Projects</h2>
          <Button
            size="sm"
            className="btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 px-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mb-3"
              style={{ width: '4rem', height: '4rem', backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
            >
              <FolderOpen size={32} color="#475569" />
            </div>
            <p className="small text-secondary text-center mb-2">No projects yet</p>
            <p className="small text-muted text-center">Start building to create your first project</p>
          </div>
        ) : (
          <ul className="list-unstyled">
            {projects.map((project) => (
              <li
                key={project.id}
                className={`p-3 rounded mb-2 border position-relative ${
                  currentProject?.id === project.id
                    ? 'border-primary'
                    : 'border-secondary'
                }`}
                style={{
                  backgroundColor: currentProject?.id === project.id
                    ? 'rgba(37, 99, 235, 0.1)'
                    : 'rgba(15, 23, 42, 0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => onProjectSelect(project)}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <FolderOpen size={16} color="#94a3b8" />
                    <div>
                      <span className="small text-light d-block">{project.name}</span>
                      {project._count && (
                        <span className="small text-light" style={{ fontSize: '0.7rem' }}>
                          {project._count.messages} messages
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-1 text-danger"
                    onClick={(e) => confirmDelete(project, e)}
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        contentClassName="bg-dark text-light"
      >
        <Modal.Header
          closeButton
          closeVariant="white"
          style={{ borderColor: '#334155' }}
        >
          <Modal.Title className="h5">Create New Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="small">Project Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
            />
          </Form.Group>
          <Form.Group>
            <Form.Label className="small">Description (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter project description"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ borderColor: '#334155' }}>
          <Button
            variant="outline-secondary"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="btn-primary"
            onClick={handleCreateProject}
          >
            Create Project
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
        contentClassName="bg-dark text-light"
      >
        <Modal.Header
          closeButton
          closeVariant="white"
          style={{ borderColor: '#334155' }}
        >
          <Modal.Title className="h5">Delete Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete <strong>{projectToDelete?.name}</strong>?</p>
          <p className="text-danger small">This will permanently delete all chat history and cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer style={{ borderColor: '#334155' }}>
          <Button
            variant="outline-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteProject}
          >
            Delete Project
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}