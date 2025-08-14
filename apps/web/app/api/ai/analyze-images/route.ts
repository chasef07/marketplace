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

interface ImageAnalysisData {
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
    const images: ImageAnalysisData[] = []
    
    // Handle both single image ('image') and multiple images ('image0', 'image1', etc.)
    const singleImage = formData.get('image') as File
    if (singleImage) {
      // Single image upload
      const bytes = await singleImage.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64Image = buffer.toString('base64')
      const mimeType = singleImage.type

      // Upload to Supabase Storage
      const sanitizedName = singleImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${Date.now()}-${sanitizedName}`
      const { error: uploadError } = await supabase.storage
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
        order: 1,
        is_primary: true
      })
    } else {
      // Multiple images upload (up to 3)
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
        const { error: uploadError } = await supabase.storage
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
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    // Create image content for OpenAI - include all images
    const imageContent = images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
        detail: "high" as const
      }
    }))

    // Analyze images with OpenAI GPT-4 Vision
    const imageDescriptions = images.length > 1 
      ? `Here are ${images.length} images of the same home goods item from different angles.` 
      : 'Here is an image of a home goods item.'
    
    const prompt = `You are an expert home goods appraiser and interior designer. ${imageDescriptions} Analyze these home goods images and provide detailed information in the following JSON format:

    IMPORTANT: For furniture_type, categorize any home goods item using one of these values. Use the most appropriate category, or 'other' for items that don't fit standard categories:
    
    Furniture: couch, dining_table, bookshelf, chair, desk, bed, dresser, coffee_table, nightstand, cabinet
    Home Goods: musical_instrument, home_decor, appliance, electronics, artwork, lighting, textiles, storage_container, other

    Accept and analyze ANY home goods item including but not limited to: furniture, musical instruments (drums, guitars, pianos, etc.), home decor, appliances, electronics, artwork, lighting, rugs, containers, and household items.

    {
      "furniture_type": "Choose the most appropriate category from: couch, dining_table, bookshelf, chair, desk, bed, dresser, coffee_table, nightstand, cabinet, musical_instrument, home_decor, appliance, electronics, artwork, lighting, textiles, storage_container, other",
      "estimated_dimensions": "approximate size description",
      "key_features": ["list", "of", "notable", "features", "from", "all", "angles"],
      "suggested_starting_price": "reasonable starting price in USD",
      "suggested_min_price": "minimum acceptable price in USD",
      "quick_sale_price": "price for quick sale in USD",
      "market_price": "current market value in USD",
      "premium_price": "high-end asking price in USD",
      "pricing_explanation": "brief explanation of pricing rationale based on quality and features visible in all images",
      "title": "compelling marketplace listing title",
      "description": "detailed, appealing description for buyers highlighting features visible across the images"
    }

    Base pricing on apparent quality and current market trends for this type of home goods item. Consider all angles and details visible across the provided images. Be inclusive and helpful - analyze any home goods item that someone might want to buy or sell.`

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

    interface Analysis {
      furniture_type: string;
      style: string;
      material: string;
      brand: string;
      color: string;
      estimated_dimensions: string;
      key_features: string[];
    }

    interface Pricing {
      suggested_starting_price: number;
      suggested_min_price: number;
      quick_sale_price: number;
      market_price: number;
      premium_price: number;
      pricing_explanation: string;
    }

    interface Listing {
      title: string;
      description: string;
      furniture_type: string;
    }

    interface ResponseImageData {
      filename: string;
      order: number;
      is_primary: boolean;
    }

    const responseData: {
      success: boolean;
      analysis: Analysis;
      pricing: Pricing;
      listing: Listing;
      images: ResponseImageData[];
      image_filename?: string;
    } = {
      success: true,
      analysis: {
        furniture_type: analysis.furniture_type,
        style: analysis.style || 'Unknown',
        material: analysis.material || 'Unknown',
        brand: analysis.brand || 'Unknown',
        color: analysis.color || 'Unknown',
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
    }

    // For backward compatibility with single image uploads
    if (images.length === 1) {
      responseData.image_filename = images[0].filename
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze images' },
      { status: 500 }
    )
  }
  });
}