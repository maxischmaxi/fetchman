import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import Request from '@/lib/models/Request'

// GET all requests (optionally filtered)
export async function GET(request: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const folderId = searchParams.get('folderId')

    const query: Record<string, unknown> = {}
    if (workspaceId) query.workspaceId = workspaceId
    if (folderId) query.folderId = folderId

    const requests = await Request.find(query).sort({ createdAt: -1 })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

// POST create new request
export async function POST(request: Request) {
  try {
    await connectDB()
    const body = await request.json()
    const newRequest = await Request.create(body)
    return NextResponse.json(newRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    )
  }
}
