'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'

export default function MyProfilePage() {
  const [loading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const redirectToProfile = async () => {
      try {
        // Using shared supabase instance
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/auth')
          return
        }

        // Get user's profile to get their username
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()

        if (error || !profile) {
          console.error('Error fetching profile:', error)
          router.push('/auth')
          return
        }

        // Redirect to the user's profile page
        router.push(`/profile/${profile.username}`)
      } catch (error) {
        console.error('Error:', error)
        router.push('/auth')
      }
    }

    redirectToProfile()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-8 text-center">
        <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Redirecting...</h3>
        <p className="text-gray-500">Taking you to your profile</p>
      </Card>
    </div>
  )
}