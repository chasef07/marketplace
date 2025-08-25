'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { User, Upload, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/src/lib/supabase'

interface ProfileData {
  id: string
  username: string
  display_name?: string
  bio?: string
  profile_picture_filename?: string
  location_city?: string
  location_state?: string
  zip_code?: string
}

interface ProfileEditProps {
  initialProfile?: ProfileData
}

export default function ProfileEdit({ initialProfile }: ProfileEditProps) {
  const [profile, setProfile] = useState(initialProfile || null)
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    location_city: '',
    location_state: '',
    zip_code: ''
  })
  
  // Single Supabase client instance for this component
  const supabase = createClient()
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(!initialProfile)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const fetchProfile = useCallback(async () => {
    try {
      // Using shared supabase instance
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth')
        return
      }

      const response = await fetch('/api/profiles/me', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load profile')
      }

      const profileData = await response.json()
      setProfile(profileData)
      setFormData({
        display_name: profileData.display_name || '',
        bio: profileData.bio || '',
        location_city: profileData.location_city || '',
        location_state: profileData.location_state || '',
        zip_code: profileData.zip_code || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [supabase.auth, router])

  useEffect(() => {
    if (!initialProfile) {
      fetchProfile()
    } else {
      setFormData({
        display_name: initialProfile.display_name || '',
        bio: initialProfile.bio || '',
        location_city: initialProfile.location_city || '',
        location_state: initialProfile.location_state || '',
        zip_code: initialProfile.zip_code || ''
      })
    }
  }, [initialProfile, fetchProfile])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }

      setProfileImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    }
  }

  const uploadProfileImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      // Using shared supabase instance
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `profile_${profile?.id}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('furniture-images')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      return fileName
    } catch (err) {
      console.error('Upload error:', err)
      throw new Error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Using shared supabase instance
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth')
        return
      }

      const updateData: Record<string, unknown> = { ...formData }

      // Upload new profile image if selected
      if (profileImage) {
        const filename = await uploadProfileImage(profileImage)
        if (filename) {
          updateData.profile_picture_filename = filename
        }
      }

      const response = await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      
      // Redirect to profile view
      router.push(`/profile/${updatedProfile.username}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const getProfileImageUrl = (filename?: string) => {
    if (!filename) return null
    const supabase = createClient()
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-48 mb-6 rounded"></div>
          <Card className="p-8">
            <div className="space-y-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile not found</h3>
          <p className="text-gray-500">Unable to load your profile</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/profile/${profile.username}`)}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <Card className="p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="text-center">
            <div className="relative inline-block">
              {profileImagePreview ? (
                <Image
                  src={profileImagePreview}
                  alt="Profile preview"
                  width={96}
                  height={96}
                  className="rounded-full object-cover"
                />
              ) : profile.profile_picture_filename ? (
                <Image
                  src={getProfileImageUrl(profile.profile_picture_filename)!}
                  alt="Current profile"
                  width={96}
                  height={96}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-2">
              Click to upload a new profile picture
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="How you want to be known"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell others about yourself, your style preferences, or what you're looking for..."
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.location_city}
                onChange={(e) => handleInputChange('location_city', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.location_state}
                onChange={(e) => handleInputChange('location_state', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your state"
              />
            </div>
          </div>

          {/* Zip Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zip Code
            </label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => handleInputChange('zip_code', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345"
              pattern="[0-9]{5}(-[0-9]{4})?"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={saving || uploading || !formData.display_name.trim()}
              className="px-8"
            >
              {saving || uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {uploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}