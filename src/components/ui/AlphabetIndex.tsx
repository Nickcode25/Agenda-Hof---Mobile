import { useRef, useCallback, useState } from 'react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

interface AlphabetIndexProps {
  availableLetters: Set<string>
  onLetterSelect: (letter: string) => void
}

export function AlphabetIndex({ availableLetters, onLetterSelect }: AlphabetIndexProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const lastHapticLetter = useRef<string | null>(null)

  // Trigger haptic feedback
  const triggerHaptic = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        // Haptics not available
      }
    }
  }, [])

  // Get letter from touch position
  const getLetterFromTouch = useCallback((clientY: number): string | null => {
    if (!containerRef.current) return null

    const rect = containerRef.current.getBoundingClientRect()
    const relativeY = clientY - rect.top
    const letterHeight = rect.height / ALPHABET.length
    const index = Math.floor(relativeY / letterHeight)

    if (index >= 0 && index < ALPHABET.length) {
      return ALPHABET[index]
    }
    return null
  }, [])

  // Find nearest available letter
  const findNearestAvailableLetter = useCallback((letter: string): string | null => {
    if (availableLetters.has(letter)) return letter

    // Find the nearest available letter
    const letterIndex = ALPHABET.indexOf(letter)

    // Search forward first
    for (let i = letterIndex + 1; i < ALPHABET.length; i++) {
      if (availableLetters.has(ALPHABET[i])) {
        return ALPHABET[i]
      }
    }

    // Then search backward
    for (let i = letterIndex - 1; i >= 0; i--) {
      if (availableLetters.has(ALPHABET[i])) {
        return ALPHABET[i]
      }
    }

    return null
  }, [availableLetters])

  // Handle letter selection
  const handleSelectLetter = useCallback((letter: string) => {
    const targetLetter = findNearestAvailableLetter(letter)
    if (targetLetter) {
      setActiveLetter(targetLetter)

      // Only trigger haptic if letter changed
      if (lastHapticLetter.current !== targetLetter) {
        lastHapticLetter.current = targetLetter
        triggerHaptic()
      }

      onLetterSelect(targetLetter)
    }
  }, [findNearestAvailableLetter, onLetterSelect, triggerHaptic])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    const letter = getLetterFromTouch(touch.clientY)
    if (letter) {
      handleSelectLetter(letter)
    }
  }, [getLetterFromTouch, handleSelectLetter])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    const letter = getLetterFromTouch(touch.clientY)
    if (letter) {
      handleSelectLetter(letter)
    }
  }, [getLetterFromTouch, handleSelectLetter])

  const handleTouchEnd = useCallback(() => {
    setActiveLetter(null)
    lastHapticLetter.current = null
  }, [])

  // Click handler for desktop
  const handleClick = useCallback((letter: string) => {
    handleSelectLetter(letter)
    setTimeout(() => setActiveLetter(null), 150)
  }, [handleSelectLetter])

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-0 bottom-20 flex flex-col justify-center z-30 select-none"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="flex flex-col items-center py-1 px-0.5">
        {ALPHABET.map((letter) => {
          const isAvailable = availableLetters.has(letter)
          const isActive = activeLetter === letter

          return (
            <button
              key={letter}
              onClick={() => handleClick(letter)}
              className={`
                w-[16px] h-[14px] flex items-center justify-center
                text-[10px] font-semibold leading-none
                transition-all duration-75
                ${isActive
                  ? 'text-primary-500 scale-125'
                  : isAvailable
                    ? 'text-primary-500'
                    : 'text-[#c7c7cc]'
                }
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'none'
              }}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}
