import { NavLink } from 'react-router-dom'
import { Calendar, Users, Settings } from 'lucide-react'

const navItems = [
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/patients', icon: Users, label: 'Pacientes' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 pb-safe-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
                isActive
                  ? 'text-orange-500'
                  : 'text-surface-400 active:text-orange-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
