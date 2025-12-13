import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNavigation } from '@/contexts/NavigationContext'

interface SwipeBackOptions {
  threshold?: number      // Porcentagem da tela para completar o swipe (0-1)
  edgeWidth?: number      // Largura da area de borda para iniciar o swipe (em pixels)
  disabled?: boolean      // Desabilitar o swipe
}

// Paginas onde nao deve ter swipe back (paginas principais da navegacao)
const NO_SWIPE_PAGES = ['/', '/agenda', '/patients', '/settings', '/login', '/register', '/forgot-password']

export function useSwipeBack(options: SwipeBackOptions = {}) {
  const {
    threshold = 0.35, // 35% da largura da tela
    edgeWidth = 25,
    disabled = false,
  } = options

  const navigate = useNavigate()
  const location = useLocation()
  const { setDirection } = useNavigation()

  // Refs para tracking do gesto
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const isSwipeStartedFromEdge = useRef<boolean>(false)
  const isHorizontalSwipe = useRef<boolean | null>(null)
  const pageElement = useRef<HTMLElement | null>(null)
  const overlayElement = useRef<HTMLDivElement | null>(null)
  const screenWidth = useRef<number>(window.innerWidth)

  // Verificar se existe historico para voltar
  const canGoBack = useCallback(() => {
    return window.history.length > 1
  }, [])

  // Criar overlay escuro
  const createOverlay = useCallback(() => {
    if (overlayElement.current) return

    const overlay = document.createElement('div')
    overlay.id = 'swipe-back-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0);
      pointer-events: none;
      z-index: 9998;
      will-change: background;
    `
    document.body.appendChild(overlay)
    overlayElement.current = overlay
  }, [])

  // Remover overlay
  const removeOverlay = useCallback(() => {
    if (overlayElement.current) {
      overlayElement.current.remove()
      overlayElement.current = null
    }
  }, [])

  // Encontrar o elemento da pagina atual
  const findPageElement = useCallback(() => {
    // Procurar pelo container principal da pagina
    const page = document.querySelector('[data-page-transition]') as HTMLElement
    if (page) return page

    // Fallback: procurar pelo primeiro elemento com min-h-screen
    const mainContent = document.querySelector('.min-h-screen') as HTMLElement
    if (mainContent) return mainContent

    return null
  }, [])

  // Atualizar posicao da pagina durante o swipe
  const updatePagePosition = useCallback((translateX: number, progress: number) => {
    if (!pageElement.current) {
      pageElement.current = findPageElement()
    }

    if (pageElement.current) {
      pageElement.current.style.transform = `translateX(${translateX}px)`
      pageElement.current.style.transition = 'none'
      pageElement.current.style.willChange = 'transform'
    }

    // Atualizar overlay - clareia conforme arrasta
    if (overlayElement.current) {
      const opacity = 0.3 * (1 - progress) // Comeca escuro, clareia
      overlayElement.current.style.background = `rgba(0, 0, 0, ${opacity})`
    }
  }, [findPageElement])

  // Resetar posicao da pagina
  const resetPagePosition = useCallback((animate: boolean = true) => {
    if (pageElement.current) {
      if (animate) {
        pageElement.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
      }
      pageElement.current.style.transform = 'translateX(0)'

      // Limpar apos a animacao
      setTimeout(() => {
        if (pageElement.current) {
          pageElement.current.style.transition = ''
          pageElement.current.style.transform = ''
          pageElement.current.style.willChange = ''
        }
      }, animate ? 300 : 0)
    }

    // Resetar overlay
    if (overlayElement.current) {
      overlayElement.current.style.background = 'rgba(0, 0, 0, 0)'
    }

    pageElement.current = null
  }, [])

  // Completar o swipe (animar saida da pagina)
  const completeSwipe = useCallback(() => {
    if (pageElement.current) {
      pageElement.current.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)'
      pageElement.current.style.transform = `translateX(${screenWidth.current}px)`
    }

    // Esconder overlay
    if (overlayElement.current) {
      overlayElement.current.style.transition = 'background 0.25s ease'
      overlayElement.current.style.background = 'rgba(0, 0, 0, 0)'
    }

    // Definir direcao como "back" para a animacao de entrada da proxima pagina
    setDirection('back')

    // Navegar apos a animacao comecar
    setTimeout(() => {
      removeOverlay()
      if (pageElement.current) {
        pageElement.current.style.transition = ''
        pageElement.current.style.transform = ''
        pageElement.current.style.willChange = ''
      }
      pageElement.current = null
      navigate(-1)
    }, 200)
  }, [navigate, removeOverlay, setDirection])

  useEffect(() => {
    if (disabled) return

    // Verificar se esta em uma pagina que nao deve ter swipe back
    if (NO_SWIPE_PAGES.includes(location.pathname)) return

    screenWidth.current = window.innerWidth

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
      isHorizontalSwipe.current = null

      // Verificar se o swipe comecou na borda esquerda da tela
      isSwipeStartedFromEdge.current = touch.clientX <= edgeWidth

      if (isSwipeStartedFromEdge.current && canGoBack()) {
        createOverlay()
        pageElement.current = findPageElement()
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipeStartedFromEdge.current || !canGoBack()) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current

      // Determinar se e um swipe horizontal na primeira movimentacao significativa
      if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY)

        // Se nao for horizontal, cancelar
        if (!isHorizontalSwipe.current) {
          isSwipeStartedFromEdge.current = false
          resetPagePosition(false)
          removeOverlay()
          return
        }
      }

      // Se for um swipe horizontal valido (para a direita)
      if (isHorizontalSwipe.current && deltaX > 0) {
        // Limitar o arrasto ao tamanho da tela
        const clampedDelta = Math.min(deltaX, screenWidth.current)
        const progress = clampedDelta / screenWidth.current

        updatePagePosition(clampedDelta, progress)
      }
    }

    const handleTouchEnd = () => {
      if (!isSwipeStartedFromEdge.current || !canGoBack() || !isHorizontalSwipe.current) {
        resetPagePosition(false)
        removeOverlay()
        isSwipeStartedFromEdge.current = false
        isHorizontalSwipe.current = null
        return
      }

      // Calcular a posicao final
      const currentTransform = pageElement.current?.style.transform || ''
      const match = currentTransform.match(/translateX\((.+)px\)/)
      const currentX = match ? parseFloat(match[1]) : 0
      const progress = currentX / screenWidth.current

      // Se arrastou mais que o threshold, completar o swipe
      if (progress >= threshold) {
        completeSwipe()
      } else {
        // Caso contrario, voltar para a posicao original
        resetPagePosition(true)
        setTimeout(() => removeOverlay(), 300)
      }

      isSwipeStartedFromEdge.current = false
      isHorizontalSwipe.current = null
    }

    const handleTouchCancel = () => {
      resetPagePosition(false)
      removeOverlay()
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
      removeOverlay()
    }
  }, [
    navigate,
    location.pathname,
    threshold,
    edgeWidth,
    disabled,
    canGoBack,
    createOverlay,
    removeOverlay,
    findPageElement,
    updatePagePosition,
    resetPagePosition,
    completeSwipe,
  ])
}

// Hook para definir direcao ao navegar programaticamente
export function useNavigateWithDirection() {
  const navigate = useNavigate()
  const { setDirection } = useNavigation()

  const navigateForward = useCallback((to: string | number, options?: { replace?: boolean }) => {
    setDirection('forward')
    if (typeof to === 'number') {
      navigate(to)
    } else {
      navigate(to, options)
    }
  }, [navigate, setDirection])

  const navigateBack = useCallback(() => {
    setDirection('back')
    navigate(-1)
  }, [navigate, setDirection])

  return { navigateForward, navigateBack }
}
