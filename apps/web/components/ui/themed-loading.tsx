'use client'

interface ThemedLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ThemedLoading({ message = "Loading your marketplace...", size = 'md' }: ThemedLoadingProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4 ${sizeClasses[size]}`} />
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  )
}