import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

const supabase = createSupabaseServerClient()

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request headers
    const authHeader = request.headers.get('Authorization')
    let user
    
    if (!authHeader) {
      // For GET requests, try to get session from cookie-based auth
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = userData.user
    } else {
      // Use token from Authorization header
      const token = authHeader.replace('Bearer ', '')
      const { data: userData, error: authError } = await supabase.auth.getUser(token)
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = userData.user
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    // If no conversation_id provided, get the seller's conversation
    let targetConversationId = conversationId
    if (!targetConversationId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('seller_id', user.id)
        .single()
      
      targetConversationId = conversation?.id?.toString()
    }

    if (!targetConversationId) {
      return NextResponse.json({
        messages: [],
        conversation_id: null
      })
    }

    // Get conversation messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', targetConversationId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (messagesError) {
      throw new Error('Failed to fetch chat history')
    }

    // Get conversation info
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', targetConversationId)
      .eq('seller_id', user.id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json({
      messages: messages || [],
      conversation_id: targetConversationId,
      conversation: conversation
    })

  } catch (error: any) {
    console.error('Chat history API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}