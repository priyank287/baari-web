import api from './apiClient'

const departmentApi = {
  list: async () => {
    const res = await api.get('/api/departments')
    if (!res.ok) throw new Error('Failed to fetch departments')
    return res.json()
  },

  create: async (name) => {
    const res = await api.post('/api/departments', { name })
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to create department')
      throw new Error(msg)
    }
    return res.json()
  },

  deactivate: async (id) => {
    const res = await api.delete(`/api/departments/${id}`)
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to deactivate department')
      throw new Error(msg)
    }
  },
}

export default departmentApi
