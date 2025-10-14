import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import WorkspaceEnvironment from '@/lib/models/WorkspaceEnvironment'
import { decryptValue, encryptValue } from '@/lib/security/encryption'

type ParamsPromise = Promise<{ id: string }>

const sanitizeVariables = (raw: unknown) => {
  if (!Array.isArray(raw)) return []

  const seenKeys = new Set<string>()

  return raw
    .map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as Record<string, unknown>).key !== 'string' ||
        typeof (item as Record<string, unknown>).value !== 'string'
      ) {
        return null
      }

      const key = ((item as Record<string, unknown>).key as string).trim()
      if (!key) return null

      if (seenKeys.has(key)) {
        return null
      }
      seenKeys.add(key)

      const value = (item as Record<string, unknown>).value as string
      const isSecret = Boolean((item as Record<string, unknown>).isSecret)

      return { key, value, isSecret }
    })
    .filter((item): item is { key: string; value: string; isSecret: boolean } => Boolean(item))
}

export async function GET(
  _request: Request,
  { params }: { params: ParamsPromise },
) {
  try {
    const { id } = await params
    await connectDB()

    const doc = await WorkspaceEnvironment.findOne({ workspaceId: id }).lean()
    if (!doc) {
      return NextResponse.json({ variables: [] })
    }

    const variables = doc.variables.map((variable) => {
      try {
        return {
          key: variable.key,
          value: decryptValue(variable.value),
          isSecret: variable.isSecret,
        }
      } catch (error) {
        console.error(`Failed to decrypt environment variable "${variable.key}":`, error)
        return {
          key: variable.key,
          value: '',
          isSecret: variable.isSecret,
          error: 'decryption_failed',
        }
      }
    })

    return NextResponse.json({ variables })
  } catch (error) {
    console.error('Error fetching workspace environment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace environment' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: ParamsPromise },
) {
  try {
    const { id } = await params
    await connectDB()

    const body = await request.json().catch(() => ({}))
    const incoming = sanitizeVariables(body?.variables)

    const encryptedVariables = incoming.map(({ key, value, isSecret }) => ({
      key,
      value: encryptValue(value),
      isSecret,
    }))

    const doc = await WorkspaceEnvironment.findOneAndUpdate(
      { workspaceId: id },
      { workspaceId: id, variables: encryptedVariables },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean()

    const variables = doc.variables.map((variable) => ({
      key: variable.key,
      value: decryptValue(variable.value),
      isSecret: variable.isSecret,
    }))

    return NextResponse.json({ variables })
  } catch (error) {
    console.error('Error updating workspace environment:', error)
    return NextResponse.json(
      { error: 'Failed to update workspace environment' },
      { status: 500 },
    )
  }
}
