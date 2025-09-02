'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Mail } from "lucide-react"
import { apiClient } from "@/lib/api-client-new"
import { User } from "@/lib/types/user"


interface EnhancedAuthProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: (user: User) => void
  initialMode?: 'signin' | 'register' | 'reset'
}

interface FormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  full_name: string
  zip_code: string
}

interface FieldError {
  field: string
  message: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
}

export function EnhancedAuth({ isOpen, onClose, onAuthSuccess, initialMode = 'signin' }: EnhancedAuthProps) {
  const [mode, setMode] = useState<'signin' | 'register' | 'reset'>(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] })

  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    zip_code: ''
  })

  // Reset form when mode changes
  useEffect(() => {
    resetForm()
  }, [mode])

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      zip_code: ''
    })
    setError(null)
    setSuccess(null)
    setFieldErrors([])
    setPasswordStrength({ score: 0, feedback: [] })
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    
    // Remove field-specific error when user starts typing
    setFieldErrors(prev => prev.filter(err => err.field !== field))
    
    // Real-time password strength validation
    if (field === 'password') {
      validatePasswordStrength(value)
    }
    
    // Real-time confirm password validation
    if (field === 'confirmPassword' || (field === 'password' && formData.confirmPassword)) {
      const password = field === 'password' ? value : formData.password
      const confirmPassword = field === 'confirmPassword' ? value : formData.confirmPassword
      
      if (confirmPassword && password !== confirmPassword) {
        setFieldErrors(prev => [
          ...prev.filter(err => err.field !== 'confirmPassword'),
          { field: 'confirmPassword', message: 'Passwords do not match' }
        ])
      }
    }
  }

  const validatePasswordStrength = (password: string) => {
    const feedback: string[] = []
    let score = 0

    if (password.length >= 8) score++
    else feedback.push('At least 8 characters')
    
    if (/[A-Z]/.test(password)) score++
    else feedback.push('One uppercase letter')
    
    if (/[a-z]/.test(password)) score++
    else feedback.push('One lowercase letter')
    
    if (/[0-9]/.test(password)) score++
    else feedback.push('One number')
    
    if (/[^A-Za-z0-9]/.test(password)) score++
    else feedback.push('One special character')

    setPasswordStrength({ score, feedback })
  }

  const getFieldError = (field: string): string | null => {
    const error = fieldErrors.find(err => err.field === field)
    return error ? error.message : null
  }

  const validateForm = (): boolean => {
    const errors: FieldError[] = []

    if (mode === 'register') {
      if (!formData.username.trim()) {
        errors.push({ field: 'username', message: 'Username is required' })
      } else if (formData.username.length < 3) {
        errors.push({ field: 'username', message: 'Username must be at least 3 characters' })
      }

      if (!formData.email.trim()) {
        errors.push({ field: 'email', message: 'Email is required' })
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' })
      }

      if (!formData.full_name.trim()) {
        errors.push({ field: 'full_name', message: 'Full name is required' })
      }

      if (!formData.zip_code.trim()) {
        errors.push({ field: 'zip_code', message: 'Zip code is required' })
      } else if (!/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
        errors.push({ field: 'zip_code', message: 'Please enter a valid zip code (e.g., 12345 or 12345-6789)' })
      }

      if (!formData.password) {
        errors.push({ field: 'password', message: 'Password is required' })
      } else if (formData.password.length < 6) {
        errors.push({ field: 'password', message: 'Password must be at least 6 characters' })
      }

      if (formData.password !== formData.confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Passwords do not match' })
      }
    } else if (mode === 'signin') {
      if (!formData.email.trim()) {
        errors.push({ field: 'email', message: 'Email is required' })
      }
      if (!formData.password) {
        errors.push({ field: 'password', message: 'Password is required' })
      }
    } else if (mode === 'reset') {
      if (!formData.email.trim()) {
        errors.push({ field: 'email', message: 'Email is required' })
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' })
      }
    }

    setFieldErrors(errors)
    return errors.length === 0
  }

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error
    
    const message = (error as Error)?.message || ''
    
    // Improved error messages for common Supabase auth errors
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.'
    }
    if (message.includes('Email not confirmed')) {
      return 'Please verify your email address before signing in.'
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists. Try signing in instead.'
    }
    if (message.includes('Password should be at least 6 characters')) {
      return 'Password must be at least 6 characters long.'
    }
    if (message.includes('Unable to validate email address')) {
      return 'Please enter a valid email address.'
    }
    if (message.includes('Signup is disabled')) {
      return 'Account registration is currently disabled. Please contact support.'
    }
    
    return message || 'An unexpected error occurred. Please try again.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      if (mode === 'register') {
        const authResult = await apiClient.signUp(
          formData.email, 
          formData.password, 
          formData.username,
          formData.zip_code
        )
        
        if (!authResult) throw new Error('Registration failed')
        
        // Since we're disabling email confirmation, user should be auto-confirmed
        if (authResult.user) {
          // Wait a bit for the profile trigger to execute, then retry getting user
          let user = null
          let retries = 0
          const maxRetries = 5
          
          while (!user && retries < maxRetries) {
            try {
              user = await apiClient.getCurrentUser()
              if (user) break
            } catch {
              // Profile not ready, retry
            }
            
            retries++
            if (retries < maxRetries) {
              // Wait 500ms before retrying
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
          
          if (user) {
            onAuthSuccess(user)
            // Don't call onClose() - let the parent component handle navigation
          } else {
            throw new Error('Profile creation is taking longer than expected. Please try signing in.')
          }
        }
      } else if (mode === 'signin') {
        await apiClient.signIn(formData.email, formData.password)
        
        // No need to check for error since apiClient.signIn throws on error
        
        const user = await apiClient.getCurrentUser()
        if (user) {
          onAuthSuccess(user)
          // Don't call onClose() - let the parent component handle navigation
        }
      } else if (mode === 'reset') {
        // Password reset functionality
        const resetResult = await apiClient.supabase.auth.resetPasswordForEmail(formData.email)
        
        if (resetResult.error) throw resetResult.error
        
        setSuccess('Password reset link sent to your email. Please check your inbox.')
        // Switch to signin mode after a delay
        setTimeout(() => {
          setMode('signin')
          setSuccess(null)
        }, 3000)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: 'signin' | 'register' | 'reset') => {
    setMode(newMode)
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500'
    if (passwordStrength.score <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 2) return 'Weak'
    if (passwordStrength.score <= 3) return 'Medium'
    return 'Strong'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-aurora-dreams bg-aurora-animated">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" style={{ borderColor: 'rgba(74, 111, 165, 0.2)' }}>
        <CardContent className="p-0" style={{ background: 'white' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(74, 111, 165, 0.1)', background: 'rgba(250, 247, 242, 0.95)' }}>
            <h2 className="text-xl font-semibold" style={{ color: '#2C3E50' }}>
              {mode === 'signin' && 'Welcome Back'}
              {mode === 'register' && 'Create Account'}
              {mode === 'reset' && 'Reset Password'}
            </h2>
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading} style={{ borderColor: '#4A6FA5', color: '#4A6FA5' }} className="hover:bg-opacity-10">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Global Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#2C3E50' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                  getFieldError('email') ? 'border-red-300' : ''
                }`}
                style={{ 
                  borderColor: getFieldError('email') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)',
                  color: '#2C3E50'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4A6FA5'}
                onBlur={(e) => e.target.style.borderColor = getFieldError('email') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)'}
                placeholder="Enter your email address"
                disabled={loading}
                autoComplete="email"
              />
              {getFieldError('email') && (
                <p className="text-red-600 text-xs mt-1">{getFieldError('email')}</p>
              )}
            </div>

            {/* Username (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2C3E50' }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                    getFieldError('username') ? 'border-red-300' : ''
                  }`}
                  style={{ 
                    borderColor: getFieldError('username') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)',
                    color: '#2C3E50'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4A6FA5'}
                  onBlur={(e) => e.target.style.borderColor = getFieldError('username') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)'}
                  placeholder="Choose a username"
                  disabled={loading}
                  autoComplete="username"
                />
                {getFieldError('username') && (
                  <p className="text-red-600 text-xs mt-1">{getFieldError('username')}</p>
                )}
              </div>
            )}

            {/* Full Name (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2C3E50' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                    getFieldError('full_name') ? 'border-red-300' : ''
                  }`}
                  style={{ 
                    borderColor: getFieldError('full_name') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)',
                    color: '#2C3E50'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4A6FA5'}
                  onBlur={(e) => e.target.style.borderColor = getFieldError('full_name') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)'}
                  placeholder="Enter your full name"
                  disabled={loading}
                  autoComplete="name"
                />
                {getFieldError('full_name') && (
                  <p className="text-red-600 text-xs mt-1">{getFieldError('full_name')}</p>
                )}
              </div>
            )}

            {/* Zip Code (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2C3E50' }}>
                  Zip Code *
                </label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                    getFieldError('zip_code') ? 'border-red-300' : ''
                  }`}
                  style={{ 
                    borderColor: getFieldError('zip_code') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)',
                    color: '#2C3E50'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4A6FA5'}
                  onBlur={(e) => e.target.style.borderColor = getFieldError('zip_code') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)'}
                  placeholder="Enter your zip code (e.g., 10001)"
                  disabled={loading}
                  autoComplete="postal-code"
                  maxLength={10}
                />
                {getFieldError('zip_code') && (
                  <p className="text-red-600 text-xs mt-1">{getFieldError('zip_code')}</p>
                )}
              </div>
            )}

            {/* Password (not for reset) */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2C3E50' }}>
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                      getFieldError('password') ? 'border-red-300' : ''
                    }`}
                    style={{ 
                      borderColor: getFieldError('password') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)',
                      color: '#2C3E50'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A6FA5'}
                    onBlur={(e) => e.target.style.borderColor = getFieldError('password') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)'}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-75"
                    style={{ color: '#4A6FA5' }}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {getFieldError('password') && (
                  <p className="text-red-600 text-xs mt-1">{getFieldError('password')}</p>
                )}

                {/* Password Strength Indicator (register only) */}
                {mode === 'register' && formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Password Strength</span>
                      <span className={`font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-600' : 
                        passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        Missing: {passwordStrength.feedback.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#2C3E50' }}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-white ${
                      getFieldError('confirmPassword') ? 'border-red-300' : ''
                    }`}
                    style={{ 
                      borderColor: getFieldError('confirmPassword') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)',
                      color: '#2C3E50'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4A6FA5'}
                    onBlur={(e) => e.target.style.borderColor = getFieldError('confirmPassword') ? '#ef4444' : 'rgba(74, 111, 165, 0.3)'}
                    placeholder="Confirm your password"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-75"
                    style={{ color: '#4A6FA5' }}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {getFieldError('confirmPassword') && (
                  <p className="text-red-600 text-xs mt-1">{getFieldError('confirmPassword')}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full py-3 text-white bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'signin' && 'Signing in...'}
                  {mode === 'register' && 'Creating account...'}
                  {mode === 'reset' && 'Sending reset link...'}
                </>
              ) : (
                <>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'reset' && (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </>
              )}
            </Button>

            {/* Mode Switching */}
            <div className="text-center pt-4 space-y-2">
              {mode === 'signin' && (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: '#2C3E50' }}>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="font-medium hover:opacity-75"
                      style={{ color: '#4A6FA5' }}
                      disabled={loading}
                    >
                      Create one
                    </button>
                  </p>
                  <p className="text-sm" style={{ color: '#2C3E50' }}>
                    Forgot your password?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="font-medium hover:opacity-75"
                      style={{ color: '#4A6FA5' }}
                      disabled={loading}
                    >
                      Reset it
                    </button>
                  </p>
                </div>
              )}
              
              {mode === 'register' && (
                <p className="text-sm" style={{ color: '#2C3E50' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-medium hover:opacity-75"
                    style={{ color: '#4A6FA5' }}
                    disabled={loading}
                  >
                    Sign in
                  </button>
                </p>
              )}
              
              {mode === 'reset' && (
                <p className="text-sm" style={{ color: '#2C3E50' }}>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-medium hover:opacity-75"
                    style={{ color: '#4A6FA5' }}
                    disabled={loading}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}