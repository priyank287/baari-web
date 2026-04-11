import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'SUPER_ADMIN') navigate('/admin')
      else if (user.role === 'HOSPITAL_ADMIN') navigate('/admin')
      else navigate('/queue')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface selection:bg-secondary/20 min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <main className="w-full max-w-[440px] flex flex-col items-center">
        {/* Logo Branding */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center clinical-shadow">
            <span className="material-symbols-outlined text-secondary-fixed text-3xl">clinical_notes</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tighter text-on-surface">Baari</h1>
            <p className="text-on-surface-variant font-label text-[10px] uppercase tracking-[0.1em] mt-1 font-bold">Medical Staff Portal</p>
            <p className="text-secondary font-bold text-xs mt-2 italic tracking-wide">It&apos;s your turn now</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full bg-surface-container-lowest rounded-xl p-10 clinical-shadow">
          <header className="mb-8">
            <h2 className="text-xl font-bold tracking-tight text-on-surface">Welcome Back</h2>
            <p className="text-on-surface-variant text-sm mt-1">Please enter your credentials to access the terminal.</p>
          </header>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 bg-error/10 border border-error/20 text-error rounded-lg px-4 py-3 text-sm">
                <span className="material-symbols-outlined text-lg shrink-0">error</span>
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-on-surface font-label text-[11px] font-bold uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-lg">alternate_email</span>
                </div>
                <input
                  className="block w-full pl-11 pr-4 py-3 bg-surface-container-low border-0 rounded-lg text-on-surface placeholder:text-outline text-sm focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-secondary transition-all duration-200"
                  placeholder="staff@baari.com"
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center pr-1">
                <label className="block text-on-surface font-label text-[11px] font-bold uppercase tracking-wider pl-1">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-lg">lock</span>
                </div>
                <input
                  className="block w-full pl-11 pr-4 py-3 bg-surface-container-low border-0 rounded-lg text-on-surface placeholder:text-outline text-sm focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-secondary transition-all duration-200"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              className="w-full btn-gradient text-on-primary py-3.5 rounded-lg font-semibold tracking-tight text-sm active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to Dashboard
                  <span className="material-symbols-outlined text-lg opacity-80 group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Secondary Info */}
        <footer className="mt-12 w-full grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low/50 border border-outline-variant/10 p-4 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-xl mt-0.5">verified_user</span>
            <div>
              <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-wide">Secure Access</h4>
              <p className="text-[10px] text-on-surface-variant leading-relaxed mt-0.5">HIPAA compliant multi-factor encryption protocol active.</p>
            </div>
          </div>
          <div className="bg-surface-container-low/50 border border-outline-variant/10 p-4 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-on-tertiary-container text-xl mt-0.5">support_agent</span>
            <div>
              <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-wide">IT Support</h4>
              <p className="text-[10px] text-on-surface-variant leading-relaxed mt-0.5">Need help? Contact the hospital tech desk at ext. 404.</p>
            </div>
          </div>
        </footer>

        {/* Legal */}
        <div className="mt-12 flex flex-col items-center gap-2 opacity-40">
          <p className="text-[10px] text-on-surface-variant font-medium tracking-tight">© 2024 Baari Clinical Systems. V 2.4.1-precision</p>
          <div className="flex gap-4">
            <a className="text-[10px] hover:text-on-surface transition-colors" href="#">Privacy</a>
            <a className="text-[10px] hover:text-on-surface transition-colors" href="#">Terms</a>
            <a className="text-[10px] hover:text-on-surface transition-colors" href="#">Compliance</a>
          </div>
        </div>
      </main>

      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[5%] w-[30%] h-[30%] bg-primary-fixed/30 blur-[100px] rounded-full"></div>
      </div>
    </div>
  )
}
