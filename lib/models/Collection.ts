import mongoose, { Schema, Document } from 'mongoose'

export interface IRequest {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  url: string
  headers?: Record<string, string>
  body?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface ICollection extends Document {
  name: string
  description?: string
  requests: IRequest[]
  createdAt: Date
  updatedAt: Date
}

const RequestSchema = new Schema<IRequest>({
  name: {
    type: String,
    required: [true, 'Request name is required'],
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    default: 'GET',
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
  },
  headers: {
    type: Map,
    of: String,
  },
  body: String,
  description: String,
}, {
  timestamps: true,
})

const CollectionSchema = new Schema<ICollection>({
  name: {
    type: String,
    required: [true, 'Collection name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  requests: [RequestSchema],
}, {
  timestamps: true,
})

export default mongoose.models.Collection || mongoose.model<ICollection>('Collection', CollectionSchema)
