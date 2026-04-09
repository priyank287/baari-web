import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import { mockDoctor, mockClinic, mockStats } from '../mock/data'
import { useQueue } from '../context/QueueContext'

const EMPTY_FORM = {
  name:   '',
  phone:  '',
  age:    '',
  gender: '',
  dept:   mockClinic.departmentTabs[0],
  note:   '',
}

function validate(f) {
  const e = {}
  if (!f.name || f.name.trim().length < 2)
    e.name = 'Name must be at least 2 characters'
  if (!/^\d{10}$/.test(f.phone))
    e.phone = 'Enter a valid 10-digit mobile number'
  const age = parseInt(f.age, 10)
  if (!f.age || isNaN(age) || age < 1 || age > 120)
    e.age = 'Age must be between 1 and 120'
  if (!f.gender)
    e.gender = 'Please select a gender'
  return e
}

export default function ReceptionDashboard() {
  const { patients, addPatient } = useQueue()
  const [form, setForm]           = useState(EMPTY_FORM)
  const [errors, setErrors]       = useState({})
  const [toast, setToast]         = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  // Derived queue data — reactive to state
  const inConsultation = patients.find(p => p.status === 'in-consultation')
  const queuePatients  = patients.filter(p => p.status === 'notified' || p.status === 'waiting')

  // ── Form handlers ────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function handleNumericChange(name, maxLen) {
    return (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, maxLen)
      setForm(prev => ({ ...prev, [name]: val }))
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    addPatient(form)

    const maxToken = patients.reduce(
      (max, p) => Math.max(max, parseInt(p.token.replace('#', ''), 10)),
      0,
    )
    const nextToken = `#${String(maxToken + 1).padStart(3, '0')}`
    setToast(`Patient added · Token ${nextToken} assigned · WhatsApp notification will be sent`)
    setTimeout(() => setToast(null), 3000)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  return (
    <div className="bg-surface text-on-surface flex min-h-screen">
      <Sidebar showAddPatient />

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 bg-on-surface text-inverse-on-surface px-5 py-4 rounded-xl clinical-shadow flex items-center gap-3 max-w-xs">
          <span className="material-symbols-outlined text-secondary-fixed text-xl shrink-0">check_circle</span>
          <p className="text-sm font-medium leading-snug">{toast}</p>
        </div>
      )}

      <main className="flex-1 ml-16 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Nav */}
        <header className="sticky top-0 z-50 flex justify-between items-center px-6 h-16 w-full glass-header border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tighter text-slate-900">Baari</span>
            <span className="hidden lg:block text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">It&apos;s your turn now</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-150">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-150">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="h-8 w-8 rounded-full overflow-hidden ml-2 ring-2 ring-slate-100 bg-slate-200" />
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col gap-8 bg-surface">
          {/* Department Tabs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold uppercase tracking-widest text-on-surface-variant text-sm">Active Departments</h2>
              <span className="text-xs text-secondary font-medium px-2 py-1 bg-secondary-container rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></span>
                Live Updates
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {mockClinic.departmentTabs.map((dept, i) => (
                <button
                  key={dept}
                  onClick={() => setActiveTab(i)}
                  className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                    i === activeTab
                      ? 'bg-surface-container-lowest text-secondary border-b-2 border-secondary'
                      : 'text-on-surface-variant hover:bg-surface-container-low rounded-t-lg'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </section>

          {/* Main Panels */}
          <div className="grid grid-cols-12 gap-8 flex-1">

            {/* Left Panel: Active Queue */}
            <section className="col-span-12 lg:col-span-7 bg-surface-container-low rounded-xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-on-surface">Queue: {mockDoctor.name}</h3>
                  <p className="text-sm text-on-surface-variant">{mockDoctor.dept} • {queuePatients.length} Patient{queuePatients.length !== 1 ? 's' : ''} Waiting</p>
                </div>
                <div className="bg-surface-container-lowest px-4 py-2 rounded-lg shadow-sm">
                  <span className="text-[10px] block font-bold uppercase tracking-tighter text-on-surface-variant">Avg. Wait</span>
                  <span className="text-lg font-bold text-secondary tracking-tight">{mockStats.avgWait}m</span>
                </div>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
                {/* Current Patient */}
                {inConsultation && (
                  <div className="bg-surface-container-lowest p-4 rounded-xl ambient-shadow flex items-center border-l-4 border-secondary">
                    <div className="w-12 h-12 rounded-lg bg-secondary-container flex flex-col items-center justify-center mr-4">
                      <span className="text-[10px] font-bold text-secondary leading-none">TOKEN</span>
                      <span className="text-xl font-black text-secondary leading-none">{inConsultation.token.replace('#', '')}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-on-surface">{inConsultation.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 bg-secondary text-white rounded-full uppercase font-bold tracking-widest">In Consultation</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{inConsultation.dept} • {inConsultation.doctor}</p>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 py-2">
                  <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
                  <div className="flex items-center gap-2 text-secondary text-[10px] font-bold uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                    </span>
                    Next in Line
                  </div>
                  <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
                </div>

                {/* Queue */}
                {queuePatients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl mb-2 opacity-30">group_off</span>
                    <p className="text-sm font-medium">No patients waiting</p>
                  </div>
                )}

                {queuePatients.map((patient) => (
                  <div key={patient.id} className="bg-surface-container-lowest/60 p-4 rounded-xl flex items-center hover:bg-surface-container-lowest transition-all group cursor-pointer">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex flex-col items-center justify-center mr-4 group-hover:bg-tertiary-fixed transition-colors">
                      <span className="text-[10px] font-bold text-on-surface-variant leading-none">TOKEN</span>
                      <span className="text-xl font-black text-on-surface leading-none">{patient.token.replace('#', '')}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-on-surface">{patient.name}</h4>
                      <p className="text-xs text-on-surface-variant">
                        {patient.waitMins != null && patient.waitMins > 0
                          ? `Waiting: ~${patient.waitMins} mins`
                          : 'Being called now'}
                      </p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 px-4 py-2 text-xs font-bold bg-secondary-container text-on-secondary-container rounded-lg transition-all">
                      Call Patient
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Right Panel */}
            <section className="col-span-12 lg:col-span-5 flex flex-col gap-6">

              {/* ── Registration Card ───────────────────────────────────────── */}
              <div className="bg-surface-container-lowest rounded-xl p-8 ambient-shadow">
                <div className="mb-6">
                  <h3 className="text-xl font-black tracking-tight text-on-surface">New Registration</h3>
                  <p className="text-sm text-on-surface-variant">Quick patient enrollment for immediate queueing.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block ml-1">
                      Full Name <span className="text-error">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Aditya Sharma"
                      className={`w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm placeholder:text-slate-400 border-0 outline-none ring-2 transition-all ${
                        errors.name ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                      }`}
                    />
                    {errors.name && <FieldError msg={errors.name} />}
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block ml-1">
                      Mobile Number <span className="text-error">*</span>
                    </label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleNumericChange('phone', 10)}
                      placeholder="10-digit number"
                      inputMode="numeric"
                      className={`w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm placeholder:text-slate-400 border-0 outline-none ring-2 transition-all ${
                        errors.phone ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                      }`}
                    />
                    {errors.phone && <FieldError msg={errors.phone} />}
                  </div>

                  {/* Age + Gender */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block ml-1">
                        Age <span className="text-error">*</span>
                      </label>
                      <input
                        name="age"
                        value={form.age}
                        onChange={handleNumericChange('age', 3)}
                        placeholder="e.g. 34"
                        inputMode="numeric"
                        className={`w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm placeholder:text-slate-400 border-0 outline-none ring-2 transition-all ${
                          errors.age ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                        }`}
                      />
                      {errors.age && <FieldError msg={errors.age} />}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block ml-1">
                        Gender <span className="text-error">*</span>
                      </label>
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                        className={`w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm border-0 outline-none ring-2 transition-all ${
                          errors.gender ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                        }`}
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <FieldError msg={errors.gender} />}
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block ml-1">Department</label>
                    <select
                      name="dept"
                      value={form.dept}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30 transition-all"
                    >
                      {mockClinic.departmentTabs.map(dept => (
                        <option key={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Doctor — pre-filled, read-only */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block ml-1">Doctor</label>
                    <div className="w-full bg-surface-container rounded-lg px-4 py-3 text-sm text-on-surface-variant flex items-center gap-2 select-none">
                      <span className="material-symbols-outlined text-sm">person</span>
                      {mockDoctor.name}
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-outline">Pre-assigned</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full btn-primary-gradient text-white py-4 rounded-xl font-bold tracking-tight shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">person_add</span>
                      Add to Queue
                    </button>
                  </div>
                </form>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary-container/30 p-4 rounded-xl">
                  <span className="material-symbols-outlined text-secondary mb-2">medical_services</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-secondary-fixed-variant">On-Call</p>
                  <p className="text-2xl font-black text-on-secondary-container">{mockStats.onCallCount}</p>
                  <p className="text-[10px] text-on-secondary-fixed-variant/70">Specialists available</p>
                </div>
                <div className="bg-surface-container-high p-4 rounded-xl">
                  <span className="material-symbols-outlined text-on-surface-variant mb-2">schedule</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">System Load</p>
                  <p className="text-2xl font-black text-on-surface">Normal</p>
                  <p className="text-[10px] text-on-surface-variant/70">Wait-times stable</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

function FieldError({ msg }) {
  return (
    <p className="text-[11px] text-error font-medium flex items-center gap-1 mt-1 ml-1">
      <span className="material-symbols-outlined text-sm leading-none">error</span>
      {msg}
    </p>
  )
}
