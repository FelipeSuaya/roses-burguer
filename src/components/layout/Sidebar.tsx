import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ChefHat, BarChart3, Settings, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrders } from '@/contexts/OrdersContext'
import { useTheme } from '@/contexts/ThemeContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true, showBadge: true },
  { to: '/kitchen', icon: ChefHat, label: 'Cocina', exact: false, showBadge: true },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', exact: false, showBadge: false },
  { to: '/admin', icon: Settings, label: 'Admin', exact: false, showBadge: false },
]

function ConnectionDot({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const colors = {
    connected: 'bg-emerald-500',
    connecting: 'bg-amber-400 animate-pulse',
    disconnected: 'bg-red-500',
  }
  const labels = {
    connected: 'Conectado',
    connecting: 'Conectando...',
    disconnected: 'Desconectado',
  }
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status]}`} />
      {labels[status]}
    </div>
  )
}

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { pendingOrders, connectionStatus } = useOrders()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0 bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[hsl(var(--sidebar-border))] flex items-center gap-2.5">
        <img
          src="/lovable-uploads/86ac5a9c-d0bd-40ac-88b0-07fc04f59e14.png"
          alt="Roses Burgers"
          className="h-7 w-auto flex-shrink-0"
        />
        <div>
          <span className="font-bold text-sm tracking-widest text-foreground uppercase">Roses</span>
          <p className="text-[10px] text-muted-foreground -mt-0.5 tracking-wide">Burgers</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, exact, showBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 relative ${
                isActive
                  ? 'bg-[hsl(var(--sidebar-primary)/0.12)] text-[hsl(var(--sidebar-primary))]'
                  : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[hsl(var(--sidebar-primary))] rounded-r-full" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                <span className="flex-1 font-['IBM_Plex_Sans_Condensed',sans-serif] tracking-wide">{label}</span>
                {showBadge && pendingOrders.length > 0 && (
                  <span className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums min-w-[18px] text-center leading-none">
                    {pendingOrders.length}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] pt-2 pb-3 space-y-0.5">
        <ConnectionDot status={connectionStatus} />

        {user && (
          <div className="px-3 py-1 text-[11px] text-muted-foreground truncate">
            {user.email}
          </div>
        )}

        {/* Theme toggle + sign out on same row */}
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className="flex items-center gap-1.5 flex-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          >
            {theme === 'dark'
              ? <><Sun className="w-3.5 h-3.5" /><span>Modo claro</span></>
              : <><Moon className="w-3.5 h-3.5" /><span>Modo oscuro</span></>
            }
          </button>
          <button
            onClick={handleSignOut}
            title="Salir"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
