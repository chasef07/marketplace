import { NextRequest, NextResponse } from 'next/server'
import { ratelimit, withRateLimit } from '@/src/lib/rate-limit'
import { createSupabaseServerClient } from '@/src/lib/supabase'
import OpenAI from 'openai'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.imageAnalysis, async () => {
    try {
      console.log('🤖 AI Image Analysis - Starting request processing')
      
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OpenAI API key not configured')
        return NextResponse.json({ 
          error: 'AI analysis service not configured',
          details: 'OpenAI API key missing' 
        }, { status: 500 })
      }

      // Check if user is authenticated
      const supabase = createSupabaseServerClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.log('⚠️ Unauthenticated request for image analysis')
        return NextResponse.json({ 
          error: 'Authentication required',
          details: 'Please sign in to use AI analysis' 
        }, { status: 401 })
      }

      console.log(`👤 Processing image analysis for user: ${user.id}`)

      // Parse form data
      const formData = await request.formData()
      const file = formData.get('image') as File
      
      if (!file) {
        console.error('❌ No image file provided in request')
        return NextResponse.json({ 
          error: 'No image provided',
          details: 'Please select an image file to analyze' 
        }, { status: 400 })
      }

      console.log(`📁 Processing file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)

      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        console.error(`❌ Invalid file type: ${file.type}`)
        return NextResponse.json({ 
          error: 'Invalid file type',
          details: 'File must be an image (JPEG, PNG, WebP)' 
        }, { status: 400 })
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        console.error(`❌ File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        return NextResponse.json({ 
          error: 'File too large',
          details: 'File size must be less than 10MB' 
        }, { status: 400 })
      }

      // Convert file to base64
      console.log('🔄 Converting image to base64...')
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const imageUrl = `data:${file.type};base64,${base64}`

      // Analyze image with OpenAI GPT-4 Vision
      console.log('🤖 Sending image to OpenAI for analysis...')
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this furniture image and provide a JSON response with the following structure:
{
  "name": "brief descriptive name (max 50 chars)",
  "description": "detailed description focusing on condition, style, and notable features (max 500 chars)",
  "furniture_type": "one of: couch, dining_table, bookshelf, chair, desk, bed, dresser, coffee_table, nightstand, cabinet, other",
  "starting_price": estimated fair market price in USD as a number,
  "condition": "one of: excellent, good, fair, poor",
  "color": "primary color",
  "material": "primary material (wood, metal, fabric, etc.)",
  "style": "furniture style (modern, vintage, rustic, etc.)"
}

Be accurate with pricing based on apparent condition and quality. Focus on what buyers would want to know.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })

      const aiResponse = response.choices[0]?.message?.content
      if (!aiResponse) {
        console.error('❌ No response from OpenAI')
        return NextResponse.json({ 
          error: 'AI analysis failed',
          details: 'No response received from AI service' 
        }, { status: 500 })
      }

      console.log('✅ Received response from OpenAI, parsing...')

      // Parse AI response
      let analysisResult
      try {
        // Clean the response to extract JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error('❌ No JSON found in AI response:', aiResponse.substring(0, 200))
          throw new Error('No JSON found in response')
        }
        
        analysisResult = JSON.parse(jsonMatch[0])
        console.log('📊 Parsed AI analysis result:', analysisResult)
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError)
        console.error('Raw AI response:', aiResponse.substring(0, 500))
        return NextResponse.json({ 
          error: 'Failed to parse AI analysis',
          details: 'AI returned invalid response format' 
        }, { status: 500 })
      }

      // Validate required fields
      const requiredFields = ['name', 'description', 'furniture_type', 'starting_price']
      for (const field of requiredFields) {
        if (!analysisResult[field]) {
          console.error(`❌ Missing required field: ${field}`)
          return NextResponse.json({ 
            error: `Invalid AI analysis result`,
            details: `Missing required field: ${field}` 
          }, { status: 500 })
        }
      }

      // Ensure starting_price is a number
      if (typeof analysisResult.starting_price !== 'number') {
        analysisResult.starting_price = parseFloat(analysisResult.starting_price) || 0
      }

      console.log('✅ AI analysis completed successfully')

      // Return the analysis result
      return NextResponse.json({
        success: true,
        analysis: analysisResult
      })

    } catch (error) {
      console.error('❌ Image analysis error:', error)
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('OpenAI')) {
          return NextResponse.json({
            error: 'AI service unavailable',
            details: 'OpenAI service is currently unavailable'
          }, { status: 503 })
        }
        
        if (error.message.includes('rate limit')) {
          return NextResponse.json({
            error: 'Rate limit exceeded',
            details: 'Too many requests. Please try again later.'
          }, { status: 429 })
        }
      }
      
      return NextResponse.json({
        error: 'Internal server error',
        details: 'An unexpected error occurred while analyzing the image'
      }, { status: 500 })
    }
  })
}