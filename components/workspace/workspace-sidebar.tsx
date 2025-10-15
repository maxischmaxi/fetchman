"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceTree } from "./workspace-tree";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface Workspace {
  _id: string;
  name: string;
  description?: string;
}

interface WorkspaceSidebarProps {
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectRequest: (requestId: string) => void;
  selectedRequestId?: string;
  selectedWorkspaceId?: string;
  selectedFolderId?: string;
  selectedFolderPath?: string[];
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
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const formSchema = z.object({
    name: z
      .string()
      .min(1, "Name ist erforderlich")
      .max(100, "Maximal 100 Zeichen"),
    description: z
      .string()
      .max(500, "Maximal 500 Zeichen")
      .optional()
      .or(z.literal("")),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
    mode: "onChange",
  });

  // Fetch workspaces with useQuery
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      return response.json() as Promise<Workspace[]>;
    },
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  // Create workspace mutation
  const createMutation = useMutation({
    mutationFn: async (workspace: { name: string; description?: string }) => {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workspace),
      });
      if (!response.ok) throw new Error("Failed to create workspace");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      form.reset({ name: "", description: "" });
      setIsCreateOpen(false);
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      name: values.name.trim(),
      description: values.description?.trim() || "",
    });
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isShortcut =
        (isMac && e.metaKey && e.key.toLowerCase() === "k") ||
        (!isMac && e.ctrlKey && e.key.toLowerCase() === "k");
      if (isShortcut) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredWorkspaces = normalizedSearch
    ? workspaces.filter((w) => w.name.toLowerCase().includes(normalizedSearch))
    : workspaces;

  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Workspace erstellen"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuer Workspace</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4 pt-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Mein Workspace"
                    aria-invalid={!!form.formState.errors.name}
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Workspace Beschreibung"
                    rows={3}
                    aria-invalid={!!form.formState.errors.description}
                    {...form.register("description")}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !form.formState.isValid}
                  className="w-full"
                >
                  {createMutation.isPending
                    ? "Erstelle..."
                    : "Workspace erstellen"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div>
          <Input
            ref={searchRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={"Suchen (⌘K / Ctrl+K)"}
            className="h-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredWorkspaces.map((workspace) => (
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
              searchTerm={normalizedSearch}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
