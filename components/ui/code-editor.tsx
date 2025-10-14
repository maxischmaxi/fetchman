"use client"

import { useCallback } from "react"
import { useTheme } from "next-themes"
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  placeholder?: string
  height?: string
}

const FETCHMAN_THEMES_FLAG = "__fetchmanMonacoThemesReady"
const SAFE_META_KEYS = new Set(["a", "c", "v", "x", "z", "y", "f"])

const defineFetchmanThemes = (monaco: Monaco) => {
  if (typeof window !== "undefined" && (window as Record<string, unknown>)[FETCHMAN_THEMES_FLAG]) {
    return
  }

  monaco.editor.defineTheme("fetchman-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "", foreground: "0f172a", background: "f8fafc" },
      { token: "string", foreground: "047857" },
      { token: "number", foreground: "1d4ed8" },
      { token: "keyword", foreground: "7c3aed" },
      { token: "comment", foreground: "64748b", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#f8fafc",
      "editor.foreground": "#0f172a",
      "editorLineNumber.foreground": "#94a3b8",
      "editorLineNumber.activeForeground": "#0f172a",
      "editorCursor.foreground": "#2563eb",
      "editor.selectionBackground": "#bfdbfe66",
      "editor.inactiveSelectionBackground": "#bfdbfe3d",
      "editor.lineHighlightBackground": "#e2e8f099",
      "editorIndentGuide.background": "#cbd5f5",
      "editorIndentGuide.activeBackground": "#94a3b8",
      "editorBracketMatch.border": "#2563eb88",
      "scrollbarSlider.background": "#94a3b870",
      "scrollbarSlider.hoverBackground": "#64748b90",
      "scrollbarSlider.activeBackground": "#475569b3",
      "editorSuggestWidget.background": "#e2e8f0",
      "editorSuggestWidget.border": "#cbd5f5",
    },
  })

  monaco.editor.defineTheme("fetchman-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "f4f4f5", background: "09090b" },
      { token: "string", foreground: "bef264" },
      { token: "number", foreground: "38bdf8" },
      { token: "keyword", foreground: "c084fc" },
      { token: "comment", foreground: "71717a", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#09090b",
      "editor.foreground": "#f4f4f5",
      "editorLineNumber.foreground": "#52525b",
      "editorLineNumber.activeForeground": "#fafafa",
      "editorCursor.foreground": "#38bdf8",
      "editor.selectionBackground": "#1f293780",
      "editor.inactiveSelectionBackground": "#1f293760",
      "editor.lineHighlightBackground": "#18181b99",
      "editorIndentGuide.background": "#27272a",
      "editorIndentGuide.activeBackground": "#3f3f46",
      "editorBracketMatch.border": "#38bdf888",
      "scrollbarSlider.background": "#52525b70",
      "scrollbarSlider.hoverBackground": "#a1a1aa80",
      "scrollbarSlider.activeBackground": "#d6d6d680",
      "editorSuggestWidget.background": "#18181b",
      "editorSuggestWidget.border": "#27272a",
    },
  })

  if (typeof window !== "undefined") {
    (window as Record<string, unknown>)[FETCHMAN_THEMES_FLAG] = true
  }
}

export function CodeEditor({ value, onChange, language, placeholder, height = "100%" }: CodeEditorProps) {
  const { resolvedTheme, theme: appTheme } = useTheme()
  const effectiveTheme = resolvedTheme ?? appTheme ?? "light"
  const editorTheme = effectiveTheme === "dark" ? "fetchman-dark" : "fetchman-light"

  const handleBeforeMount = useCallback((monacoInstance: Monaco) => {
    defineFetchmanThemes(monacoInstance)
  }, [])

  const handleMount = useCallback<OnMount>((editorInstance, monacoInstance) => {
    editorInstance.onKeyDown((e) => {
      const event = e.browserEvent
      if (!event || !event.metaKey || event.ctrlKey) return

      const key = event.key
      if (!key || key.length !== 1) return

      const normalizedKey = key.toLowerCase()
      if (SAFE_META_KEYS.has(normalizedKey)) {
        return
      }

      // Stop browser shortcuts like Cmd+T/Cmd+W from hijacking focus
      e.preventDefault()
      event.preventDefault()

      if (normalizedKey === "s") {
        return
      }

      if (!event.altKey) {
        editorInstance.trigger("keyboard", "type", { text: key })
      }
    })

    // Preserve placeholder support if needed
    if (placeholder) {
      const model = editorInstance.getModel()
      if (model && model.getValue() === "") {
        monacoInstance.editor.setModelLanguage(model, language || "plaintext")
      }
    }
  }, [language, placeholder])

  const handleChange = useCallback(
    (newValue?: string) => {
      if (typeof newValue !== "string") return
      onChange(newValue)
    },
    [onChange],
  )

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={handleChange}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      theme={editorTheme}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        wrappingIndent: "indent",
        formatOnPaste: true,
        formatOnType: false,
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoIndent: "full",
        bracketPairColorization: { enabled: true },
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
        folding: true,
        foldingStrategy: "indentation",
        showFoldingControls: "always",
        matchBrackets: "always",
        renderWhitespace: "selection",
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
        placeholder,
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
      loading={
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      }
    />
  )
}
