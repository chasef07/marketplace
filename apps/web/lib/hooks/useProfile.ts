/**
 * Profile Custom Hooks
 * Extracts business logic from profile components for better reusability
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiClient } from '@/lib/api-client-new'
import { createClient } from '@/lib/supabase'
import { 
  ProfileData, 
  User, 
  ProfileEditData, 
  ProfileNegotiation,
  BaseProfileData 
} from '@/lib/types/profile'

/**
 * Hook for fetching and managing profile data
 */
export function useProfile(username: string) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/profiles/${username}`)
      
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Profile not found' : 'Failed to load profile')
      }

      const profileData = await response.json()
      setProfile(profileData)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const refetch = useCallback(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    loading,
    error,
    refetch
  }
}

/**
 * Hook for current user profile management
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setLoading(true)
        const userData = await apiClient.getCurrentUser()
        setUser(userData)
      } catch (err) {
        console.error('Failed to load current user:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }

    loadCurrentUser()

    // Set up real-time auth state listener
    const { data: { subscription } } = apiClient.onAuthStateChange((session) => {
      if (session?.user) {
        apiClient.getCurrentUser().then(setUser).catch(console.error)
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    error
  }
}

/**
 * Hook for profile editing functionality
 */
export function useProfileEdit(initialData?: BaseProfileData) {
  const [formData, setFormData] = useState<ProfileEditData>({
    display_name: initialData?.display_name || '',
    bio: initialData?.bio || '',
    profile_picture_filename: initialData?.profile_picture_filename || '',
    location: {
      city: initialData?.location?.city || '',
      state: initialData?.location?.state || '',
      zip_code: initialData?.location?.zip_code || ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = useCallback((field: keyof ProfileEditData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const updateLocationField = useCallback((field: keyof ProfileEditData['location'], value: string) => {
    setFormData(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value }
    }))
    // Clear error for this field
    if (errors[`location.${field}`]) {
      setErrors(prev => ({ ...prev, [`location.${field}`]: '' }))
    }
  }, [errors])

  const uploadProfileImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      setErrors(prev => ({ ...prev, image: '' }))

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error('Image must be smaller than 5MB')
      }

      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `profile_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('furniture-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      setFormData(prev => ({ ...prev, profile_picture_filename: fileName }))
      return fileName
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image'
      setErrors(prev => ({ ...prev, image: errorMessage }))
      return null
    } finally {
      setUploadingImage(false)
    }
  }, [])

  const saveProfile = useCallback(async (): Promise<boolean> => {
    try {
      setSaving(true)
      setErrors({})

      // Validate form data
      const validation = validateProfileEditData(formData)
      if (!validation.isValid) {
        setErrors(validation.errors)
        return false
      }

      const response = await fetch('/api/profiles/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update profile')
      }
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      setErrors(prev => ({ ...prev, general: errorMessage }))
      return false
    } finally {
      setSaving(false)
    }
  }, [formData])

  const isDirty = useMemo(() => {
    if (!initialData) return Object.values(formData).some(v => v !== '')
    
    return (
      formData.display_name !== initialData.display_name ||
      formData.bio !== initialData.bio ||
      formData.profile_picture_filename !== initialData.profile_picture_filename ||
      formData.location.city !== initialData.location.city ||
      formData.location.state !== initialData.location.state ||
      formData.location.zip_code !== initialData.location.zip_code
    )
  }, [formData, initialData])

  return {
    formData,
    updateField,
    updateLocationField,
    uploadProfileImage,
    saveProfile,
    saving,
    uploadingImage,
    errors,
    isDirty
  }
}

/**
 * Hook for managing user negotiations/offers
 */
export function useOffers(userId?: string) {
  const [negotiations, setNegotiations] = useState<ProfileNegotiation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOffers = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      
      const offers = await apiClient.getMyNegotiations()
      setNegotiations(offers)
    } catch (err) {
      console.error('Failed to fetch offers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load offers')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  // Categorize offers
  const categorizedOffers = useMemo(() => {
    const active = negotiations.filter(neg => neg.status === 'active')
    const accepted = negotiations.filter(neg => 
      neg.status === 'buyer_accepted' || neg.status === 'deal_pending'
    )
    const other = negotiations.filter(neg => 
      neg.status === 'completed' || neg.status === 'cancelled'
    )

    return { active, accepted, other }
  }, [negotiations])

  const refetch = useCallback(() => {
    fetchOffers()
  }, [fetchOffers])

  return {
    negotiations,
    categorizedOffers,
    loading,
    error,
    refetch
  }
}

// Helper function for profile edit validation
function validateProfileEditData(data: ProfileEditData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  if (!data.display_name?.trim()) {
    errors.display_name = 'Display name is required'
  } else if (data.display_name.length > 50) {
    errors.display_name = 'Display name must be 50 characters or less'
  }
  
  if (data.bio && data.bio.length > 500) {
    errors.bio = 'Bio must be 500 characters or less'
  }
  
  if (data.location.zip_code && !/^\d{5}(-\d{4})?$/.test(data.location.zip_code)) {
    errors['location.zip_code'] = 'Please enter a valid ZIP code'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}