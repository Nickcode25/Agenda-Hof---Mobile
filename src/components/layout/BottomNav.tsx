import { NavLink } from 'react-router-dom'
import { Calendar, Users, Settings } from 'lucide-react'

const navItems = [
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/patients', icon: Users, label: 'Pacientes' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
]

export function BottomNav() {
  return (
    <nav className="ios-tabbar">
      <div className="flex items-center justify-around h-[50px]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all ${
                isActive
                  ? 'text-primary-500'
                  : 'text-[#8e8e93] active:text-primary-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-[22px] h-[22px] transition-transform ${isActive ? 'scale-105' : ''}`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
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
