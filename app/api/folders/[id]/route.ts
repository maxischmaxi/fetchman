import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import Folder from '@/lib/models/Folder'
import RequestModel from '@/lib/models/Request'
import { Types } from 'mongoose'
import type { UpdateFolderDto, IFolder, ApiError } from '@/lib/types'

// GET single folder
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<IFolder | ApiError>> {
  try {
    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()
    const folder = await Folder.findById(id).lean<IFolder>().exec()

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...folder,
      _id: folder._id.toString(),
      workspaceId: folder.workspaceId.toString(),
      parentFolderId: folder.parentFolderId?.toString()
    } as IFolder)
  } catch (error) {
    console.error('Error fetching folder:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    )
  }
}

// PUT update folder
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<IFolder | ApiError>> {
  try {
    const { id } = await params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()
    const body: UpdateFolderDto = await request.json()
    const folder = await Folder.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).lean<IFolder>().exec()

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...folder,
      _id: folder._id.toString(),
      workspaceId: folder.workspaceId.toString(),
      parentFolderId: folder.parentFolderId?.toString()
    } as IFolder)
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    )
  }
}

// DELETE folder
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

    // Delete all requests in this folder
    await RequestModel.deleteMany({ folderId: new Types.ObjectId(id) })

    const folder = await Folder.findByIdAndDelete(id)

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Folder deleted successfully' })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
