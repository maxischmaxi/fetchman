import mongoose, { Schema, Document, Types } from 'mongoose'
import type {
  IRequestDocument,
  HttpMethod,
  IHeader,
  IQueryParam,
  IAuth,
  AuthType,
  BodyType
} from '@/lib/types'

// Extend the shared interface with Mongoose Document
export interface IRequest extends Document {
  _id: Types.ObjectId
  name: string
  method: HttpMethod
  url: string
  workspaceId: Types.ObjectId
  folderId?: Types.ObjectId
  headers: IHeader[]
  queryParams: IQueryParam[]
  auth?: IAuth
  body?: string
  bodyType?: BodyType
  description?: string
  createdAt: Date
  updatedAt: Date
}

const HeaderSchema = new Schema<IHeader>({
  key: { type: String, required: true },
  value: { type: String, required: true },
  enabled: { type: Boolean, default: true },
}, { _id: false })

const QueryParamSchema = new Schema<IQueryParam>({
  key: { type: String, required: true },
  value: { type: String, required: true },
  enabled: { type: Boolean, default: true },
}, { _id: false })

const AuthSchema = new Schema<IAuth>({
  type: {
    type: String,
    enum: ['none', 'bearer', 'basic', 'api-key', 'oauth2'],
    default: 'none',
  },
  bearer: Schema.Types.Mixed,
  basic: Schema.Types.Mixed,
  apiKey: Schema.Types.Mixed,
  oauth2: Schema.Types.Mixed,
}, { _id: false, minimize: false })

const RequestSchema = new Schema<IRequest>({
  name: {
    type: String,
    required: [true, 'Request name is required'],
    trim: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] satisfies HttpMethod[],
    default: 'GET',
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
  },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace ID is required'],
  },
  folderId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
  },
  headers: [HeaderSchema],
  queryParams: [QueryParamSchema],
  auth: {
    type: AuthSchema,
    default: () => ({ type: 'none' }),
  },
  body: String,
  bodyType: {
    type: String,
    enum: ['none', 'json', 'text', 'xml', 'form-data', 'x-www-form-urlencoded'] satisfies BodyType[],
    default: 'none',
  },
  description: String,
}, {
  timestamps: true,
})

// Delete the model from cache to force reload with new schema
if (mongoose.models.Request) {
  delete mongoose.models.Request
}

export default mongoose.model<IRequest>('Request', RequestSchema)
