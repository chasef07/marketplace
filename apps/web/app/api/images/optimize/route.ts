import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'

interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  blur?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const options = JSON.parse(formData.get('options') as string || '{}') as ImageOptimizationOptions
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    let sharpInstance = sharp(buffer)

    // Resize if dimensions provided
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: 'cover',
        position: 'center'
      })
    }

    // Apply blur for placeholder generation
    if (options.blur) {
      sharpInstance = sharpInstance.blur(10)
    }

    // Set quality and format
    const quality = options.quality || 85
    const format = options.format || 'webp'

    let outputBuffer: Buffer
    switch (format) {
      case 'webp':
        outputBuffer = await sharpInstance.webp({ quality }).toBuffer()
        break
      case 'jpeg':
        outputBuffer = await sharpInstance.jpeg({ quality }).toBuffer()
        break
      case 'png':
        outputBuffer = await sharpInstance.png({ quality }).toBuffer()
        break
      default:
        outputBuffer = await sharpInstance.webp({ quality }).toBuffer()
    }

    // Generate blur placeholder if requested
    let blurDataURL: string | null = null
    if (options.blur || true) { // Always generate blur placeholder
      const blurBuffer = await sharp(buffer)
        .resize(10, 10, { fit: 'cover' })
        .blur(1)
        .jpeg({ quality: 20 })
        .toBuffer()
      
      blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`
    }

    return NextResponse.json({
      success: true,
      optimizedImage: `data:image/${format};base64,${outputBuffer.toString('base64')}`,
      blurDataURL,
      originalSize: buffer.length,
      optimizedSize: outputBuffer.length,
      compressionRatio: ((buffer.length - outputBuffer.length) / buffer.length * 100).toFixed(2) + '%'
    })

  } catch (error) {
    console.error('Image optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize image' },
      { status: 500 }
    )
  }
}

// Generate blur placeholder from image URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    const width = parseInt(searchParams.get('width') || '10')
    const height = parseInt(searchParams.get('height') || '10')
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
    }

    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch image')
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    
    // Generate small blurred version
    const blurBuffer = await sharp(buffer)
      .resize(width, height, { fit: 'cover' })
      .blur(2)
      .jpeg({ quality: 20 })
      .toBuffer()
    
    const blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`

    return NextResponse.json({
      success: true,
      blurDataURL
    })

  } catch (error) {
    console.error('Blur placeholder generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate blur placeholder' },
      { status: 500 }
    )
  }
}