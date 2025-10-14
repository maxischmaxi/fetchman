import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IWorkspaceEnvVariable {
  key: string
  value: string
  isSecret: boolean
}

export interface IWorkspaceEnvironment extends Document {
  workspaceId: Types.ObjectId
  variables: IWorkspaceEnvVariable[]
  createdAt: Date
  updatedAt: Date
}

const VariableSchema = new Schema<IWorkspaceEnvVariable>({
  key: {
    type: String,
    required: [true, 'Environment variable key is required'],
    trim: true,
  },
  value: {
    type: String,
    required: [true, 'Environment variable value is required'],
  },
  isSecret: {
    type: Boolean,
    default: false,
  },
}, { _id: false })

const WorkspaceEnvironmentSchema = new Schema<IWorkspaceEnvironment>({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true,
  },
  variables: {
    type: [VariableSchema],
    default: [],
  },
}, {
  timestamps: true,
})

// Reset cached model during hot reloads
if (mongoose.models.WorkspaceEnvironment) {
  delete mongoose.models.WorkspaceEnvironment
}

export default mongoose.model<IWorkspaceEnvironment>('WorkspaceEnvironment', WorkspaceEnvironmentSchema)
