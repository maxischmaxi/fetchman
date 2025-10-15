import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import RequestModel from '@/lib/models/Request'
import { Types } from 'mongoose'
import type { CreateRequestDto, IRequest, ApiError } from '@/lib/types'

// GET all requests (optionally filtered)
export async function GET(request: Request): Promise<NextResponse<IRequest[] | ApiError>> {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const folderId = searchParams.get('folderId')

    const query: Record<string, unknown> = {}

    if (workspaceId) {
      if (!Types.ObjectId.isValid(workspaceId)) {
        return NextResponse.json(
          { error: 'Invalid workspaceId' },
          { status: 400 }
        )
      }
      query.workspaceId = new Types.ObjectId(workspaceId)
    }

    if (folderId) {
      if (!Types.ObjectId.isValid(folderId)) {
        return NextResponse.json(
          { error: 'Invalid folderId' },
          { status: 400 }
        )
      }
      query.folderId = new Types.ObjectId(folderId)
    }

    const requests = await RequestModel.find(query).sort({ createdAt: -1 }).lean<IRequest[]>().exec()

    return NextResponse.json(requests.map(r => ({
      ...r,
      _id: r._id.toString(),
      workspaceId: r.workspaceId.toString(),
      folderId: r.folderId?.toString()
    })) as IRequest[])
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

// POST create new request
export async function POST(request: Request): Promise<NextResponse<IRequest | ApiError>> {
  try {
    await connectDB()
    const body: CreateRequestDto = await request.json()
    const newRequest = await RequestModel.create(body)
    const requestObj = newRequest.toObject()
    return NextResponse.json({
      ...requestObj,
      _id: requestObj._id.toString(),
      workspaceId: requestObj.workspaceId.toString(),
      folderId: requestObj.folderId?.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    )
  }
}
