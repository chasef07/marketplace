'use client'

export default function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse bg-slate-100 h-24 rounded-lg"></div>
      ))}
    </div>
  )
}