import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type NavigationDirection = 'forward' | 'back'

interface NavigationContextType {
  direction: NavigationDirection
  setDirection: (direction: NavigationDirection) => void
  swipeProgress: number
  setSwipeProgress: (progress: number) => void
  isSwipeActive: boolean
  setIsSwipeActive: (active: boolean) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

interface NavigationProviderProps {
  children: ReactNode
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [direction, setDirection] = useState<NavigationDirection>('forward')
  const [swipeProgress, setSwipeProgress] = useState(0)
  const [isSwipeActive, setIsSwipeActive] = useState(false)

  const handleSetDirection = useCallback((dir: NavigationDirection) => {
    setDirection(dir)
  }, [])

  return (
    <NavigationContext.Provider
      value={{
        direction,
        setDirection: handleSetDirection,
        swipeProgress,
        setSwipeProgress,
        isSwipeActive,
        setIsSwipeActive,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}
