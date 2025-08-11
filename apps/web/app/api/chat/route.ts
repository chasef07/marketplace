import { NextRequest, NextResponse } from 'next/server'

// Redirect to the new simplified chat endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Forward the request to the simplified chat API
    const response = await fetch(`${request.nextUrl.origin}/api/chat/simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    
    return NextResponse.json(data, { status: response.status })

  } catch (error: any) {
    console.error('Chat redirect error:', error)
    return NextResponse.json(
      { error: 'Chat service unavailable' },
      { status: 500 }
    )
  }
}