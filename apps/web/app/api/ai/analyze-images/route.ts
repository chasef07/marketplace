import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('OpenAI API key is not configured')
}

const supabase = createSupabaseServerClient()

interface ImageData {
  filename: string
  base64: string
  mimeType: string
  order: number
  is_primary: boolean
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.imageAnalysis, async () => {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const images: ImageData[] = []
    
    // Process multiple images (up to 3)
    for (let i = 0; i < 3; i++) {
      const image = formData.get(`image${i}`) as File
      if (image) {
        // Convert image to base64
        const bytes = await image.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')
        const mimeType = image.type

        // Upload to Supabase Storage - sanitize filename
        const sanitizedName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${Date.now()}-${i}-${sanitizedName}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('furniture-images')
          .upload(fileName, buffer, {
            contentType: mimeType,
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError.message)
          return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
        }

        images.push({
          filename: fileName,
          base64: base64Image,
          mimeType: mimeType,
          order: i + 1,
          is_primary: i === 0 // First image is primary
        })
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    // Create image content for OpenAI - include all images
    const imageContent = images.map((img, index) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
        detail: "high" as const
      }
    }))

    // Analyze images with OpenAI GPT-4 Vision
    const imageDescriptions = images.length > 1 
      ? `Here are ${images.length} images of the same furniture piece from different angles.` 
      : 'Here is an image of a furniture piece.'
    
    const prompt = `You are an expert furniture appraiser and interior designer. ${imageDescriptions} Analyze these furniture images and provide detailed information in the following JSON format:

    IMPORTANT: For furniture_type, use ONLY one of these exact values: couch, dining_table, bookshelf, chair, desk, bed, dresser, coffee_table, nightstand, cabinet, other

    {
      "furniture_type": "MUST be one of: couch, dining_table, bookshelf, chair, desk, bed, dresser, coffee_table, nightstand, cabinet, other",
      "style": "design style (modern, vintage, traditional, etc.)",
      "material": "primary material (leather, wood, fabric, etc.)",
      "brand": "brand if identifiable, otherwise 'Unknown'",
      "color": "primary color or pattern",
      "estimated_dimensions": "approximate size description",
      "key_features": ["list", "of", "notable", "features", "from", "all", "angles"],
      "suggested_starting_price": "reasonable starting price in USD",
      "suggested_min_price": "minimum acceptable price in USD",
      "quick_sale_price": "price for quick sale in USD",
      "market_price": "current market value in USD",
      "premium_price": "high-end asking price in USD",
      "pricing_explanation": "brief explanation of pricing rationale based on style, quality, and features visible in all images",
      "title": "compelling marketplace listing title",
      "description": "detailed, appealing description for buyers highlighting features visible across the images"
    }

    Base pricing on style, apparent quality, and current furniture market trends. Consider all angles and details visible across the provided images.`

    let response
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageContent
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      })
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      return NextResponse.json({ error: 'AI analysis service unavailable' }, { status: 500 })
    }

    const aiContent = response.choices[0]?.message?.content
    if (!aiContent) {
      console.error('No response from OpenAI')
      return NextResponse.json({ error: 'No response from AI service' }, { status: 500 })
    }

    let analysis
    try {
      // Clean the AI response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim()
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      analysis = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw AI content:', aiContent)
      return NextResponse.json({ error: 'Failed to parse AI analysis' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis: {
        furniture_type: analysis.furniture_type,
        style: analysis.style,
        material: analysis.material,
        brand: analysis.brand,
        color: analysis.color,
        estimated_dimensions: analysis.estimated_dimensions,
        key_features: analysis.key_features,
      },
      pricing: {
        suggested_starting_price: analysis.suggested_starting_price,
        suggested_min_price: analysis.suggested_min_price,
        quick_sale_price: analysis.quick_sale_price,
        market_price: analysis.market_price,
        premium_price: analysis.premium_price,
        pricing_explanation: analysis.pricing_explanation,
      },
      listing: {
        title: analysis.title,
        description: analysis.description,
        furniture_type: analysis.furniture_type,
      },
      images: images.map(img => ({
        filename: img.filename,
        order: img.order,
        is_primary: img.is_primary
      }))
    })
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze images' },
      { status: 500 }
    )
  }
  });
}