import { NextResponse } from 'next/server'
import clientPromise from '@/lib/db/mongodb'

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'not configured',
          error: 'MONGODB_URI environment variable is not set'
        },
        { status: 503 }
      )
    }

    const client = await clientPromise
    const db = client.db('fetchman')

    // Ping the database to test connection
    await db.command({ ping: 1 })

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}
