import { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStatusBar } from '@/hooks/useStatusBar'

interface HeaderProps {
  title: string
  showBack?: boolean
  leftAction?: ReactNode
  rightAction?: ReactNode
  variant?: 'primary' | 'default'
}

export function Header({
  title,
  showBack = false,
  leftAction,
  rightAction,
  variant = 'primary',
}: HeaderProps) {
  const navigate = useNavigate()

  // Controla a status bar baseado no variant do header
  // primary (laranja) = dark (icones brancos)
  // default (claro) = light (icones pretos)
  useStatusBar(variant === 'primary' ? 'dark' : 'light')

  // iOS-style header with blur for default variant
  if (variant === 'default') {
    return (
      <header className="ios-navbar">
        {/* Safe area top */}
        <div className="h-safe-top bg-[#f9f9fb]" />
        <div className="flex items-center justify-between h-11 px-4">
          <div className="flex items-center gap-1 min-w-[70px]">
            {leftAction ? (
              leftAction
            ) : showBack ? (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-0.5 -ml-2 py-2 px-1 active:opacity-60 transition-opacity"
              >
                <ChevronLeft className="w-[22px] h-[22px] text-primary-500" strokeWidth={2.5} />
                <span className="text-[17px] text-primary-500">Voltar</span>
              </button>
            ) : null}
          </div>

          <h1 className="text-[17px] font-semibold text-surface-900 absolute left-1/2 -translate-x-1/2 truncate max-w-[60%]">
            {title}
          </h1>

          <div className="min-w-[70px] flex justify-end">
            {rightAction}
          </div>
        </div>
      </header>
    )
  }

  // Primary colored header (for main pages)
  return (
    <header className="sticky top-0 z-20 bg-primary-500">
      {/* Safe area top com cor primária */}
      <div className="h-safe-top bg-primary-500" />
      <div className="flex items-center justify-between h-11 px-4">
        <div className="flex items-center gap-1 min-w-[70px]">
          {leftAction ? (
            leftAction
          ) : showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-0.5 -ml-2 py-2 px-1 active:opacity-60 transition-opacity"
            >
              <ChevronLeft className="w-[22px] h-[22px] text-white" strokeWidth={2.5} />
              <span className="text-[17px] text-white">Voltar</span>
            </button>
          ) : null}
        </div>

        <h1 className="text-[17px] font-semibold text-white absolute left-1/2 -translate-x-1/2 truncate max-w-[60%]">
          {title}
        </h1>

        <div className="min-w-[70px] flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
