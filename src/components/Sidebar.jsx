import { NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/queue', icon: 'group', label: 'Queue Management' },
  { to: '/admin', icon: 'admin_panel_settings', label: 'Admin Console' },
]

export default function Sidebar({ showAddPatient = false }) {
  const navigate = useNavigate()

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
        {navItems.map(({ to, icon, label }) => (
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
        <a href="#" title="Help" className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-3 text-slate-500 hover:bg-slate-200 rounded-lg transition-all">
          <span className="material-symbols-outlined shrink-0">help</span>
          <span className="hidden lg:block">Help</span>
        </a>
        <button
          onClick={() => navigate('/login')}
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
