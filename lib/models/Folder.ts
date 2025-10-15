import mongoose, { Schema, Document, Types } from 'mongoose'
import type { IFolderDocument } from '@/lib/types'

// Extend the shared interface with Mongoose Document
export interface IFolder extends Document {
  _id: Types.ObjectId
  name: string
  workspaceId: Types.ObjectId
  parentFolderId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const FolderSchema = new Schema<IFolder>({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
  },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace ID is required'],
  },
  parentFolderId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
  },
}, {
  timestamps: true,
})

export default mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema)
