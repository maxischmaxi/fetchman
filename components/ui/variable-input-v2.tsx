"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef, useState, useCallback } from "react"

interface VariableInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onBlur'> {
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  onBlur?: (e: { target: { value: string } }) => void
  placeholder?: string
  type?: string
}

/**
 * Advanced input component using contenteditable that displays environment variables
 * as inline badges within the text flow
 */
export function VariableInputV2({
  value = "",
  onChange,
  onBlur,
  placeholder,
  type,
  className,
  ...props
}: VariableInputProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const isComposing = useRef(false)

  // Pattern to match {{variable}}
  const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g

  // Convert plain text to HTML with badge elements
  const textToHtml = useCallback((text: string) => {
    if (!text) return ''

    // Escape HTML except for our badge markup
    const parts: string[] = []
    let lastIndex = 0
    let match

    const regex = new RegExp(VARIABLE_PATTERN)
    while ((match = regex.exec(text)) !== null) {
      // Add text before variable
      if (match.index > lastIndex) {
        const before = text.slice(lastIndex, match.index)
        parts.push(escapeHtml(before))
      }

      // Add variable as badge
      const varName = match[1]
      parts.push(
        `<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700" contenteditable="false" data-variable="${varName}">{{${varName}}}</span>`
      )

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(escapeHtml(text.slice(lastIndex)))
    }

    return parts.join('')
  }, [])

  // Convert HTML back to plain text
  const htmlToText = useCallback((element: HTMLElement): string => {
    let text = ''

    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.hasAttribute('data-variable')) {
          // This is a badge, extract the variable name
          const varName = el.getAttribute('data-variable')
          text += `{{${varName}}}`
        } else {
          // Recurse into other elements
          text += htmlToText(el)
        }
      }
    })

    return text
  }, [])

  // Update content when value prop changes
  useEffect(() => {
    if (!contentRef.current || document.activeElement === contentRef.current) {
      return
    }

    const currentText = htmlToText(contentRef.current)
    if (currentText !== value) {
      const html = textToHtml(value)
      contentRef.current.innerHTML = html
    }
  }, [value, textToHtml, htmlToText])

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!contentRef.current || isComposing.current) return

    const text = htmlToText(contentRef.current)

    // Save cursor position
    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)
    const cursorOffset = range ? getCaretCharacterOffset(contentRef.current) : 0

    // Trigger onChange
    onChange?.({ target: { value: text } })

    // Re-render with badges
    requestAnimationFrame(() => {
      if (!contentRef.current) return

      const html = textToHtml(text)
      contentRef.current.innerHTML = html

      // Restore cursor position
      setCaretPosition(contentRef.current, cursorOffset)
    })
  }, [onChange, htmlToText, textToHtml])

  // Handle paste events
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')

    // Insert as plain text
    const selection = window.getSelection()
    if (!selection?.rangeCount) return

    selection.deleteFromDocument()
    const textNode = document.createTextNode(text)
    selection.getRangeAt(0).insertNode(textNode)

    // Move cursor to end of inserted text
    const range = document.createRange()
    range.setStartAfter(textNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    handleInput()
  }, [handleInput])

  // Handle composition events (for IME input)
  const handleCompositionStart = () => {
    isComposing.current = true
  }

  const handleCompositionEnd = () => {
    isComposing.current = false
    handleInput()
  }

  // Handle blur event
  const handleBlur = useCallback(() => {
    if (!contentRef.current) return

    const text = htmlToText(contentRef.current)
    setIsFocused(false)

    // Trigger onBlur callback if provided
    if (onBlur) {
      onBlur({ target: { value: text } })
    }
  }, [onBlur, htmlToText])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key (prevent default in single-line input)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      return
    }

    // Handle ArrowLeft - jump over variable badge to its left side
    if (e.key === 'ArrowLeft') {
      const selection = window.getSelection()
      if (!selection || !contentRef.current) return

      const range = selection.getRangeAt(0)

      // Only handle if cursor is collapsed (no selection) and no modifiers
      if (!range.collapsed || e.shiftKey || e.ctrlKey || e.metaKey) return

      // Check if we're right after a variable badge
      let nodeBefore = range.startContainer
      let offset = range.startOffset

      // If we're in a text node at position 0, check the previous sibling
      if (nodeBefore.nodeType === Node.TEXT_NODE && offset === 0) {
        nodeBefore = nodeBefore.previousSibling as Node
      }
      // If we're directly in the contenteditable div
      else if (nodeBefore === contentRef.current && offset > 0) {
        nodeBefore = contentRef.current.childNodes[offset - 1]
      }
      // If we're in a text node but not at position 0, let default behavior happen
      else if (nodeBefore.nodeType === Node.TEXT_NODE && offset > 0) {
        return
      }

      // Check if the node before cursor is a variable badge
      if (nodeBefore && nodeBefore.nodeType === Node.ELEMENT_NODE) {
        const element = nodeBefore as HTMLElement
        if (element.hasAttribute('data-variable')) {
          e.preventDefault()
          // Move cursor to before the badge
          const newRange = document.createRange()
          newRange.setStartBefore(element)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }
    }

    // Handle ArrowRight - jump over variable badge to its right side
    if (e.key === 'ArrowRight') {
      const selection = window.getSelection()
      if (!selection || !contentRef.current) return

      const range = selection.getRangeAt(0)

      // Only handle if cursor is collapsed (no selection) and no modifiers
      if (!range.collapsed || e.shiftKey || e.ctrlKey || e.metaKey) return

      // Check if we're right before a variable badge
      let nodeAfter = range.startContainer
      let offset = range.startOffset

      // If we're in a text node at the end, check the next sibling
      if (nodeAfter.nodeType === Node.TEXT_NODE && offset === (nodeAfter.textContent?.length || 0)) {
        nodeAfter = nodeAfter.nextSibling as Node
      }
      // If we're directly in the contenteditable div
      else if (nodeAfter === contentRef.current) {
        nodeAfter = contentRef.current.childNodes[offset]
      }
      // If we're in a text node but not at the end, let default behavior happen
      else if (nodeAfter.nodeType === Node.TEXT_NODE && offset < (nodeAfter.textContent?.length || 0)) {
        return
      }

      // Check if the node after cursor is a variable badge
      if (nodeAfter && nodeAfter.nodeType === Node.ELEMENT_NODE) {
        const element = nodeAfter as HTMLElement
        if (element.hasAttribute('data-variable')) {
          e.preventDefault()
          // Move cursor to after the badge
          const newRange = document.createRange()
          newRange.setStartAfter(element)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      }
    }

    // Handle Backspace - delete entire variable badge if cursor is right after it
    if (e.key === 'Backspace') {
      const selection = window.getSelection()
      if (!selection || !contentRef.current) return

      const range = selection.getRangeAt(0)

      // Only handle if cursor is collapsed (no selection)
      if (!range.collapsed) return

      // Check if the previous sibling is a variable badge
      let nodeBefore = range.startContainer
      let offset = range.startOffset

      // If we're in a text node at position 0, check the previous sibling
      if (nodeBefore.nodeType === Node.TEXT_NODE && offset === 0) {
        nodeBefore = nodeBefore.previousSibling as Node
      }
      // If we're directly in the contenteditable div
      else if (nodeBefore === contentRef.current && offset > 0) {
        nodeBefore = contentRef.current.childNodes[offset - 1]
      }
      // If we're in a text node but not at position 0, let default behavior happen
      else if (nodeBefore.nodeType === Node.TEXT_NODE && offset > 0) {
        return
      }

      // Check if the node before cursor is a variable badge
      if (nodeBefore && nodeBefore.nodeType === Node.ELEMENT_NODE) {
        const element = nodeBefore as HTMLElement
        if (element.hasAttribute('data-variable')) {
          e.preventDefault()
          // Remove the badge element
          element.remove()
          // Trigger input event to update state
          handleInput()
        }
      }
    }
  }

  // Handle click to move cursor to end if clicking in empty space
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!contentRef.current) return

    // Check if click target is the contenteditable div itself (not a child)
    // This happens when clicking in empty space to the right of content
    if (e.target === contentRef.current) {
      e.preventDefault()

      // Move cursor to the end
      const selection = window.getSelection()
      if (!selection) return

      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      range.collapse(false) // collapse to end
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }

    // If clicking on a badge, don't allow cursor placement inside it
    const target = e.target as HTMLElement
    if (target.hasAttribute && target.hasAttribute('data-variable')) {
      e.preventDefault()

      const selection = window.getSelection()
      if (!selection) return

      // Place cursor after the badge
      const range = document.createRange()
      range.setStartAfter(target)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    // For text nodes, let the browser handle it naturally
  }, [])

  return (
    <div className="relative w-full">
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "whitespace-nowrap overflow-x-auto overflow-y-hidden",
          type === "password" && !isFocused && "font-password",
          className
        )}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        {...props}
      />

      {/* Placeholder */}
      {!value && placeholder && (
        <div
          className="absolute left-3 top-2 text-sm text-muted-foreground pointer-events-none"
        >
          {placeholder}
        </div>
      )}
    </div>
  )
}

// Helper: Escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Helper: Get cursor position as character offset
function getCaretCharacterOffset(element: HTMLElement): number {
  let caretOffset = 0
  const selection = window.getSelection()

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(element)
    preCaretRange.setEnd(range.endContainer, range.endOffset)

    // Count text length, treating badges as their full {{variable}} length
    const walker = document.createTreeWalker(
      preCaretRange.cloneContents(),
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    )

    let node
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        caretOffset += (node.textContent || '').length
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.hasAttribute('data-variable')) {
          const varName = el.getAttribute('data-variable')
          caretOffset += `{{${varName}}}`.length
        }
      }
    }
  }

  return caretOffset
}

// Helper: Set cursor position by character offset
function setCaretPosition(element: HTMLElement, offset: number) {
  const selection = window.getSelection()
  if (!selection) return

  let currentOffset = 0
  let found = false

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    null
  )

  let node
  while ((node = walker.nextNode()) && !found) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = (node.textContent || '').length
      if (currentOffset + textLength >= offset) {
        const range = document.createRange()
        range.setStart(node, Math.min(offset - currentOffset, textLength))
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        found = true
      }
      currentOffset += textLength
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.hasAttribute('data-variable')) {
        const varName = el.getAttribute('data-variable')
        const varLength = `{{${varName}}}`.length

        if (currentOffset + varLength >= offset) {
          // Place cursor after the badge
          const range = document.createRange()
          range.setStartAfter(el)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
          found = true
        }
        currentOffset += varLength
      }
    }
  }

  if (!found) {
    // Place cursor at the end
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}
