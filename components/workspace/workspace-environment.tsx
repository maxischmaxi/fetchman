"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Save, Eye, EyeOff, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WorkspaceEnvironmentPanelProps {
  workspaceId: string
}

interface ApiVariable {
  key: string
  value: string
  isSecret: boolean
  error?: string
}

interface EnvironmentResponse {
  variables: ApiVariable[]
}

interface VariableRow extends ApiVariable {
  id: string
  reveal: boolean
}

const buildRowId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function WorkspaceEnvironmentPanel({ workspaceId }: WorkspaceEnvironmentPanelProps) {
  const queryClient = useQueryClient()
  const [variables, setVariables] = useState<VariableRow[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const { data, isLoading, isError, error } = useQuery<EnvironmentResponse>({
    queryKey: ["workspace-env", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/env`, {
        method: "GET",
        cache: "no-store",
      })
      if (!res.ok) {
        throw new Error("Failed to fetch environment variables")
      }
      return res.json()
    },
  })

  useEffect(() => {
    if (!data) return
    setVariables(
      data.variables.map((variable) => ({
        ...variable,
        id: buildRowId(),
        reveal: !variable.isSecret,
      })),
    )
    setIsDirty(false)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (payload: ApiVariable[]) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: payload }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to save environment variables")
      }
      return res.json() as Promise<EnvironmentResponse>
    },
    onSuccess: (response) => {
      setVariables(
        response.variables.map((variable) => ({
          ...variable,
          id: buildRowId(),
          reveal: !variable.isSecret,
        })),
      )
      setIsDirty(false)
      setFormError(null)
      queryClient.invalidateQueries({ queryKey: ["workspace-env", workspaceId] })
    },
    onError: (mutationError: unknown) => {
      setFormError(
        mutationError instanceof Error
          ? mutationError.message
          : "Beim Speichern ist ein unbekannter Fehler aufgetreten.",
      )
    },
  })

  const handleVariableChange = useCallback(
    (index: number, field: keyof ApiVariable, value: string | boolean) => {
      setFormError(null)
      setVariables((prev) => {
        const next = [...prev]
        const updated = { ...next[index], [field]: value }
        if (field === "isSecret" && typeof value === "boolean") {
          updated.reveal = !value ? true : next[index].reveal
        }
        next[index] = updated
        return next
      })
      setIsDirty(true)
    },
    [],
  )

  const handleRevealToggle = useCallback((index: number) => {
    setFormError(null)
    setVariables((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], reveal: !next[index].reveal }
      return next
    })
  }, [])

  const handleRemove = useCallback((index: number) => {
    setFormError(null)
    setVariables((prev) => prev.filter((_, idx) => idx !== index))
    setIsDirty(true)
  }, [])

  const handleAddVariable = useCallback(() => {
    setFormError(null)
    setVariables((prev) => [
      ...prev,
      {
        id: buildRowId(),
        key: "",
        value: "",
        isSecret: false,
        reveal: true,
      },
    ])
    setIsDirty(true)
  }, [])

  const deduplicatedKeys = useMemo(() => {
    const counts = new Map<string, number>()
    variables.forEach((variable) => {
      const key = variable.key.trim()
      if (!key) return
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [variables])

  const hasValidationErrors = useMemo(() => {
    if (variables.some((variable) => !variable.key.trim())) {
      return "Alle Variablen benötigen einen Schlüssel."
    }

    const duplicateKey = Array.from(deduplicatedKeys.entries()).find(([, count]) => count > 1)
    if (duplicateKey) {
      return `Der Schlüssel "${duplicateKey[0]}" ist mehrfach vorhanden.`
    }

    return null
  }, [deduplicatedKeys, variables])

  const handleSave = useCallback(() => {
    const validationMessage = hasValidationErrors
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    const payload = variables.map<ApiVariable>((variable) => ({
      key: variable.key.trim(),
      value: variable.value,
      isSecret: variable.isSecret,
    }))

    saveMutation.mutate(payload)
  }, [hasValidationErrors, saveMutation, variables])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4 flex items-center justify-between bg-muted/40">
        <div>
          <h1 className="text-xl font-semibold">Environment Variablen</h1>
          <p className="text-sm text-muted-foreground">
            Workspace-bezogene Variablen. Geheimnisse werden verschlüsselt gespeichert.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddVariable}>
            <Plus className="mr-2 h-4 w-4" />
            Variable hinzufügen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || saveMutation.isPending || !isDirty}
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Speichere..." : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {formError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        {isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {(error as Error)?.message || "Environment konnte nicht geladen werden."}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Lade Environment...</p>
          </div>
        ) : variables.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
            <p className="font-medium">Keine Variablen vorhanden</p>
            <p className="text-sm text-muted-foreground">
              Lege deine ersten Variablen an, um Umgebungseinstellungen zu speichern.
            </p>
          </div>
        ) : (
          <div className="border overflow-hidden">
            <div className="grid grid-cols-[1.5fr_2fr_120px_60px] bg-muted/40 text-xs font-medium uppercase text-muted-foreground">
              <div className="px-4 py-2">Key</div>
              <div className="px-4 py-2 border-l">Value</div>
              <div className="px-4 py-2 border-l">Secret</div>
              <div className="px-4 py-2 border-l text-center"></div>
            </div>
            <div>
              {variables.map((variable, index) => (
                <div
                  key={variable.id}
                  className="grid grid-cols-[1.5fr_2fr_120px_60px] border-t bg-background/60 hover:bg-muted/20"
                >
                  <div className="border-r">
                    <Label htmlFor={`env-key-${variable.id}`} className="sr-only">
                      Key
                    </Label>
                    <Input
                      id={`env-key-${variable.id}`}
                      value={variable.key}
                      onChange={(event) =>
                        handleVariableChange(index, "key", event.target.value)
                      }
                      placeholder="API_URL"
                      className="h-9 border-none focus:ring-0 focus-visible:ring-0 radius-none"
                    />
                  </div>
                  <div className="border-r">
                    <Label htmlFor={`env-value-${variable.id}`} className="sr-only">
                      Value
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`env-value-${variable.id}`}
                        type={variable.isSecret && !variable.reveal ? "password" : "text"}
                        value={variable.value}
                        onChange={(event) =>
                          handleVariableChange(index, "value", event.target.value)
                        }
                        placeholder={variable.isSecret ? "••••••••" : "https://api.example.com"}
                        className="h-9 border-none focus:ring-0 focus-visible:ring-0 radius-none"
                      />
                      {variable.isSecret && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRevealToggle(index)}
                        >
                          {variable.reveal ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {variable.error === "decryption_failed" && (
                      <p className="mt-2 text-xs text-destructive">
                        Wert konnte nicht entschlüsselt werden. Bitte aktualisiere ihn.
                      </p>
                    )}
                  </div>
                  <div className="px-4 border-r flex items-center gap-2">
                    <input
                      id={`env-secret-${variable.id}`}
                      type="checkbox"
                      checked={variable.isSecret}
                      onChange={(event) =>
                        handleVariableChange(index, "isSecret", event.target.checked)
                      }
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label
                      htmlFor={`env-secret-${variable.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Geheim
                    </Label>
                  </div>
                  <div className="px-4 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
