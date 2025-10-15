"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { RequestBuilder } from "@/components/workspace/request-builder";
import { WorkspaceEnvironmentPanel } from "@/components/workspace/workspace-environment";
import { FolderOverview } from "@/components/workspace/folder-overview";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { IFolder } from "@/lib/types";

type RouteState = {
  workspaceId?: string;
  folderPath: string[];
  requestId?: string;
};

const inferRouteState = async (
  slug: string[],
  signal?: AbortSignal,
): Promise<RouteState> => {
  if (slug.length === 0) {
    return { folderPath: [] };
  }

  const workspaceId = slug[0];
  if (slug.length === 1) {
    return { workspaceId, folderPath: [] };
  }

  const rest = slug.slice(1);
  const candidateRequestId = rest[rest.length - 1];

  try {
    const res = await fetch(`/api/requests/${candidateRequestId}`, {
      method: "GET",
      cache: "no-store",
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      const normalizedWorkspaceId =
        typeof data.workspaceId === "string"
          ? data.workspaceId
          : data.workspaceId?._id || data.workspaceId?.toString?.();

      const folderPath = rest.slice(0, -1);
      return {
        workspaceId: normalizedWorkspaceId || workspaceId,
        folderPath,
        requestId: data._id,
      };
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw error;
    }
    console.error("Error inferring route state:", error);
  }

  return {
    workspaceId,
    folderPath: rest,
  };
};

const resolveFolderPath = async (
  folderId?: string | null,
): Promise<{ path: string[]; workspaceId?: string }> => {
  if (!folderId) return { path: [], workspaceId: undefined };

  const path: string[] = [];
  let currentId: string | undefined | null = folderId;
  let resolvedWorkspace: string | undefined;

  while (currentId) {
    const res: Response = await fetch(`/api/folders/${currentId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) break;

    const data: IFolder = await res.json();

    if (!resolvedWorkspace) {
      resolvedWorkspace = data.workspaceId;
    }

    path.unshift(data._id);
    currentId = data.parentFolderId || undefined;
  }

  return { path, workspaceId: resolvedWorkspace };
};

export function WorkspacePageClient({
  initialWorkspaceId,
  initialFolderPath,
  initialRequestId,
}: {
  initialWorkspaceId?: string;
  initialFolderPath?: string[];
  initialRequestId?: string;
}) {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = useMemo(() => {
    const value = params?.slug;
    if (!value) return [] as string[];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  }, [params]);

  const slugKey = slug.join("/");

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<
    string | undefined
  >(initialWorkspaceId);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string[]>(
    initialFolderPath || [],
  );
  const [selectedRequestId, setSelectedRequestId] = useState<
    string | undefined
  >(initialRequestId);

  useEffect(() => {
    // If no initial state was provided, fall back to client inference
    if (initialWorkspaceId || initialFolderPath?.length || initialRequestId) {
      return;
    }

    const abortController = new AbortController();
    const hydrateFromSlug = async () => {
      try {
        const state = await inferRouteState(slug, abortController.signal);
        if (abortController.signal.aborted) return;

        setSelectedWorkspaceId(state.workspaceId);
        setSelectedFolderPath(state.folderPath);
        setSelectedRequestId(state.requestId);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error resolving route state:", error);
        }
      }
    };

    hydrateFromSlug();

    return () => {
      abortController.abort();
    };
  }, [slugKey, slug, initialWorkspaceId, initialFolderPath, initialRequestId]);

  const navigateToRequest = useCallback(
    async (requestId: string) => {
      try {
        const res = await fetch(`/api/requests/${requestId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to resolve request for navigation");
        }

        const data = await res.json();
        const resolvedWorkspaceId =
          typeof data.workspaceId === "string"
            ? data.workspaceId
            : data.workspaceId?._id || data.workspaceId?.toString?.();

        if (!resolvedWorkspaceId) {
          throw new Error("Request is missing a workspace reference");
        }

        const { path: folderSegments } = await resolveFolderPath(data.folderId);

        const segments = [
          resolvedWorkspaceId,
          ...folderSegments,
          requestId,
        ].filter(Boolean);
        const basePath = `/${segments.join("/")}`;

        const nextSearchParams = new URLSearchParams(searchParams);
        const search = nextSearchParams.toString();

        setSelectedWorkspaceId(resolvedWorkspaceId);
        setSelectedFolderPath(folderSegments);
        setSelectedRequestId(requestId);

        router.push(search ? `${basePath}?${search}` : basePath, {
          scroll: false,
        });
      } catch (error) {
        console.error("Error navigating to request:", error);
      }
    },
    [router, searchParams],
  );

  const handleSelectRequest = useCallback(
    (requestId: string) => {
      navigateToRequest(requestId);
    },
    [navigateToRequest],
  );

  const navigateToWorkspace = useCallback(
    (workspaceId: string) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("tab");
      const search = nextSearchParams.toString();

      setSelectedWorkspaceId(workspaceId);
      setSelectedFolderPath([]);
      setSelectedRequestId(undefined);

      router.push(search ? `/${workspaceId}?${search}` : `/${workspaceId}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const navigateToFolder = useCallback(
    async (folderId: string) => {
      try {
        const { path, workspaceId } = await resolveFolderPath(folderId);
        const resolvedWorkspace = workspaceId || selectedWorkspaceId;

        if (!resolvedWorkspace) {
          throw new Error("Unable to resolve workspace for selected folder");
        }

        const segments = [resolvedWorkspace, ...path].filter(Boolean);
        const basePath = `/${segments.join("/")}`;

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete("tab");
        const search = nextSearchParams.toString();

        setSelectedWorkspaceId(resolvedWorkspace);
        setSelectedFolderPath(path);
        setSelectedRequestId(undefined);

        router.push(search ? `${basePath}?${search}` : basePath, {
          scroll: false,
        });
      } catch (error) {
        console.error("Error navigating to folder:", error);
      }
    },
    [router, searchParams, selectedWorkspaceId],
  );

  const handleSelectWorkspace = useCallback(
    (workspaceId: string) => {
      navigateToWorkspace(workspaceId);
    },
    [navigateToWorkspace],
  );

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      navigateToFolder(folderId);
    },
    [navigateToFolder],
  );

  const activeFolderId = selectedFolderPath[selectedFolderPath.length - 1];
  const showFolderOverview = Boolean(activeFolderId) && !selectedRequestId;
  const showWorkspaceEnvironment =
    Boolean(selectedWorkspaceId) && !selectedRequestId && !showFolderOverview;

  return (
    <div className="h-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={26} minSize={18} maxSize={40}>
          <WorkspaceSidebar
            onSelectRequest={handleSelectRequest}
            onSelectWorkspace={handleSelectWorkspace}
            onSelectFolder={handleSelectFolder}
            selectedRequestId={selectedRequestId}
            selectedWorkspaceId={selectedWorkspaceId}
            selectedFolderId={activeFolderId}
            selectedFolderPath={selectedFolderPath}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={40}>
          <div className="h-full flex-1 overflow-hidden">
            {selectedRequestId && (
              <RequestBuilder requestId={selectedRequestId} />
            )}

            {!selectedRequestId &&
              showFolderOverview &&
              activeFolderId &&
              selectedWorkspaceId && (
                <FolderOverview
                  folderId={activeFolderId}
                  workspaceId={selectedWorkspaceId}
                  onOpenRequest={handleSelectRequest}
                  onOpenFolder={handleSelectFolder}
                />
              )}

            {!selectedRequestId &&
              !showFolderOverview &&
              showWorkspaceEnvironment &&
              selectedWorkspaceId && (
                <WorkspaceEnvironmentPanel workspaceId={selectedWorkspaceId} />
              )}

            {!selectedRequestId &&
              showFolderOverview &&
              (!activeFolderId || !selectedWorkspaceId) && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">
                      Ordner konnte nicht geladen werden
                    </h2>
                    <p className="text-muted-foreground">
                      Bitte wähle einen gültigen Ordner aus der linken
                      Navigation.
                    </p>
                  </div>
                </div>
              )}

            {!selectedRequestId &&
              !showFolderOverview &&
              !showWorkspaceEnvironment && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">
                      Willkommen bei Fetchman
                    </h2>
                    <p className="text-muted-foreground">
                      Wähle einen Workspace aus oder erstelle einen neuen.
                    </p>
                  </div>
                </div>
              )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
