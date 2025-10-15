import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import Workspace from '@/lib/models/Workspace'
import type { CreateWorkspaceDto, IWorkspace, ApiError } from '@/lib/types'

// GET all workspaces
export async function GET(): Promise<NextResponse<IWorkspace[] | ApiError>> {
  try {
    await connectDB()
    const workspaces = await Workspace.find().sort({ createdAt: -1 }).lean<IWorkspace[]>().exec()
    return NextResponse.json(workspaces.map(w => ({ ...w, _id: w._id.toString() })) as IWorkspace[])
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

// POST create new workspace
export async function POST(request: Request): Promise<NextResponse<IWorkspace | ApiError>> {
  try {
    await connectDB()
    const body: CreateWorkspaceDto = await request.json()
    const workspace = await Workspace.create(body)
    const workspaceObj = workspace.toObject()
    return NextResponse.json({ ...workspaceObj, _id: workspaceObj._id.toString() }, { status: 201 })
  } catch (error) {
    console.error('Error creating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
