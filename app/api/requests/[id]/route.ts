import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import RequestModel from '@/lib/models/Request'
import { Types } from 'mongoose'
import type { UpdateRequestDto, IRequest, ApiError } from '@/lib/types'

// GET single request
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<IRequest | ApiError>> {
  try {
    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()
    const req = await RequestModel.findById(id).lean<IRequest>().exec()

    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...req,
      _id: req._id.toString(),
      workspaceId: req.workspaceId.toString(),
      folderId: req.folderId?.toString()
    } as IRequest)
  } catch (error) {
    console.error('Error fetching request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    )
  }
}

// PUT update request
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<IRequest | ApiError>> {
  try {
    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()
    const body: UpdateRequestDto = await request.json()

    const doc = await RequestModel.findById(id)
    if (!doc) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Update all fields
    Object.assign(doc, body)

    // Mark auth as modified if it exists (for Mixed type)
    if (body.auth) {
      doc.markModified('auth')
    }

    await doc.save()
    const savedDoc = doc.toObject()

    return NextResponse.json({
      ...savedDoc,
      _id: savedDoc._id.toString(),
      workspaceId: savedDoc.workspaceId.toString(),
      folderId: savedDoc.folderId?.toString()
    })
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    )
  }
}

// DELETE request
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ message: string } | ApiError>> {
  try {
    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()

    const deletedRequest = await RequestModel.findByIdAndDelete(id)

    if (!deletedRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Request deleted successfully' })
  } catch (error) {
    console.error('Error deleting request:', error)
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    )
  }
}
