import { Loader2 } from 'lucide-react'

interface LoadingProps {
  fullScreen?: boolean
  text?: string
}

export function Loading({ fullScreen = false, text }: LoadingProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        {text && (
          <p className="mt-3 text-surface-500 text-sm">{text}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      {text && (
        <p className="mt-2 text-surface-500 text-sm">{text}</p>
      )}
    </div>
  )
}
