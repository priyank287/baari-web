import api from './apiClient'

const staffApi = {
  list: async () => {
    const res = await api.get('/api/staff')
    if (!res.ok) throw new Error('Failed to fetch staff')
    return res.json()
  },

  create: async (payload) => {
    const res = await api.post('/api/staff', payload)
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to create staff')
      throw new Error(msg)
    }
    return res.json()
  },

  deactivate: async (id) => {
    const res = await api.patch(`/api/staff/${id}/deactivate`)
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to deactivate staff')
      throw new Error(msg)
    }
    return res.json()
  },
}

export default staffApi
