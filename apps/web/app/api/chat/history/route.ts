import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'


export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')

    // Since we don't persist chat history in the database currently,
    // return empty messages for fresh conversation start
    // In the future, we can store conversations in a chat_messages table
    
    return NextResponse.json({
      messages: [],
      conversation_id: conversationId || 1, // Default conversation ID
      conversation: {
        id: parseInt(conversationId || '1'),
        seller_id: user?.id || 'unknown',
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

  } catch (error: unknown) {
    console.error('Chat history API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chat history'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}