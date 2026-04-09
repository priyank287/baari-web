import Sidebar from '../components/Sidebar'

export default function AdminConsole() {
  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar />

      <main className="ml-64 min-h-screen bg-surface">
        <header className="sticky top-0 z-30 px-8 py-6 custom-glass border-b border-slate-200 shadow-sm flex items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">Admin Console</h2>
            <p className="text-on-surface-variant text-sm font-medium tracking-wide">Manage staff and clinical departments</p>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center h-[calc(100vh-89px)] text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-6 clinical-shadow">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl">lock</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-on-surface mb-3">
            This feature is coming soon
          </h3>
          <p className="text-on-surface-variant text-sm max-w-sm leading-relaxed">
            Admin Console will let you manage doctors, staff and clinic settings
          </p>
        </div>
      </main>
    </div>
  )
}
