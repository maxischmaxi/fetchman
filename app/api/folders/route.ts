import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import Folder from '@/lib/models/Folder'

// GET all folders (optionally filtered by workspaceId)
export async function GET(request: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    const query = workspaceId ? { workspaceId } : {}
    const folders = await Folder.find(query).sort({ createdAt: -1 })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

// POST create new folder
export async function POST(request: Request) {
  try {
    await connectDB()
    const body = await request.json()
    const folder = await Folder.create(body)
    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
