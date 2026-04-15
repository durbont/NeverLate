import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

export interface CommuteLog {
  id: number
  startedAt: number       // Unix epoch seconds
  endedAt: number         // Unix epoch seconds
  durationSeconds: number
}

export interface LogsResponse {
  logs: CommuteLog[]
  page: number
  totalPages: number
  hasMore: boolean
}

export async function fetchCommuteLogs(commuteId: number, page = 0): Promise<LogsResponse> {
  const res = await axios.get<LogsResponse>(`${API_URL}/api/commutes/${commuteId}/logs`, {
    headers: authHeaders(),
    params: { page },
  })
  return res.data
}

export interface CommuteStats {
  count: number
  meanSeconds?: number
  p75Seconds?: number
  p90Seconds?: number
  sixSigmaSeconds?: number
}

export async function fetchCommuteStats(commuteId: number): Promise<CommuteStats> {
  const res = await axios.get<CommuteStats>(`${API_URL}/api/commutes/${commuteId}/stats`, {
    headers: authHeaders(),
  })
  return res.data
}

export async function deleteCommuteLog(commuteId: number, logId: number): Promise<void> {
  await axios.delete(`${API_URL}/api/commutes/${commuteId}/logs/${logId}`, {
    headers: authHeaders(),
  })
}

export async function saveCommuteLog(
  commuteId: number,
  startedAt: number,   // Unix epoch seconds
  endedAt: number      // Unix epoch seconds
): Promise<void> {
  await axios.post(
    `${API_URL}/api/commutes/${commuteId}/logs`,
    { startedAt, endedAt },
    { headers: authHeaders() }
  )
}
