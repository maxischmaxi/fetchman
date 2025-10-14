"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Folder, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FolderOverviewProps {
  folderId: string
  workspaceId: string
  onOpenRequest: (requestId: string) => void
  onOpenFolder: (folderId: string) => void
}

interface FolderResponse {
  _id: string
  name: string
  workspaceId: string
  parentFolderId?: string
}

interface RequestResponse {
  _id: string
  name: string
  method: string
  workspaceId: string
  folderId?: string
}

const getMethodBadgeColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-500 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PUT: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    PATCH: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  }
  return colors[method] || "bg-gray-500/10 text-gray-500 border-gray-500/20"
}

export function FolderOverview({
  folderId,
  workspaceId,
  onOpenRequest,
  onOpenFolder,
}: FolderOverviewProps) {
  const { data: folderData, isLoading: isLoadingFolder } = useQuery<FolderResponse>({
    queryKey: ["folder", folderId],
    queryFn: async () => {
      const res = await fetch(`/api/folders/${folderId}`, {
        cache: "no-store",
      })
      if (!res.ok) {
        throw new Error("Failed to fetch folder")
      }
      return res.json()
    },
  })

  const { data: siblingFolders = [] } = useQuery<FolderResponse[]>({
    queryKey: ["workspace-folders", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/folders?workspaceId=${workspaceId}`, {
        cache: "no-store",
      })
      if (!res.ok) {
        throw new Error("Failed to fetch folders")
      }
      return res.json()
    },
    staleTime: 30_000,
  })

  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<RequestResponse[]>({
    queryKey: ["folder-requests", folderId],
    queryFn: async () => {
      const res = await fetch(
        `/api/requests?workspaceId=${workspaceId}&folderId=${folderId}`,
        {
          cache: "no-store",
        },
      )
      if (!res.ok) {
        throw new Error("Failed to fetch folder requests")
      }
      return res.json()
    },
  })

  const childFolders = useMemo(
    () => siblingFolders.filter((folder) => folder.parentFolderId === folderId),
    [folderId, siblingFolders],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4 bg-muted/40">
        <div className="flex items-center gap-3">
          <Folder className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">
              {isLoadingFolder ? "Lade Ordner..." : folderData?.name || "Ordner"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Übersicht aller Inhalte in diesem Ordner.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Unterordner
            </h2>
          </div>
          {childFolders.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              Keine Unterordner vorhanden.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {childFolders.map((child) => (
                <button
                  key={child._id}
                  onClick={() => onOpenFolder(child._id)}
                  className="flex w-full items-center gap-3 rounded-md border border-border/80 bg-background px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{child.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Requests
            </h2>
          </div>
          {isLoadingRequests ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lädt Requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              Keine Requests in diesem Ordner.
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <button
                  key={request._id}
                  onClick={() => onOpenRequest(request._id)}
                  className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <Badge
                    variant="outline"
                    className={`text-xs font-mono ${getMethodBadgeColor(request.method)}`}
                  >
                    {request.method}
                  </Badge>
                  <span className="text-sm font-medium">{request.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
