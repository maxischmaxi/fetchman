import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import { headers } from "next/headers";
import { WorkspacePageClient } from "@/components/workspace/workspace-page-client";
import type { IWorkspace, IFolder, IRequest } from "@/lib/types";

type Params = { params: Promise<{ slug?: string[] }> };

async function getRequest(baseUrl: string, requestId: string): Promise<IRequest | undefined> {
  const res = await fetch(`${baseUrl}/api/requests/${requestId}`, {
    cache: "no-store",
    // Next.js will still route correctly without absolute URL in most cases, but allow override
  });
  if (!res.ok) return undefined;
  return res.json();
}

async function getFolder(baseUrl: string, folderId: string): Promise<IFolder | undefined> {
  const res = await fetch(`${baseUrl}/api/folders/${folderId}`, {
    cache: "no-store",
  });
  if (!res.ok) return undefined;
  return res.json();
}

async function getWorkspaces(baseUrl: string): Promise<IWorkspace[]> {
  const res = await fetch(`${baseUrl}/api/workspaces`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getFoldersByWorkspace(baseUrl: string, workspaceId: string): Promise<IFolder[]> {
  const res = await fetch(`${baseUrl}/api/folders?workspaceId=${workspaceId}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getRequestsByWorkspace(baseUrl: string, workspaceId: string): Promise<IRequest[]> {
  const res = await fetch(`${baseUrl}/api/requests?workspaceId=${workspaceId}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

function inferFromSlug(slug: string[]) {
  if (slug.length === 0) return { workspaceId: undefined as string | undefined, folderPath: [] as string[], requestId: undefined as string | undefined };
  const workspaceId = slug[0];
  if (slug.length === 1) return { workspaceId, folderPath: [] as string[], requestId: undefined as string | undefined };
  const rest = slug.slice(1);
  const candidateRequestId = rest[rest.length - 1];
  return { workspaceId, folderPath: rest, requestId: candidateRequestId };
}

async function resolveFolderPathServer(baseUrl: string, folderId?: string | null) {
  if (!folderId) return { path: [] as string[], workspaceId: undefined as string | undefined };
  const path: string[] = [];
  let current: string | undefined | null = folderId;
  let resolvedWorkspace: string | undefined;
  while (current) {
    const folder = await getFolder(baseUrl, current);
    if (!folder) break;
    if (!resolvedWorkspace) resolvedWorkspace = folder.workspaceId;
    path.unshift(folder._id);
    current = folder.parentFolderId || undefined;
  }
  return { path, workspaceId: resolvedWorkspace };
}

export default async function WorkspacePage({ params }: Params) {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const baseUrl = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const resolvedParams = await params;
  const slug: string[] = Array.isArray(resolvedParams?.slug)
    ? resolvedParams.slug.filter(Boolean)
    : resolvedParams?.slug
    ? [resolvedParams.slug].filter(Boolean)
    : [];
  const rough = inferFromSlug(slug);

  let selectedWorkspaceId = rough.workspaceId;
  let selectedFolderPath: string[] = rough.folderPath;
  let selectedRequestId: string | undefined = undefined;

  if (rough.requestId) {
    const req = await getRequest(baseUrl, rough.requestId);
    if (req) {
      const { path } = await resolveFolderPathServer(baseUrl, req.folderId);
      selectedWorkspaceId = req.workspaceId || selectedWorkspaceId;
      selectedFolderPath = path;
      selectedRequestId = req._id;
    }
  }

  const [workspaces, folders, requests] = await Promise.all([
    getWorkspaces(baseUrl),
    selectedWorkspaceId ? getFoldersByWorkspace(baseUrl, selectedWorkspaceId) : Promise.resolve([]),
    selectedWorkspaceId ? getRequestsByWorkspace(baseUrl, selectedWorkspaceId) : Promise.resolve([]),
  ]);

  const queryClient = new QueryClient();
  queryClient.setQueryData(["workspaces"], workspaces);
  if (selectedWorkspaceId) {
    queryClient.setQueryData(["folders", selectedWorkspaceId], folders);
    queryClient.setQueryData(["requests", selectedWorkspaceId], requests);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <WorkspacePageClient
        initialWorkspaceId={selectedWorkspaceId}
        initialFolderPath={selectedFolderPath}
        initialRequestId={selectedRequestId}
      />
    </HydrationBoundary>
  );
}
