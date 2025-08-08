import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProfileView from '@/components/profile/profile-view'
import { createSupabaseServerClient } from '@/lib/supabase'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const supabase = createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio, username')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  if (!profile) {
    return {
      title: 'Profile not found',
    }
  }

  return {
    title: `${profile.display_name} (@${profile.username})`,
    description: profile.bio || `View ${profile.display_name}'s furniture listings and profile.`,
    openGraph: {
      title: `${profile.display_name} (@${profile.username})`,
      description: profile.bio || `View ${profile.display_name}'s furniture listings and profile.`,
      type: 'profile',
    },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  
  // Pre-validate that the profile exists
  const supabase = createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  if (!profile) {
    notFound()
  }

  return <ProfileView username={username} />
}