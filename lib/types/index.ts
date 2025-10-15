/**
 * Shared types for Fetchman
 * These types are used across both frontend and backend
 */

import { Types } from 'mongoose'

// ============================================================================
// HTTP Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface IHeader {
  key: string
  value: string
  enabled: boolean
}

export interface IQueryParam {
  key: string
  value: string
  enabled: boolean
}

// ============================================================================
// Authentication Types
// ============================================================================

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2'

export interface IAuth {
  type: AuthType
  bearer?: {
    token: string
  }
  basic?: {
    username: string
    password: string
  }
  apiKey?: {
    key: string
    value: string
    addTo: 'header' | 'query'
  }
  oauth2?: {
    accessToken: string
  }
}

// ============================================================================
// Body Types
// ============================================================================

export type BodyType = 'none' | 'json' | 'text' | 'xml' | 'form-data' | 'x-www-form-urlencoded'

// ============================================================================
// Workspace Types
// ============================================================================

export interface IWorkspace {
  _id: string
  name: string
  description?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IWorkspaceDocument {
  _id: Types.ObjectId
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorkspaceDto {
  name: string
  description?: string
}

export interface UpdateWorkspaceDto {
  name?: string
  description?: string
}

// ============================================================================
// Folder Types
// ============================================================================

export interface IFolder {
  _id: string
  name: string
  workspaceId: string
  parentFolderId?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IFolderDocument {
  _id: Types.ObjectId
  name: string
  workspaceId: Types.ObjectId
  parentFolderId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface CreateFolderDto {
  name: string
  workspaceId: string
  parentFolderId?: string
}

export interface UpdateFolderDto {
  name?: string
  parentFolderId?: string
}

// ============================================================================
// Request Types
// ============================================================================

export interface IRequest {
  _id: string
  name: string
  method: HttpMethod
  url: string
  workspaceId: string
  folderId?: string
  headers: IHeader[]
  queryParams: IQueryParam[]
  auth?: IAuth
  body?: string
  bodyType?: BodyType
  description?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IRequestDocument {
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

export interface CreateRequestDto {
  name: string
  method: HttpMethod
  url: string
  workspaceId: string
  folderId?: string
  headers?: IHeader[]
  queryParams?: IQueryParam[]
  auth?: IAuth
  body?: string
  bodyType?: BodyType
  description?: string
}

export interface UpdateRequestDto {
  name?: string
  method?: HttpMethod
  url?: string
  folderId?: string
  headers?: IHeader[]
  queryParams?: IQueryParam[]
  auth?: IAuth
  body?: string
  bodyType?: BodyType
  description?: string
}

// ============================================================================
// Environment Types
// ============================================================================

export interface IEnvironmentVariable {
  key: string
  value: string
  enabled: boolean
}

export interface IEnvironment {
  _id: string
  name: string
  workspaceId: string
  variables: IEnvironmentVariable[]
  createdAt?: Date
  updatedAt?: Date
}

export interface IEnvironmentDocument {
  _id: Types.ObjectId
  name: string
  workspaceId: Types.ObjectId
  variables: IEnvironmentVariable[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateEnvironmentDto {
  name: string
  workspaceId: string
  variables?: IEnvironmentVariable[]
}

export interface UpdateEnvironmentDto {
  name?: string
  variables?: IEnvironmentVariable[]
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  error: string
  details?: unknown
}

export interface ApiSuccess<T = unknown> {
  data: T
  message?: string
}

// ============================================================================
// Utility Types
// ============================================================================

export type StringId<T> = Omit<T, '_id'> & { _id: string }
export type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date }
