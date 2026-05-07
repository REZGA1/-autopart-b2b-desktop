import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/authStore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Button } from '@/components/ui/button'
import { Store, Package, Home, ClipboardList, ShoppingCart } from 'lucide-react'

/**
 * Online status indicator dot
 */
function OnlineStatusDot({ online }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        online ? 'bg-emerald-500' : 'bg-slate-400'
      }`}
      title={online ? 'Online' : 'Offline'}
      aria-label={online ? 'Online' : 'Offline'}
    />
  )
}

function NavLink({ to, children, icon: Icon }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  )
}

export default function Layout({ title, children }) {
  useOnlineStatus()
  const { profile, logout } = useAuth()
  const nav = useNavigate()

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold text-slate-900">AutoPart B2B</Link>

          {/* Navigation Menu */}
          {profile && (
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" icon={Home}>Home</NavLink>
              {profile.role === 'merchant' && (
                <NavLink to="/store" icon={Store}>Store</NavLink>
              )}
              {profile.role === 'supplier' && (
                <>
                  <NavLink to="/catalog" icon={ClipboardList}>Catalog</NavLink>
                  <NavLink to="/supplier/requests" icon={ShoppingCart}>Requests</NavLink>
                </>
              )}
              {profile.role === 'merchant' && (
                <NavLink to="/inventory" icon={Package}>Inventory</NavLink>
              )}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <Link className="flex items-center gap-2 text-sm text-slate-700 hover:underline" to="/profile">
                  <OnlineStatusDot online={profile.online_status} />
                  {profile.first_name} {profile.last_name}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout()
                    nav('/login')
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => nav('/login')}>Login</Button>
                <Button size="sm" onClick={() => nav('/register')}>Register</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {title ? <h1 className="mb-4 text-xl font-semibold text-slate-900">{title}</h1> : null}
        {children}
      </main>
    </div>
  )
}

