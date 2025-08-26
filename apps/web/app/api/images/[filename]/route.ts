import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    
    // Get signed URL for the image from Supabase Storage
    const { data, error } = await supabase.storage
      .from('furniture-images')
      .createSignedUrl(filename, 60) // 60 seconds expiry
    
    if (error) {
      console.error('Error getting signed URL:', error)
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Redirect to the signed URL
    return NextResponse.redirect(data.signedUrl)

  } catch (error) {
    console.error('Error serving image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}