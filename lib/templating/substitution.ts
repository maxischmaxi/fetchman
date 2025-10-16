import connectDB from '@/lib/db/mongoose'
import WorkspaceEnvironment from '@/lib/models/WorkspaceEnvironment'
import { decryptValue } from '@/lib/security/encryption'
import { Types } from 'mongoose'

/**
 * Regular expression to match variable placeholders like {{variable_name}}
 * Supports optional whitespace around the variable name
 */
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

/**
 * Fetches and decrypts all environment variables for a workspace
 * Returns a Map for fast O(1) lookups
 */
export async function getVariableMap(workspaceId: string): Promise<Map<string, string>> {
  await connectDB()

  const environment = await WorkspaceEnvironment.findOne({
    workspaceId: new Types.ObjectId(workspaceId),
  })

  const variableMap = new Map<string, string>()

  if (environment && environment.variables) {
    for (const variable of environment.variables) {
      try {
        // Decrypt the value (all values are stored encrypted)
        const decryptedValue = decryptValue(variable.value)
        variableMap.set(variable.key, decryptedValue)
      } catch (error) {
        console.error(`Failed to decrypt variable "${variable.key}":`, error)
        // Skip this variable if decryption fails
      }
    }
  }

  return variableMap
}

/**
 * Substitutes variables in a string using the {{variable_name}} syntax
 *
 * @param text - The string containing variable placeholders
 * @param variables - Map of variable name to value
 * @returns The string with all variables substituted
 *
 * @example
 * substituteVariablesInString("https://{{base_url}}/api/{{endpoint}}", variables)
 * // Returns: "https://api.example.com/api/users"
 */
export function substituteVariablesInString(
  text: string,
  variables: Map<string, string>
): string {
  if (!text || typeof text !== 'string') {
    return text
  }

  return text.replace(VARIABLE_PATTERN, (match, variableName) => {
    const value = variables.get(variableName)

    if (value === undefined) {
      // If variable not found, keep the placeholder as-is
      console.warn(`Variable "${variableName}" not found in environment`)
      return match
    }

    return value
  })
}

/**
 * Recursively substitutes variables in an object (for headers, params, etc.)
 *
 * @param obj - The object containing variable placeholders
 * @param variables - Map of variable name to value
 * @returns A new object with all variables substituted
 */
export function substituteInObject<T extends Record<string, unknown>>(
  obj: T,
  variables: Map<string, string>
): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Substitute in both keys and values
    const substitutedKey = substituteVariablesInString(key, variables)

    if (typeof value === 'string') {
      result[substitutedKey] = substituteVariablesInString(value, variables)
    } else if (Array.isArray(value)) {
      result[substitutedKey] = value.map(item =>
        typeof item === 'string'
          ? substituteVariablesInString(item, variables)
          : item
      )
    } else if (value && typeof value === 'object') {
      result[substitutedKey] = substituteInObject(
        value as Record<string, unknown>,
        variables
      )
    } else {
      result[substitutedKey] = value
    }
  }

  return result as T
}

/**
 * Main entry point: Substitutes variables in all parts of a request
 *
 * @param request - The request configuration
 * @param workspaceId - The workspace ID to fetch variables from
 * @returns The request with all variables substituted
 */
export async function substituteRequest(request: {
  url: string
  headers?: Record<string, string>
  body?: string
  [key: string]: unknown
}, workspaceId: string): Promise<typeof request> {
  // Fetch and decrypt all variables for this workspace
  const variables = await getVariableMap(workspaceId)

  // If no variables defined, return request as-is
  if (variables.size === 0) {
    return request
  }

  // Substitute in URL
  const substitutedUrl = substituteVariablesInString(request.url, variables)

  // Substitute in headers
  const substitutedHeaders = request.headers
    ? substituteInObject(request.headers, variables)
    : request.headers

  // Substitute in body (if it's a string)
  const substitutedBody = typeof request.body === 'string'
    ? substituteVariablesInString(request.body, variables)
    : request.body

  return {
    ...request,
    url: substitutedUrl,
    headers: substitutedHeaders,
    body: substitutedBody,
  }
}

/**
 * Utility function to check if a string contains any variable placeholders
 */
export function hasVariables(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false
  }
  return VARIABLE_PATTERN.test(text)
}

/**
 * Utility function to extract all variable names from a string
 */
export function extractVariableNames(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return []
  }

  const matches = text.matchAll(VARIABLE_PATTERN)
  const names: string[] = []

  for (const match of matches) {
    if (match[1] && !names.includes(match[1])) {
      names.push(match[1])
    }
  }

  return names
}
