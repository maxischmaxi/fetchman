import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongoose'
import Folder from '@/lib/models/Folder'
import { Types } from 'mongoose'
import type { CreateFolderDto, IFolder, ApiError } from '@/lib/types'

// GET all folders (optionally filtered by workspaceId)
export async function GET(request: Request): Promise<NextResponse<IFolder[] | ApiError>> {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    const query: Record<string, unknown> = {}
    if (workspaceId) {
      if (!Types.ObjectId.isValid(workspaceId)) {
        return NextResponse.json({ error: 'Invalid workspaceId' }, { status: 400 })
      }
      query.workspaceId = new Types.ObjectId(workspaceId)
    }
    const folders = await Folder.find(query).sort({ createdAt: -1 }).lean<IFolder[]>().exec()

    return NextResponse.json(folders.map(f => ({
      ...f,
      _id: f._id.toString(),
      workspaceId: f.workspaceId.toString(),
      parentFolderId: f.parentFolderId?.toString()
    })) as IFolder[])
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

// POST create new folder
export async function POST(request: Request): Promise<NextResponse<IFolder | ApiError>> {
  try {
    await connectDB()
    const body: CreateFolderDto = await request.json()
    const folder = await Folder.create(body)
    const folderObj = folder.toObject()
    return NextResponse.json({
      ...folderObj,
      _id: folderObj._id.toString(),
      workspaceId: folderObj.workspaceId.toString(),
      parentFolderId: folderObj.parentFolderId?.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
