"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WorkspaceTree } from './workspace-tree'

interface Workspace {
  _id: string
  name: string
  description?: string
}

interface WorkspaceSidebarProps {
  onSelectWorkspace: (workspaceId: string) => void
  onSelectFolder: (folderId: string) => void
  onSelectRequest: (requestId: string) => void
  selectedRequestId?: string
  selectedWorkspaceId?: string
  selectedFolderId?: string
  selectedFolderPath?: string[]
}

export function WorkspaceSidebar({
  onSelectWorkspace,
  onSelectFolder,
  onSelectRequest,
  selectedRequestId,
  selectedWorkspaceId,
  selectedFolderId,
  selectedFolderPath,
}: WorkspaceSidebarProps) {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' })

  // Fetch workspaces with useQuery
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await fetch('/api/workspaces')
      if (!response.ok) throw new Error('Failed to fetch workspaces')
      return response.json() as Promise<Workspace[]>
    },
  })

  // Create workspace mutation
  const createMutation = useMutation({
    mutationFn: async (workspace: { name: string; description: string }) => {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspace),
      })
      if (!response.ok) throw new Error('Failed to create workspace')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setNewWorkspace({ name: '', description: '' })
      setIsCreateOpen(false)
    },
  })

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim()) return
    createMutation.mutate(newWorkspace)
  }

  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuer Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                    placeholder="Mein Workspace"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung (optional)</Label>
                  <Textarea
                    id="description"
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                    placeholder="Workspace Beschreibung"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={createMutation.isPending || !newWorkspace.name.trim()}
                  className="w-full"
                >
                  {createMutation.isPending ? 'Erstelle...' : 'Workspace erstellen'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Lade Workspaces...
            </div>
          ) : (
            workspaces.map((workspace) => (
              <WorkspaceTree
                key={workspace._id}
                workspace={workspace}
                onSelectWorkspace={onSelectWorkspace}
                onSelectFolder={onSelectFolder}
                onSelectRequest={onSelectRequest}
                selectedRequestId={selectedRequestId}
                selectedWorkspaceId={selectedWorkspaceId}
                selectedFolderId={selectedFolderId}
                selectedFolderPath={selectedFolderPath}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
