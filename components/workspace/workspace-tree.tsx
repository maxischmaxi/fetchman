"use client"

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Folder, FolderPlus, FilePlus, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface Workspace {
  _id: string
  name: string
  description?: string
}

interface Folder {
  _id: string
  name: string
  workspaceId: string
  parentFolderId?: string
}

interface Request {
  _id: string
  name: string
  method: string
  workspaceId: string
  folderId?: string
}

interface WorkspaceTreeProps {
  workspace: Workspace
  onSelectWorkspace: (workspaceId: string) => void
  onSelectFolder: (folderId: string) => void
  onSelectRequest: (requestId: string) => void
  selectedRequestId?: string
  selectedWorkspaceId?: string
  selectedFolderId?: string
  selectedFolderPath?: string[]
}

export function WorkspaceTree({
  workspace,
  onSelectWorkspace,
  onSelectFolder,
  onSelectRequest,
  selectedRequestId,
  selectedWorkspaceId,
  selectedFolderId,
  selectedFolderPath = [],
}: WorkspaceTreeProps) {
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(selectedWorkspaceId === workspace._id)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'folder' | 'request'>('folder')
  const [newItemName, setNewItemName] = useState('')
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>()

  useEffect(() => {
    if (selectedWorkspaceId === workspace._id) {
      setIsExpanded(true)
    }
  }, [selectedWorkspaceId, workspace._id])

  const fetchFolders = useCallback(async () => {
    const response = await fetch(`/api/folders?workspaceId=${workspace._id}`)
    if (!response.ok) throw new Error('Failed to fetch folders')
    return response.json() as Promise<Folder[]>
  }, [workspace._id])

  const fetchRequests = useCallback(async () => {
    const response = await fetch(`/api/requests?workspaceId=${workspace._id}`)
    if (!response.ok) throw new Error('Failed to fetch requests')
    return response.json() as Promise<Request[]>
  }, [workspace._id])

  const prefetchWorkspaceData = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['folders', workspace._id],
      queryFn: fetchFolders,
      staleTime: 60_000,
    })
    queryClient.prefetchQuery({
      queryKey: ['requests', workspace._id],
      queryFn: fetchRequests,
      staleTime: 60_000,
    })
    queryClient.prefetchQuery({
      queryKey: ['workspace-folders', workspace._id],
      queryFn: fetchFolders,
      staleTime: 60_000,
    })
  }, [fetchFolders, fetchRequests, queryClient, workspace._id])

  const handleWorkspaceSelect = useCallback(() => {
    prefetchWorkspaceData()
    onSelectWorkspace(workspace._id)
  }, [onSelectWorkspace, prefetchWorkspaceData, workspace._id])

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', workspace._id],
    queryFn: fetchFolders,
    enabled: isExpanded,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  })

  // Fetch requests
  const { data: requests = [] } = useQuery({
    queryKey: ['requests', workspace._id],
    queryFn: fetchRequests,
    enabled: isExpanded,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  })

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; workspaceId: string; parentFolderId?: string }) => {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create folder')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', workspace._id] })
      setNewItemName('')
      setIsDialogOpen(false)
    },
  })

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: { name: string; method: string; url: string; workspaceId: string; folderId?: string; headers: any[]; queryParams: any[] }) => {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', workspace._id] })
      setNewItemName('')
      setIsDialogOpen(false)
    },
  })

  const handleCreateFolder = () => {
    if (!newItemName.trim()) return
    createFolderMutation.mutate({
      name: newItemName,
      workspaceId: workspace._id,
      parentFolderId: targetFolderId,
    })
  }

  const handleCreateRequest = () => {
    if (!newItemName.trim()) return
    createRequestMutation.mutate({
      name: newItemName,
      method: 'GET',
      url: 'https://api.example.com',
      workspaceId: workspace._id,
      folderId: targetFolderId,
      headers: [],
      queryParams: [],
      auth: { type: 'none' },
    })
  }

  const openDialog = (type: 'folder' | 'request', folderId?: string) => {
    setDialogType(type)
    setTargetFolderId(folderId)
    setIsDialogOpen(true)
  }

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500/10 text-green-500 border-green-500/20',
      POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      PUT: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      PATCH: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
    }
    return colors[method] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  const rootFolders = folders.filter(f => !f.parentFolderId)
  const rootRequests = requests.filter(r => !r.folderId)
  const isWorkspaceActive =
    selectedWorkspaceId === workspace._id && !selectedFolderId && !selectedRequestId

  return (
    <div className="mb-1">
      <div
        className={`group flex items-center gap-1 p-2 rounded-md hover:bg-accent cursor-pointer ${
          isWorkspaceActive ? 'bg-accent text-foreground' : ''
        }`}
        onClick={handleWorkspaceSelect}
        onMouseEnter={prefetchWorkspaceData}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleWorkspaceSelect()
          }
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(event) => {
            event.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <span className="flex-1 text-sm font-medium">{workspace.name}</span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => openDialog('folder')}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => openDialog('request')}
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {rootFolders.map(folder => (
            <FolderItem
              key={folder._id}
              folder={folder}
              allFolders={folders}
              allRequests={requests}
              onSelectFolder={onSelectFolder}
              onSelectRequest={onSelectRequest}
              selectedRequestId={selectedRequestId}
              selectedFolderId={selectedFolderId}
              selectedFolderPath={selectedFolderPath}
              onCreateFolder={(folderId) => openDialog('folder', folderId)}
              onCreateRequest={(folderId) => openDialog('request', folderId)}
              workspaceId={workspace._id}
            />
          ))}
          {rootRequests.map(request => (
            <RequestItem
              key={request._id}
              request={request}
              onSelect={onSelectRequest}
              isSelected={selectedRequestId === request._id}
              workspaceId={workspace._id}
            />
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'folder' ? 'Neuer Ordner' : 'Neuer Request'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={dialogType === 'folder' ? 'Ordner Name' : 'Request Name'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    dialogType === 'folder' ? handleCreateFolder() : handleCreateRequest()
                  }
                }}
              />
            </div>
            <Button
              onClick={dialogType === 'folder' ? handleCreateFolder : handleCreateRequest}
              disabled={!newItemName.trim() || createFolderMutation.isPending || createRequestMutation.isPending}
              className="w-full"
            >
              {dialogType === 'folder' ? 'Ordner erstellen' : 'Request erstellen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FolderItem({
  folder,
  allFolders,
  allRequests,
  onSelectFolder,
  onSelectRequest,
  selectedRequestId,
  selectedFolderId,
  selectedFolderPath = [],
  onCreateFolder,
  onCreateRequest,
  workspaceId,
}: {
  folder: Folder
  allFolders: Folder[]
  allRequests: Request[]
  onSelectFolder: (id: string) => void
  onSelectRequest: (id: string) => void
  selectedRequestId?: string
  selectedFolderId?: string
  selectedFolderPath?: string[]
  onCreateFolder: (folderId: string) => void
  onCreateRequest: (folderId: string) => void
  workspaceId: string
}) {
  const queryClient = useQueryClient()
  const shouldBeExpanded =
    selectedFolderId === folder._id || selectedFolderPath.includes(folder._id)
  const [isExpanded, setIsExpanded] = useState(shouldBeExpanded)
  const isSelected = selectedFolderId === folder._id
  const isInActivePath = !isSelected && selectedFolderPath.includes(folder._id)

  const prefetchFolderData = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['workspace-folders', workspaceId],
      queryFn: async () => {
        const response = await fetch(`/api/folders?workspaceId=${workspaceId}`)
        if (!response.ok) throw new Error('Failed to fetch folders')
        return response.json()
      },
      staleTime: 60_000,
    })
    queryClient.prefetchQuery({
      queryKey: ['folder', folder._id],
      queryFn: async () => {
        const response = await fetch(`/api/folders/${folder._id}`)
        if (!response.ok) throw new Error('Failed to fetch folder')
        return response.json()
      },
      staleTime: 60_000,
    })
    queryClient.prefetchQuery({
      queryKey: ['folder-requests', folder._id],
      queryFn: async () => {
        const response = await fetch(`/api/requests?workspaceId=${workspaceId}&folderId=${folder._id}`)
        if (!response.ok) throw new Error('Failed to fetch folder requests')
        return response.json()
      },
      staleTime: 30_000,
    })
  }, [folder._id, queryClient, workspaceId])

  const handleFolderSelect = useCallback(() => {
    prefetchFolderData()
    onSelectFolder(folder._id)
  }, [onSelectFolder, prefetchFolderData, folder._id])

  const childFolders = allFolders.filter(f => f.parentFolderId === folder._id)
  const childRequests = allRequests.filter(r => r.folderId === folder._id)

  useEffect(() => {
    if (shouldBeExpanded) {
      setIsExpanded(true)
    }
  }, [shouldBeExpanded])

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete folder')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] })
    },
  })

  const handleDelete = () => {
    if (!confirm('Ordner und alle Inhalte löschen?')) return
    deleteFolderMutation.mutate(folder._id)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 p-2 rounded-md hover:bg-accent cursor-pointer ${
          isSelected ? 'bg-accent text-foreground' : isInActivePath ? 'bg-muted/40' : ''
        }`}
        onClick={handleFolderSelect}
        onMouseEnter={prefetchFolderData}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleFolderSelect()
          }
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(event) => {
            event.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm">{folder.name}</span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(event) => {
              event.stopPropagation()
              onCreateRequest(folder._id)
            }}
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {childFolders.map(childFolder => (
            <FolderItem
              key={childFolder._id}
              folder={childFolder}
              allFolders={allFolders}
              allRequests={allRequests}
              onSelectFolder={onSelectFolder}
              onSelectRequest={onSelectRequest}
              selectedRequestId={selectedRequestId}
              selectedFolderId={selectedFolderId}
              selectedFolderPath={selectedFolderPath}
              onCreateFolder={onCreateFolder}
              onCreateRequest={onCreateRequest}
              workspaceId={workspaceId}
            />
          ))}
          {childRequests.map(request => (
            <RequestItem
              key={request._id}
              request={request}
              onSelect={onSelectRequest}
              isSelected={selectedRequestId === request._id}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestItem({
  request,
  onSelect,
  isSelected,
  workspaceId,
}: {
  request: Request
  onSelect: (id: string) => void
  isSelected: boolean
  workspaceId: string
}) {
  const queryClient = useQueryClient()

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500/10 text-green-500 border-green-500/20',
      POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      PUT: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      PATCH: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
    }
    return colors[method] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  // Delete request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] })
    },
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Request löschen?')) return
    deleteRequestMutation.mutate(request._id)
  }

  return (
    <div
      className={`group flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer ${
        isSelected ? 'bg-accent' : ''
      }`}
      onClick={() => onSelect(request._id)}
    >
      <Badge variant="outline" className={`text-xs font-mono px-1.5 py-0 ${getMethodColor(request.method)}`}>
        {request.method}
      </Badge>
      <span className="flex-1 text-sm truncate">{request.name}</span>
      <div className="opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
