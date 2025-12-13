import { ReactNode } from 'react'
import { motion, type Transition } from 'framer-motion'
import { useNavigation } from '@/contexts/NavigationContext'

interface PageTransitionProps {
  children: ReactNode
}

// Variantes de animacao para transicao de pagina estilo iOS
const pageVariants = {
  // Pagina entrando (vindo da direita)
  enterFromRight: {
    x: '100%',
    opacity: 1,
  },
  // Pagina entrando (vindo da esquerda - voltar)
  enterFromLeft: {
    x: '-30%',
    opacity: 0.8,
  },
  // Pagina no centro (visivel)
  center: {
    x: 0,
    opacity: 1,
  },
  // Pagina saindo para esquerda (navegando para frente)
  exitToLeft: {
    x: '-30%',
    opacity: 0.8,
  },
  // Pagina saindo para direita (navegando para tras)
  exitToRight: {
    x: '100%',
    opacity: 1,
  },
}

// Transicao suave estilo iOS
const pageTransition: Transition = {
  type: 'tween',
  ease: [0.25, 0.1, 0.25, 1], // Curva de easing similar ao iOS
  duration: 0.35,
}

export function PageTransition({ children }: PageTransitionProps) {
  const { direction } = useNavigation()

  return (
    <motion.div
      initial={direction === 'back' ? 'enterFromLeft' : 'enterFromRight'}
      animate="center"
      exit={direction === 'back' ? 'exitToRight' : 'exitToLeft'}
      variants={pageVariants}
      transition={pageTransition}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f2f2f7',
      }}
    >
      {children}
    </motion.div>
  )
}

// Componente wrapper para paginas que NAO devem ter animacao (paginas principais)
export function NoTransition({ children }: PageTransitionProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {children}
    </div>
  )
}
