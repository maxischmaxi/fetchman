"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

interface VariableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Input component that highlights environment variables with {{variable}} syntax
 */
export function VariableInput({
  value = "",
  onChange,
  className,
  ...props
}: VariableInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  // Sync scroll between input and highlight layer
  const handleScroll = () => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft
    }
  }

  useEffect(() => {
    const input = inputRef.current
    if (input) {
      input.addEventListener('scroll', handleScroll)
      return () => input.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Parse and highlight variables
  const highlightVariables = (text: string) => {
    const parts: { text: string; isVariable: boolean }[] = []
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add text before variable
      if (match.index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, match.index),
          isVariable: false,
        })
      }
      // Add variable
      parts.push({
        text: match[0],
        isVariable: true,
      })
      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        isVariable: false,
      })
    }

    return parts
  }

  const parts = highlightVariables(value)

  return (
    <div className="relative">
      {/* Highlight layer - positioned behind the input */}
      <div
        ref={highlightRef}
        className={cn(
          "absolute inset-0 pointer-events-none overflow-hidden whitespace-pre",
          "flex items-center px-3 text-transparent",
          className
        )}
        style={{
          font: 'inherit',
          letterSpacing: 'inherit',
        }}
      >
        <div className="flex-1 overflow-hidden">
          {parts.map((part, index) => (
            <span
              key={index}
              className={cn(
                part.isVariable && !isFocused
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded px-0.5"
                  : ""
              )}
            >
              {part.text}
            </span>
          ))}
        </div>
      </div>

      {/* Actual input - text is visible */}
      <Input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "relative bg-transparent",
          className
        )}
        {...props}
      />
    </div>
  )
}
