import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Build a folder path from a list of all folders by walking parent pointers back to root.
export function buildFolderPathSegments(
  allFolders: Array<{ _id: string; parentFolderId?: string | null }>,
  folderId?: string | null,
): string[] {
  if (!folderId) return []
  const idToFolder = new Map(allFolders.map((f) => [f._id, f]))
  const segments: string[] = []
  let current: string | undefined | null = folderId
  const safetyLimit = 10_000
  let steps = 0
  while (current && steps < safetyLimit) {
    const node = idToFolder.get(current)
    if (!node) break
    segments.unshift(node._id)
    current = node.parentFolderId || undefined
    steps += 1
  }
  return segments
}
