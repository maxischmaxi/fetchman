import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import Workspace from '@/lib/models/Workspace'
import Folder from '@/lib/models/Folder'
import Request from '@/lib/models/Request'

// GET single workspace
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()
    const workspace = await Workspace.findById(id)

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(workspace)
  } catch (error) {
    console.error('Error fetching workspace:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    )
  }
}

// PUT update workspace
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()
    const body = await request.json()
    const workspace = await Workspace.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    )

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(workspace)
  } catch (error) {
    console.error('Error updating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    )
  }
}

// DELETE workspace
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()

    // Delete all related folders and requests
    await Folder.deleteMany({ workspaceId: id })
    await Request.deleteMany({ workspaceId: id })

    const workspace = await Workspace.findByIdAndDelete(id)

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Workspace deleted successfully' })
  } catch (error) {
    console.error('Error deleting workspace:', error)
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    )
  }
}
