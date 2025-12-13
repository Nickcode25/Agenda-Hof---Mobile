import { User } from 'lucide-react'

interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
}

function getColorFromName(name: string) {
  // Cores pastéis definidas na paleta do app
  const colors = [
    'bg-avatar-coral-bg text-avatar-coral-text',     // Coral
    'bg-avatar-peach-bg text-avatar-peach-text',     // Pêssego
    'bg-avatar-lavender-bg text-avatar-lavender-text', // Lavanda
    'bg-avatar-mint-bg text-avatar-mint-text',       // Menta
    'bg-avatar-sky-bg text-avatar-sky-text',         // Céu
    'bg-avatar-lemon-bg text-avatar-lemon-text',     // Limão
    'bg-avatar-blush-bg text-avatar-blush-text',     // Rosa
    'bg-avatar-sage-bg text-avatar-sage-text',       // Sálvia
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} ${getColorFromName(name)} rounded-full flex items-center justify-center`}
    >
      <User className={iconSizes[size]} strokeWidth={2} />
    </div>
  )
}
