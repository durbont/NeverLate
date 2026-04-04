// API helpers for commute management in NeverLate.
// All requests attach the JWT token from localStorage in the Authorization header.
// getCommutes() fetches the logged-in user's commutes.
// createCommute() creates a new named commute for the logged-in user.

import axios from 'axios'

export interface CommuteStop {
  lineIds: string[]
  stopId: string
  stopName: string
  direction: string
}

export interface Commute {
  id: number
  name: string
  startAddress: string | null
  endAddress: string | null
  stops: CommuteStop[]
  createdAt: string
}

export interface CreateCommutePayload {
  name: string
  startAddress: string
  endAddress: string
  stops: CommuteStop[]
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

export async function getCommutes(): Promise<Commute[]> {
  const response = await axios.get<Commute[]>('/api/commutes', { headers: authHeaders() })
  return response.data
}

export async function createCommute(payload: CreateCommutePayload): Promise<Commute> {
  const response = await axios.post<Commute>('/api/commutes', payload, { headers: authHeaders() })
  return response.data
}

export async function deleteCommute(id: number): Promise<void> {
  await axios.delete(`/api/commutes/${id}`, { headers: authHeaders() })
}

export async function reorderCommutes(ids: number[]): Promise<void> {
  await axios.put('/api/commutes/reorder', { ids }, { headers: authHeaders() })
}
