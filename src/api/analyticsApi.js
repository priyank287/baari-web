import apiClient from './apiClient'

export const analyticsApi = {
  getSummary: async (days = 30) => {
    const res = await apiClient.get(`/api/analytics/summary?days=${days}`)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.json()
  },
}
