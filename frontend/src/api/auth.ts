// Authentication API helpers for the NeverLate frontend.
// Wraps the backend /api/auth endpoints (signup, login, logout) using axios.
// After a successful login or signup, the JWT token and user email are stored in
// localStorage so they can be attached to future authenticated requests.

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export interface AuthResponse {
  token: string
  email: string
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_URL}/api/auth/signup`, { email, password })
  localStorage.setItem('token', response.data.token)
  localStorage.setItem('email', response.data.email)
  return response.data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_URL}/api/auth/login`, { email, password })
  localStorage.setItem('token', response.data.token)
  localStorage.setItem('email', response.data.email)
  return response.data
}

export function logout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('email')
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}
