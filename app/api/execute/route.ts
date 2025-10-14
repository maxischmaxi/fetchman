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

    // Get response body
    const contentType = response.headers.get('content-type')
    let responseBody: unknown

    if (contentType?.includes('application/json')) {
      responseBody = await response.json()
    } else {
      responseBody = await response.text()
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
      time: endTime - startTime,
      size: new Blob([JSON.stringify(responseBody)]).size,
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
