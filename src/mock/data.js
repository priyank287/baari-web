// ─── Patients ────────────────────────────────────────────────────────────────
// 10 patients, mixed statuses: 4 done · 1 in-consultation · 1 notified · 4 waiting
export const mockPatients = [
  {
    id: 1, token: '#038', name: 'Elim Garak',
    dept: 'Dermatology',      deptIcon: 'face_retouching_natural',
    addedAgo: '62m ago',      doctor: 'Dr. Elena Rossi',
    waitMins: null,           note: 'Annual skin check. No concerns raised.',
    status: 'done',
  },
  {
    id: 2, token: '#039', name: 'Worf Son of Mogh',
    dept: 'Orthopedics',      deptIcon: 'accessibility_new',
    addedAgo: '54m ago',      doctor: 'Dr. Marcus Thorne',
    waitMins: null,           note: 'Shoulder injury follow-up. Referred for physiotherapy.',
    status: 'done',
  },
  {
    id: 3, token: '#040', name: 'Keiko O\'Brien',
    dept: 'General Medicine', deptIcon: 'stethoscope',
    addedAgo: '47m ago',      doctor: 'Dr. Julian Vane',
    waitMins: null,           note: '',
    status: 'done',
  },
  {
    id: 4, token: '#041', name: 'Jadzia Dax',
    dept: 'Neurology',        deptIcon: 'psychology',
    addedAgo: '38m ago',      doctor: 'Dr. Elena Rossi',
    waitMins: null,           note: 'Routine check-up. No follow-up required.',
    status: 'done',
  },
  {
    id: 5, token: '#042', name: 'Julianne Moore',
    dept: 'Check-up',         deptIcon: 'stethoscope',
    addedAgo: '5m ago',       doctor: 'Dr. Julian Vane',
    waitMins: null,           note: 'Requested a silent waiting area. Previous visit 2 weeks ago for routine vitals.',
    status: 'in-consultation',
  },
  {
    id: 6, token: '#043', name: 'Benjamin Sisko',
    dept: 'Cardiology',       deptIcon: 'medical_information',
    addedAgo: '10m ago',      doctor: 'Dr. Julian Vane',
    waitMins: 0,              note: 'Follow-up on last month\'s stress test results.',
    status: 'notified',
  },
  {
    id: 7, token: '#044', name: 'Kira Nerys',
    dept: 'Emergency',        deptIcon: 'medical_services',
    addedAgo: '14m ago',      doctor: 'Dr. Julian Vane',
    waitMins: 8,              note: 'Possible fracture in right arm. Needs X-ray before consult.',
    status: 'waiting',
  },
  {
    id: 8, token: '#045', name: 'Odo Const',
    dept: 'Pharmacy',         deptIcon: 'pill',
    addedAgo: '22m ago',      doctor: 'Dr. Marcus Thorne',
    waitMins: 15,             note: '',
    status: 'waiting',
  },
  {
    id: 9, token: '#046', name: 'Miles O\'Brien',
    dept: 'General Medicine', deptIcon: 'stethoscope',
    addedAgo: '29m ago',      doctor: 'Dr. Julian Vane',
    waitMins: 22,             note: 'Recurring back pain. Previous MRI on file.',
    status: 'waiting',
  },
  {
    id: 10, token: '#047', name: 'Leeta Bajoran',
    dept: 'Cardiology',       deptIcon: 'medical_information',
    addedAgo: '35m ago',      doctor: 'Dr. Elena Rossi',
    waitMins: 30,             note: '',
    status: 'waiting',
  },
]

// ─── Doctor ───────────────────────────────────────────────────────────────────
// The currently active attending doctor for this session
export const mockDoctor = {
  id: 1,
  name: 'Dr. Julian Vane',
  role: 'Senior Cardiologist',
  dept: 'General Medicine',
  counter: 'Counter 04',
}

// ─── Clinic ───────────────────────────────────────────────────────────────────
export const mockClinic = {
  name: 'Baari',
  wing: 'Wing A',
  // Tabs shown in the dashboard queue section
  departmentTabs: ['General Medicine', 'Pediatrics', 'Cardiology', 'Orthopedics', 'Dermatology'],
  // Staff shown in the admin console
  doctors: [
    { id: 1, name: 'Dr. Julian Vane',   role: 'Senior Cardiologist' },
    { id: 2, name: 'Dr. Elena Rossi',   role: 'Neurology Dept.'     },
    { id: 3, name: 'Dr. Marcus Thorne', role: 'Orthopedic Surgery'  },
  ],
  // Departments shown in the admin console
  departments: [
    { name: 'Cardiology',     icon: 'favorite',   onDuty: 3,  waiting: 14 },
    { name: 'Neurology',      icon: 'psychology', onDuty: 2,  waiting: 8  },
    { name: 'Ophthalmology',  icon: 'visibility', onDuty: 4,  waiting: 5  },
    { name: 'Emergency Wing', icon: 'emergency',  onDuty: 12, waiting: 24 },
  ],
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export const mockStats = {
  avgWait: 14,      // minutes
  totalDaily: 84,
  onCallCount: 12,
  infrastructure: [
    { label: 'Queue Load',    value: 'Normal',  pct: '45%' },
    { label: 'Active Staff',  value: '28 / 40', pct: '70%' },
    { label: 'Avg. Response', value: '4.2m',    pct: '90%' },
  ],
  systemHealth: 'Optimum',
}
