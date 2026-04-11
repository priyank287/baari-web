import api from './apiClient'

const doctorApi = {
  list: async () => {
    const res = await api.get('/api/doctors')
    if (!res.ok) throw new Error('Failed to fetch doctors')
    return res.json()
  },

  create: async (payload) => {
    const res = await api.post('/api/doctors', payload)
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to create doctor')
      throw new Error(msg)
    }
    return res.json()
  },

  toggleAvailability: async (id) => {
    const res = await api.patch(`/api/doctors/${id}/availability`)
    if (!res.ok) throw new Error('Failed to update availability')
    return res.json()
  },

  toggleQueuePermission: async (id) => {
    const res = await api.patch(`/api/doctors/${id}/queue-permission`)
    if (!res.ok) throw new Error('Failed to update queue permission')
    return res.json()
  },
}

export default doctorApi
