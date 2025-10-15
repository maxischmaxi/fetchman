import mongoose, { Schema, Document, Types } from 'mongoose'
import type { IWorkspaceDocument } from '@/lib/types'

// Extend the shared interface with Mongoose Document
export interface IWorkspace extends Document {
  _id: Types.ObjectId
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const WorkspaceSchema = new Schema<IWorkspace>({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
})

export default mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema)
