import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import departmentApi from '../api/departmentApi'
import doctorApi from '../api/doctorApi'
import staffApi from '../api/staffApi'
import hospitalApi from '../api/hospitalApi'

const HOSPITAL_ADMIN_TABS = ['Departments', 'Doctors', 'Staff']
const STAFF_ROLES = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR']

export default function AdminConsole() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 px-5 py-4 rounded-xl clinical-shadow flex items-center gap-3 max-w-xs ${
          toast.type === 'error' ? 'bg-error text-white' : 'bg-on-surface text-inverse-on-surface'
        }`}>
          <span className="material-symbols-outlined text-xl shrink-0">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <p className="text-sm font-medium leading-snug">{toast.msg}</p>
        </div>
      )}

      <main className="ml-16 lg:ml-64 min-h-screen bg-surface">
        <header className="sticky top-0 z-30 px-8 py-6 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              {isSuperAdmin ? 'Super Admin Console' : 'Admin Console'}
            </h2>
            <p className="text-on-surface-variant text-sm font-medium tracking-wide">
              {isSuperAdmin
                ? 'Manage all hospitals registered on the platform'
                : "Manage your hospital's departments, doctors and staff"}
            </p>
          </div>
        </header>

        {isSuperAdmin ? (
          <div className="p-8">
            <HospitalsTab showToast={showToast} />
          </div>
        ) : (
          <div className="p-8">
            {/* Tabs */}
            <div className="flex gap-1 mb-8 border-b border-outline-variant/30">
              {HOSPITAL_ADMIN_TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-6 py-3 font-bold text-sm transition-all ${
                    i === activeTab
                      ? 'text-secondary border-b-2 border-secondary -mb-px'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 0 && <DepartmentsTab showToast={showToast} />}
            {activeTab === 1 && <DoctorsTab showToast={showToast} />}
            {activeTab === 2 && <StaffTab showToast={showToast} />}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Hospitals Tab (SUPER_ADMIN) ────────────────────────────────────────────────

function HospitalsTab({ showToast }) {
  const [hospitals, setHospitals]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ name: '', address: '', phone: '', whatsappSenderId: '', planType: 'BASIC' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [expandedId, setExpandedId]         = useState(null)
  const [adminFormFor, setAdminFormFor]     = useState(null) // hospitalId
  const [adminForm, setAdminForm]           = useState({ name: '', email: '', password: '' })
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminError, setAdminError]         = useState('')

  const load = useCallback(async () => {
    try {
      const data = await hospitalApi.list()
      setHospitals(data)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const hospital = await hospitalApi.create(form)
      setHospitals(prev => [hospital, ...prev])
      setForm({ name: '', address: '', phone: '', whatsappSenderId: '', planType: 'BASIC' })
      setShowForm(false)
      showToast(`"${hospital.name}" registered`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegenToken(hospital) {
    try {
      const updated = await hospitalApi.regenerateDisplayToken(hospital.id)
      setHospitals(prev => prev.map(h => h.id === hospital.id ? updated : h))
      showToast('Display token regenerated')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function openAdminForm(hospitalId) {
    setAdminFormFor(hospitalId)
    setAdminForm({ name: '', email: '', password: '' })
    setAdminError('')
  }

  async function handleCreateAdmin(e, hospitalId) {
    e.preventDefault()
    setAdminSubmitting(true)
    setAdminError('')
    try {
      await hospitalApi.createAdmin(hospitalId, adminForm)
      setAdminFormFor(null)
      showToast('Admin account created — credentials can now be shared with the hospital owner')
    } catch (err) {
      setAdminError(err.message)
    } finally {
      setAdminSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Hospitals</h3>
          <p className="text-sm text-on-surface-variant">{hospitals.length} hospital{hospitals.length !== 1 ? 's' : ''} registered on the platform.</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Hospital
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 space-y-4">
          <h4 className="font-bold text-sm text-on-surface">Register Hospital</h4>
          {error && <ErrorBanner msg={error} />}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Hospital Name <span className="text-error">*</span>
              </label>
              <input
                autoFocus
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Sunshine General Hospital"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Address</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Street, City"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">WhatsApp Sender ID</label>
              <input
                name="whatsappSenderId"
                value={form.whatsappSenderId}
                onChange={handleChange}
                placeholder="Fast2SMS sender ID"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Plan <span className="text-error">*</span>
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'BASIC', label: 'Basic', desc: '1 dept · 3 doctors · 2 staff' },
                  { value: 'PRO',   label: 'Pro',   desc: '10 depts · 20 doctors · 20 staff' },
                ].map(plan => (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, planType: plan.value }))}
                    className={`flex-1 px-4 py-3 rounded-lg text-left border-2 transition-all ${
                      form.planType === plan.value
                        ? 'border-secondary bg-secondary/5'
                        : 'border-outline-variant/20 bg-surface-container-low hover:border-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                        form.planType === plan.value ? 'border-secondary' : 'border-outline-variant'
                      }`}>
                        {form.planType === plan.value && <span className="w-1.5 h-1.5 rounded-full bg-secondary block" />}
                      </span>
                      <span className={`text-sm font-bold ${form.planType === plan.value ? 'text-secondary' : 'text-on-surface'}`}>
                        {plan.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant ml-5">{plan.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !form.name.trim()}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              Register
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : hospitals.length === 0 ? (
        <EmptyState icon="domain" text="No hospitals registered yet." />
      ) : (
        <div className="space-y-3">
          {hospitals.map(h => (
            <div key={h.id} className={`bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden ${!h.isActive ? 'opacity-60' : ''}`}>
              {/* Row */}
              <div className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">domain</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-on-surface truncate">{h.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        h.planType === 'PRO' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
                      }`}>{h.planType}</span>
                      {!h.isActive && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-error/10 text-error">Inactive</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{h.address || 'No address'} {h.phone ? `· ${h.phone}` : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(prev => prev === h.id ? null : h.id)}
                  className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-lg">
                    {expandedId === h.id ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              {/* Expanded details */}
              {expandedId === h.id && (
                <div className="border-t border-outline-variant/10 px-6 py-4 bg-surface-container space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Hospital ID</p>
                      <p className="font-mono text-xs text-on-surface break-all">{h.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Registered</p>
                      <p className="text-xs text-on-surface">{h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">TV Display Token</p>
                      <div className="flex items-center gap-3">
                        <code className="text-xs font-mono bg-surface-container-lowest px-3 py-1.5 rounded-lg text-on-surface break-all flex-1">
                          {h.displayToken ?? 'Not generated'}
                        </code>
                        <button
                          onClick={() => handleRegenToken(h)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant text-xs font-bold rounded-lg hover:bg-surface-container-low transition-colors whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          Regenerate
                        </button>
                      </div>
                    </div>
                    {h.whatsappSenderId && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">WhatsApp Sender ID</p>
                        <p className="text-xs text-on-surface">{h.whatsappSenderId}</p>
                      </div>
                    )}
                  </div>

                  {/* Create Admin Account */}
                  <div className="border-t border-outline-variant/10 pt-4">
                    {adminFormFor === h.id ? (
                      <form onSubmit={(e) => handleCreateAdmin(e, h.id)} className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Create Admin Account</p>
                        {adminError && <ErrorBanner msg={adminError} />}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Name</label>
                            <input
                              autoFocus
                              value={adminForm.name}
                              onChange={e => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g. Rajesh Kumar"
                              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Email</label>
                            <input
                              type="email"
                              value={adminForm.email}
                              onChange={e => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="admin@hospital.com"
                              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Password</label>
                            <input
                              type="password"
                              value={adminForm.password}
                              onChange={e => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Temporary password"
                              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setAdminFormFor(null)}
                            className="flex-1 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-xs hover:bg-surface-container-low transition-colors">
                            Cancel
                          </button>
                          <button type="submit"
                            disabled={adminSubmitting || !adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password}
                            className="flex-1 py-2 rounded-lg bg-secondary text-white font-bold text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                            {adminSubmitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                            Create Account
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => openAdminForm(h.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg font-bold text-xs hover:brightness-110 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">manage_accounts</span>
                        Create Admin Account
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Departments Tab ────────────────────────────────────────────────────────────

function DepartmentsTab({ showToast }) {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [name, setName]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const load = useCallback(async () => {
    try {
      const data = await departmentApi.list()
      setDepartments(data)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const dept = await departmentApi.create(name.trim())
      setDepartments(prev => [...prev, dept])
      setName('')
      setShowForm(false)
      showToast(`Department "${dept.name}" created`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(dept) {
    try {
      await departmentApi.deactivate(dept.id)
      setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, isActive: false } : d))
      showToast(`"${dept.name}" deactivated`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Departments</h3>
          <p className="text-sm text-on-surface-variant">Departments define which queues can be opened.</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Department
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 space-y-4">
          <h4 className="font-bold text-sm text-on-surface">Add Department</h4>
          {error && <ErrorBanner msg={error} />}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Cardiology"
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              Create
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : departments.length === 0 ? (
        <EmptyState icon="domain_disabled" text="No departments yet. Add one to get started." />
      ) : (
        <div className="space-y-3">
          {departments.map(dept => (
            <div key={dept.id} className={`flex items-center justify-between bg-surface-container-lowest rounded-xl px-6 py-4 border border-outline-variant/10 ${!dept.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">category</span>
                <div>
                  <p className="font-bold text-on-surface">{dept.name}</p>
                  {!dept.isActive && <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Inactive</p>}
                </div>
              </div>
              {dept.isActive && (
                <button
                  onClick={() => handleDeactivate(dept)}
                  className="px-3 py-1.5 rounded-lg border border-error/30 text-error text-xs font-bold hover:bg-error/5 transition-colors"
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Doctors Tab ────────────────────────────────────────────────────────────────

function DoctorsTab({ showToast }) {
  const [doctors, setDoctors]         = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ name: '', specialization: '', departmentId: '' })
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const load = useCallback(async () => {
    try {
      const [docs, depts] = await Promise.all([doctorApi.list(), departmentApi.list()])
      setDoctors(docs)
      const active = depts.filter(d => d.isActive)
      setDepartments(active)
      if (active.length > 0) setForm(prev => ({ ...prev, departmentId: active[0].id }))
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.departmentId) return
    setSubmitting(true)
    setError('')
    try {
      const doc = await doctorApi.create({
        name: form.name.trim(),
        specialization: form.specialization.trim() || null,
        departmentId: form.departmentId,
      })
      setDoctors(prev => [...prev, doc])
      setForm({ name: '', specialization: '', departmentId: departments[0]?.id ?? '' })
      setShowForm(false)
      showToast(`Dr. ${doc.name} added`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleAvailability(doc) {
    try {
      const updated = await doctorApi.toggleAvailability(doc.id)
      setDoctors(prev => prev.map(d => d.id === doc.id ? updated : d))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleToggleQueuePerm(doc) {
    try {
      const updated = await doctorApi.toggleQueuePermission(doc.id)
      setDoctors(prev => prev.map(d => d.id === doc.id ? updated : d))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deptName = (id) => departments.find(d => d.id === id)?.name ?? '—'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Doctors</h3>
          <p className="text-sm text-on-surface-variant">Add doctors and control their availability and queue access.</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Add Doctor
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 space-y-4">
          <h4 className="font-bold text-sm text-on-surface">Add Doctor</h4>
          {error && <ErrorBanner msg={error} />}
          {departments.length === 0 && (
            <div className="text-sm text-on-surface-variant bg-surface-container-low rounded-lg px-4 py-3">
              No active departments found. Create a department first.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Full Name <span className="text-error">*</span></label>
              <input
                autoFocus
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Dr. Priya Sharma"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Specialization</label>
              <input
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                placeholder="e.g. Cardiologist"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Department <span className="text-error">*</span></label>
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
            >
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !form.name.trim() || !form.departmentId || departments.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              Add Doctor
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : doctors.length === 0 ? (
        <EmptyState icon="stethoscope" text="No doctors yet. Add one to get started." />
      ) : (
        <div className="space-y-3">
          {doctors.map(doc => (
            <div key={doc.id} className="bg-surface-container-lowest rounded-xl px-6 py-4 border border-outline-variant/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary text-lg">person</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{doc.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {doc.specialization || 'No specialization'} · {doc.departmentName || deptName(doc.departmentId)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Availability toggle */}
                  <Toggle
                    active={doc.isAvailable}
                    label={doc.isAvailable ? 'Available' : 'Unavailable'}
                    activeClass="bg-secondary/10 text-secondary border-secondary/20"
                    inactiveClass="bg-surface-container text-on-surface-variant border-outline-variant/20"
                    onClick={() => handleToggleAvailability(doc)}
                  />
                  {/* Queue permission toggle */}
                  <Toggle
                    active={doc.canManageQueue}
                    label={doc.canManageQueue ? 'Queue Access' : 'No Queue'}
                    activeClass="bg-primary/10 text-primary border-primary/20"
                    inactiveClass="bg-surface-container text-on-surface-variant border-outline-variant/20"
                    onClick={() => handleToggleQueuePerm(doc)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Staff Tab ──────────────────────────────────────────────────────────────────

function StaffTab({ showToast }) {
  const [staff, setStaff]           = useState([])
  const [doctors, setDoctors]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ name: '', email: '', password: '', role: 'RECEPTIONIST', doctorId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    try {
      const [staffList, docList] = await Promise.all([staffApi.list(), doctorApi.list()])
      setStaff(staffList)
      setDoctors(docList)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) return
    if (form.role === 'DOCTOR' && !form.doctorId) {
      setError('Select a doctor profile for DOCTOR role')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const member = await staffApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        doctorId: form.role === 'DOCTOR' ? form.doctorId : null,
      })
      setStaff(prev => [...prev, member])
      setForm({ name: '', email: '', password: '', role: 'RECEPTIONIST', doctorId: '' })
      setShowForm(false)
      showToast(`${member.name} added as ${member.role.replace('_', ' ')}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(member) {
    try {
      const updated = await staffApi.deactivate(member.id)
      setStaff(prev => prev.map(s => s.id === member.id ? updated : s))
      showToast(`${member.name} deactivated`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const ROLE_COLORS = {
    HOSPITAL_ADMIN: 'bg-primary/10 text-primary',
    DOCTOR:         'bg-secondary/10 text-secondary',
    RECEPTIONIST:   'bg-tertiary/10 text-on-tertiary-container',
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Staff</h3>
          <p className="text-sm text-on-surface-variant">Manage login accounts for your hospital's staff.</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Add Staff
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/20 space-y-4">
          <h4 className="font-bold text-sm text-on-surface">Add Staff Member</h4>
          {error && <ErrorBanner msg={error} />}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Full Name <span className="text-error">*</span></label>
              <input
                autoFocus
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Mehta"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Email <span className="text-error">*</span></label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="staff@hospital.com"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Password <span className="text-error">*</span></label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Role <span className="text-error">*</span></label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              >
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Doctor profile selector — only when role is DOCTOR */}
          {form.role === 'DOCTOR' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Link to Doctor Profile <span className="text-error">*</span>
              </label>
              <select
                name="doctorId"
                value={form.doctorId}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
              >
                <option value="">Select doctor…</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} · {d.departmentName}</option>)}
              </select>
              <p className="text-[11px] text-on-surface-variant ml-1">
                The login will be linked to this doctor's profile for queue access.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !form.name.trim() || !form.email.trim() || !form.password}
              className="flex-1 py-2.5 rounded-lg bg-secondary text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              Add Staff
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : staff.length === 0 ? (
        <EmptyState icon="group" text="No staff members yet." />
      ) : (
        <div className="space-y-3">
          {staff.map(member => (
            <div key={member.id} className={`bg-surface-container-lowest rounded-xl px-6 py-4 border border-outline-variant/10 ${!member.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">account_circle</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-on-surface">{member.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${ROLE_COLORS[member.role] ?? 'bg-surface-container text-on-surface-variant'}`}>
                        {member.role.replace('_', ' ')}
                      </span>
                      {!member.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-error/10 text-error">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant">{member.email}</p>
                  </div>
                </div>
                {member.isActive && (
                  <button
                    onClick={() => handleDeactivate(member)}
                    className="px-3 py-1.5 rounded-lg border border-error/30 text-error text-xs font-bold hover:bg-error/5 transition-colors whitespace-nowrap"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function Toggle({ active, label, activeClass, inactiveClass, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 ${active ? activeClass : inactiveClass}`}
    >
      {label}
    </button>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div className="flex items-center gap-2 bg-error/10 border border-error/20 text-error rounded-lg px-3 py-2 text-xs">
      <span className="material-symbols-outlined text-base shrink-0">error</span>
      {msg}
    </div>
  )
}

function LoadingSkeleton({ rows }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-surface-container-low rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
      <span className="material-symbols-outlined text-4xl mb-3 opacity-30">{icon}</span>
      <p className="text-sm font-medium">{text}</p>
    </div>
  )
}
