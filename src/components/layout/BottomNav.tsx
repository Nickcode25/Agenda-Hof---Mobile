import { NavLink } from 'react-router-dom'
import { Calendar, Users, Settings } from 'lucide-react'

const navItems = [
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/patients', icon: Users, label: 'Pacientes' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-100 pb-safe-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                isActive
                  ? 'text-primary-500'
                  : 'text-surface-400 active:text-primary-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.5 : 1.5}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
