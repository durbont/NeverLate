import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export interface Arrival {
  lineId: string
  arrivalTime: number   // Unix epoch seconds, from MTA feed (unmodified)
  minutesAway: number
}

export interface ArrivalsResponse {
  arrivals: Arrival[]
  fetchedAt: number       // Unix epoch seconds — when our server fetched from MTA
  feedTimestamp: number   // Unix epoch seconds — timestamp from MTA FeedHeader
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

export async function fetchArrivals(
  stopId: string,
  direction: string,
  lineIds: string[]
): Promise<ArrivalsResponse> {
  const response = await axios.get<ArrivalsResponse>(`${API_URL}/api/arrivals`, {
    headers: authHeaders(),
    params: { stopId, direction, lineIds: lineIds.join(',') },
  })
  return response.data
}
