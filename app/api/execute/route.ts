import { NextResponse } from 'next/server'

// Execute HTTP request
export async function POST(request: Request) {
  try {
    const { method, url, headers, body } = await request.json()

    const startTime = Date.now()

    // Build fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: headers || {},
    }

    // Add body for methods that support it
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = body
    }

    // Execute the request
    const response = await fetch(url, fetchOptions)
    const endTime = Date.now()

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const size = buffer.byteLength

    let responseBody: unknown
    let bodyType: 'json' | 'text' | 'html' | 'image' | 'binary' = 'binary'
    let encoding: 'utf8' | 'base64' | undefined
    let bodyText: string | undefined

    if (size === 0) {
      responseBody = ''
      bodyType = 'text'
      encoding = 'utf8'
      bodyText = ''
    } else if (contentType.includes('application/json')) {
      const text = buffer.toString('utf8')
      bodyText = text
      try {
        responseBody = JSON.parse(text)
        bodyType = 'json'
        encoding = 'utf8'
      } catch {
        responseBody = text
        bodyType = 'text'
        encoding = 'utf8'
      }
    } else if (contentType.includes('text/html')) {
      const text = buffer.toString('utf8')
      responseBody = text
      bodyText = text
      bodyType = 'html'
      encoding = 'utf8'
    } else if (contentType.startsWith('text/')) {
      const text = buffer.toString('utf8')
      responseBody = text
      bodyText = text
      bodyType = 'text'
      encoding = 'utf8'
    } else if (contentType.startsWith('image/')) {
      responseBody = buffer.toString('base64')
      bodyType = 'image'
      encoding = 'base64'
    } else {
      responseBody = buffer.toString('base64')
      bodyType = 'binary'
      encoding = 'base64'
    }

    if (bodyType === 'binary' && response.headers.get('content-disposition')?.includes('filename')) {
      encoding = 'base64'
    }

    // Convert headers to object
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      bodyType,
      bodyText,
      encoding,
      contentType,
      time: endTime - startTime,
      size,
    })
  } catch (error) {
    console.error('Error executing request:', error)
    return NextResponse.json(
      {
        error: 'Failed to execute request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
