import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import Workspace from '@/lib/models/Workspace'

// GET all workspaces
export async function GET() {
  try {
    await connectDB()
    const workspaces = await Workspace.find().sort({ createdAt: -1 })
    return NextResponse.json(workspaces)
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

// POST create new workspace
export async function POST(request: Request) {
  try {
    await connectDB()
    const body = await request.json()
    const workspace = await Workspace.create(body)
    return NextResponse.json(workspace, { status: 201 })
  } catch (error) {
    console.error('Error creating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
