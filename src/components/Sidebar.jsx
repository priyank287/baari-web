import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard',           label: 'Dashboard',      roles: null },
  { to: '/queue',     icon: 'group',               label: 'Queue Mgmt',     roles: null },
  { to: '/admin',     icon: 'admin_panel_settings', label: 'Admin Console',  roles: ['HOSPITAL_ADMIN', 'SUPER_ADMIN'] },
  { to: '/analytics', icon: 'bar_chart',            label: 'Analytics',      roles: ['HOSPITAL_ADMIN', 'RECEPTIONIST'] },
]

export default function Sidebar({ showAddPatient = false }) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    item => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 lg:w-64 flex flex-col py-4 px-2 lg:px-4 z-40 bg-slate-50 border-r border-slate-100 transition-all duration-200 ease-in-out font-sans uppercase tracking-widest text-[10px] font-bold">
      {/* Logo */}
      <div className="mb-10 px-2 lg:px-4 flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-white">clinical_notes</span>
        </div>
        <div className="hidden lg:block overflow-hidden">
          <h1 className="text-slate-900 font-black text-sm tracking-tighter normal-case whitespace-nowrap">Baari</h1>
          <p className="text-slate-500 font-medium tracking-normal normal-case text-xs whitespace-nowrap">It&apos;s your turn now</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {visibleItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-slate-200/50 text-teal-600'
                  : 'text-slate-500 hover:bg-slate-200'
              }`
            }
          >
            <span className="material-symbols-outlined shrink-0">{icon}</span>
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-2 border-t border-slate-100 pt-4">
        {showAddPatient && (
          <button
            onClick={() => navigate('/queue', { state: { openAddPanel: true } })}
            title="Add Patient"
            className="w-full mb-4 bg-primary text-white py-3 rounded-lg flex items-center justify-center gap-2 tracking-normal normal-case text-sm font-semibold hover:opacity-90 active:scale-95 duration-150"
          >
            <span className="material-symbols-outlined text-sm shrink-0">add</span>
            <span className="hidden lg:block">Add Patient</span>
          </button>
        )}
        {user && (
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100">
            <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">account_circle</span>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-slate-700 text-xs font-semibold truncate normal-case tracking-normal">{user.name}</p>
              <p className="text-slate-400 text-[10px] truncate normal-case tracking-normal">{user.role.replace(/_/g, ' ')}</p>
            </div>
            {user.planType && user.planType !== 'SUPER_ADMIN' && (
              <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                user.planType === 'PRO'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {user.planType}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => { logout(); navigate('/login') }}
          title="Logout"
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-3 text-slate-500 hover:bg-slate-200 rounded-lg transition-all"
        >
          <span className="material-symbols-outlined shrink-0">logout</span>
          <span className="hidden lg:block">Logout</span>
        </button>
      </div>
    </aside>
  )
}
