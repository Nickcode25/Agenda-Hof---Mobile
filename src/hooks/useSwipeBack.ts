import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface SwipeBackOptions {
  threshold?: number      // Distância mínima para ativar o swipe (em pixels)
  edgeWidth?: number      // Largura da área de borda para iniciar o swipe (em pixels)
  disabled?: boolean      // Desabilitar o swipe
  enableVisualFeedback?: boolean // Habilitar feedback visual durante o arrasto
}

// Páginas onde não deve ter swipe back (páginas principais da navegação)
const NO_SWIPE_PAGES = ['/agenda', '/patients', '/settings', '/login', '/register', '/forgot-password']

export function useSwipeBack(options: SwipeBackOptions = {}) {
  const {
    threshold = 50,
    edgeWidth = 25,
    disabled = false,
    enableVisualFeedback = true
  } = options

  const navigate = useNavigate()
  const location = useLocation()

  // Refs para tracking do gesto
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)
  const isSwipeStartedFromEdge = useRef<boolean>(false)
  const isHorizontalSwipe = useRef<boolean | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const indicatorRef = useRef<HTMLDivElement | null>(null)

  // Verificar se existe histórico para voltar
  const canGoBack = useCallback(() => {
    // Em SPAs com React Router, verificamos se não estamos na primeira página
    return window.history.length > 1
  }, [])

  // Criar elementos visuais de feedback
  const createVisualElements = useCallback(() => {
    if (!enableVisualFeedback) return

    // Overlay escuro que aparece durante o swipe
    if (!overlayRef.current) {
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0);
        pointer-events: none;
        z-index: 9998;
        transition: background 0.1s ease;
      `
      document.body.appendChild(overlay)
      overlayRef.current = overlay
    }

    // Indicador de borda esquerda
    if (!indicatorRef.current) {
      const indicator = document.createElement('div')
      indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(to right, rgba(249, 115, 22, 0.6), transparent);
        opacity: 0;
        pointer-events: none;
        z-index: 9999;
        transition: opacity 0.15s ease, width 0.15s ease;
      `
      document.body.appendChild(indicator)
      indicatorRef.current = indicator
    }
  }, [enableVisualFeedback])

  // Remover elementos visuais
  const removeVisualElements = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.remove()
      overlayRef.current = null
    }
    if (indicatorRef.current) {
      indicatorRef.current.remove()
      indicatorRef.current = null
    }
  }, [])

  // Atualizar feedback visual durante o arrasto
  const updateVisualFeedback = useCallback((progress: number) => {
    if (!enableVisualFeedback) return

    // Progress vai de 0 a 1
    const clampedProgress = Math.min(Math.max(progress, 0), 1)

    if (overlayRef.current) {
      overlayRef.current.style.background = `rgba(0, 0, 0, ${clampedProgress * 0.15})`
    }

    if (indicatorRef.current) {
      indicatorRef.current.style.opacity = String(clampedProgress)
      indicatorRef.current.style.width = `${4 + clampedProgress * 8}px`
    }
  }, [enableVisualFeedback])

  // Resetar feedback visual
  const resetVisualFeedback = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.style.background = 'rgba(0, 0, 0, 0)'
    }
    if (indicatorRef.current) {
      indicatorRef.current.style.opacity = '0'
      indicatorRef.current.style.width = '4px'
    }
  }, [])

  useEffect(() => {
    if (disabled) return

    // Verificar se está em uma página que não deve ter swipe back
    if (NO_SWIPE_PAGES.includes(location.pathname)) return

    // Criar elementos visuais
    createVisualElements()

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
      touchCurrentX.current = touch.clientX
      isHorizontalSwipe.current = null

      // Verificar se o swipe começou na borda esquerda da tela
      isSwipeStartedFromEdge.current = touch.clientX <= edgeWidth

      if (isSwipeStartedFromEdge.current && canGoBack()) {
        // Mostrar indicador sutil
        if (indicatorRef.current) {
          indicatorRef.current.style.opacity = '0.3'
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipeStartedFromEdge.current || !canGoBack()) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current

      // Determinar se é um swipe horizontal na primeira movimentação significativa
      if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY)
      }

      // Se não for um swipe horizontal, cancelar
      if (isHorizontalSwipe.current === false) {
        isSwipeStartedFromEdge.current = false
        resetVisualFeedback()
        return
      }

      // Se for um swipe horizontal válido (para a direita)
      if (isHorizontalSwipe.current && deltaX > 0) {
        touchCurrentX.current = touch.clientX

        // Calcular progresso (0 a 1) baseado no threshold
        const progress = Math.min(deltaX / (threshold * 2), 1)
        updateVisualFeedback(progress)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwipeStartedFromEdge.current || !canGoBack()) {
        resetVisualFeedback()
        isSwipeStartedFromEdge.current = false
        isHorizontalSwipe.current = null
        return
      }

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = Math.abs(touch.clientY - touchStartY.current)

      // Resetar feedback visual
      resetVisualFeedback()

      // Verificar se foi um swipe horizontal válido
      // deltaX > threshold: moveu para a direita o suficiente
      // deltaY < deltaX: mais horizontal que vertical
      if (deltaX > threshold && deltaY < deltaX && isHorizontalSwipe.current) {
        // Navegar para trás
        navigate(-1)
      }

      // Reset
      isSwipeStartedFromEdge.current = false
      isHorizontalSwipe.current = null
    }

    const handleTouchCancel = () => {
      resetVisualFeedback()
      isSwipeStartedFromEdge.current = false
      isHorizontalSwipe.current = null
    }

    // Adicionar event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchCancel)
      removeVisualElements()
    }
  }, [
    navigate,
    location.pathname,
    threshold,
    edgeWidth,
    disabled,
    canGoBack,
    createVisualElements,
    removeVisualElements,
    updateVisualFeedback,
    resetVisualFeedback
  ])
}
