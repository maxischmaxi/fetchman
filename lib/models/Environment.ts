import mongoose, { Schema, Document } from 'mongoose'

export interface IEnvironment extends Document {
  name: string
  variables: Record<string, string>
  description?: string
  createdAt: Date
  updatedAt: Date
}

const EnvironmentSchema = new Schema<IEnvironment>({
  name: {
    type: String,
    required: [true, 'Environment name is required'],
    trim: true,
    unique: true,
  },
  variables: {
    type: Map,
    of: String,
    default: {},
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
})

export default mongoose.models.Environment || mongoose.model<IEnvironment>('Environment', EnvironmentSchema)
