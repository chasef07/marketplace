import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProfileView from '@/components/profile/profile-view'
import { createSupabaseServerClient } from "@/lib/supabase-server"

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username: rawUsername } = await params
  // Ensure username is properly decoded
  const username = decodeURIComponent(rawUsername)
  const supabase = createSupabaseServerClient()
  
  // Try to find profile by username first, then by email if that fails
  let { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  // If not found by username, try by email (for cases where email is used as username)
  if (!profile && username.includes('@')) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('username')
      .eq('email', username)
      .eq('is_active', true)
      .single()
    
    profile = profileByEmail
  }

  if (!profile) {
    return {
      title: 'Profile not found',
    }
  }

  return {
    title: `${profile.username} - Marketplace Profile`,
    description: `View ${profile.username}'s furniture listings and profile.`,
    openGraph: {
      title: `${profile.username} - Marketplace Profile`,
      description: `View ${profile.username}'s furniture listings and profile.`,
      type: 'profile',
    },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username: rawUsername } = await params
  // Ensure username is properly decoded
  const username = decodeURIComponent(rawUsername)
  
  
  // Pre-validate that the profile exists
  const supabase = createSupabaseServerClient()
  
  // Try to find profile by username first, then by email if that fails
  let { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  // If not found by username, try by email (for cases where email is used as username)
  if (!profile && username.includes('@')) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('username')
      .eq('email', username)
      .eq('is_active', true)
      .single()
    
    profile = profileByEmail
  }

  if (!profile) {
    notFound()
  }

  return <ProfileView username={username} />
}