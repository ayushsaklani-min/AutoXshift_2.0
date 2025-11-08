const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'autoxshift_token'
const USER_KEY = 'autoxshift_user'

export interface User {
  id: string
  walletAddress: string
  username?: string
  points: number
  reputationScore: number
  preferences?: any
}

export interface AuthResponse {
  success: boolean
  data: {
    user: User
    token: string
  }
}

/**
 * Authenticate with wallet address
 */
export async function authenticateWallet(walletAddress: string, referralCode?: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      referralCode,
    }),
  })

  if (!response.ok) {
    throw new Error('Authentication failed')
  }

  const data = await response.json()
  
  if (data.success) {
    // Store token and user
    setToken(data.data.token)
    setUser(data.data.user)
  }

  return data
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getToken()
  if (!token) return null

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      clearAuth()
      return null
    }

    const data = await response.json()
    if (data.success) {
      setUser(data.data.user)
      return data.data.user
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    clearAuth()
  }

  return null
}

/**
 * Update user preferences
 */
export async function updatePreferences(preferences: any): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    const response = await fetch(`${API_URL}/api/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ preferences }),
    })

    return response.ok
  } catch (error) {
    console.error('Error updating preferences:', error)
    return false
  }
}

/**
 * Get stored token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Set token
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * Get stored user
 */
export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Set user
 */
export function setUser(user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * Clear authentication
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken()
}

/**
 * Get auth headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

