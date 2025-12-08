import { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  showBack?: boolean
  rightAction?: ReactNode
}

export function Header({ title, showBack = false, rightAction }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-10 bg-primary-500 pt-safe-top shadow-md">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2 min-w-[48px]">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full active:bg-primary-600"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        <h1 className="text-lg font-semibold text-white absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>

        <div className="min-w-[48px] flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
