import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import OpenAI from 'openai'

interface ItemWithProfile {
  id: number
  seller_id: string
  name: string
  description: string | null
  furniture_type: string
  starting_price: number
  condition: string | null
  image_filename: string | null
  is_available: boolean
  material: string | null
  brand: string | null
  color: string | null
  created_at: string
  profiles: {
    id: string
    username: string
  } | null
}

interface ItemWithSimilarity extends ItemWithProfile {
  similarity: number
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { query, limit = 20, offset = 0 } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Get all available items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        *,
        profiles:seller_id (
          id,
          username
        )
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // Generate embeddings for each item and calculate similarity
    const itemsWithSimilarity: ItemWithSimilarity[] = []
    
    for (const item of items) {
      try {
        // Create search context for the item
        const itemContext = `${item.name} ${item.description || ''} ${item.furniture_type} ${item.condition || ''} $${item.starting_price} ${item.material || ''} ${item.brand || ''} ${item.color || ''}`

        const itemEmbeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: itemContext,
        })

        const itemEmbedding = itemEmbeddingResponse.data[0].embedding

        // Calculate cosine similarity
        const similarity = cosineSimilarity(queryEmbedding, itemEmbedding)
        
        if (similarity > 0.7) { // Minimum similarity threshold
          itemsWithSimilarity.push({
            ...item,
            similarity_score: similarity
          })
        }
      } catch (embeddingError) {
        console.error('Error generating item embedding:', embeddingError)
        // Continue with next item
      }
    }

    // Sort by similarity score (descending)
    itemsWithSimilarity.sort((a, b) => b.similarity - a.similarity)

    // Apply pagination
    const paginatedItems = itemsWithSimilarity.slice(offset, offset + limit)

    // Generate query interpretation using AI
    let queryInterpretation = `Found ${itemsWithSimilarity.length} items matching "${query}"`
    
    try {
      const interpretationResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: `Interpret this furniture search query in 1 sentence: "${query}"`
        }],
        max_tokens: 50,
        temperature: 0.3,
      })

      const interpretation = interpretationResponse.choices[0]?.message?.content
      if (interpretation) {
        queryInterpretation = interpretation.trim()
      }
    } catch (interpretationError) {
      console.error('Error generating interpretation:', interpretationError)
    }

    return NextResponse.json({
      success: true,
      items: paginatedItems,
      total_count: itemsWithSimilarity.length,
      query_interpretation: queryInterpretation
    })
  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}