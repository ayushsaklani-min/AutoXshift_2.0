import { getAuthHeaders } from './auth'

// Determine API URL based on environment
const getApiUrl = () => {
  // In browser, always use window location to determine
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // Production deployment - check for Vercel or custom domain
    if (hostname.includes('vercel.app') || hostname.includes('vercel') || hostname.includes('autoxshift')) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://autoxshift-2-0-1.onrender.com'
      console.log('[API] Production mode - Using backend URL:', backendUrl)
      return backendUrl
    }
    // Local development - use explicit env var or default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    console.log('[API] Development mode - Using backend URL:', apiUrl)
    return apiUrl
  }
  // Server-side: prefer BACKEND_URL for production, fallback to API_URL
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

// Get API URL dynamically (not at module load time)
const getAPI_URL = () => getApiUrl()

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const API_URL = getAPI_URL()
  const url = `${API_URL}${endpoint}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  }

  // Debug logging (always log in browser for debugging)
  if (typeof window !== 'undefined') {
    console.log(`[API] ${options.method || 'GET'} ${url}`)
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type')
    let data: any
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      throw new ApiError(
        text || 'Request failed',
        response.status,
        { text }
      )
    }

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'Request failed',
        response.status,
        data
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiUrl = getAPI_URL()
      throw new ApiError(
        `Network error: Unable to connect to the server at ${apiUrl}. Please check your connection and DNS settings.`,
        0,
        { originalError: error.message, apiUrl }
      )
    }
    throw error
  }
}

// Swap API
export const swapApi = {
  getQuote: async (params: {
    fromToken: string
    fromNetwork: string
    toToken: string
    toNetwork: string
    amount: string
    settleAddress: string
  }) => {
    return request<{ success: boolean; data: any }>('/api/swap/quote', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  createShift: async (params: {
    quoteId: string
    settleAddress: string
  }) => {
    return request<{ success: boolean; data: any }>('/api/swap/shift', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  getStatus: async (shiftId: string) => {
    return request<{ success: boolean; data: any }>(`/api/swap/status/${shiftId}`)
  },

  getTokens: async () => {
    return request<{ success: boolean; data: any[] }>('/api/swap/tokens')
  },

  getHistory: async (limit = 50, offset = 0) => {
    return request<{ success: boolean; data: any[] }>(
      `/api/swap/history?limit=${limit}&offset=${offset}`
    )
  },
}

// Campaign API
export const campaignApi = {
  create: async (params: {
    title: string
    description: string
    goalAmount: string
    goalToken: string
    goalNetwork: string
    imageUrl?: string
    category?: string
    expiresAt?: string
  }) => {
    return request<{ success: boolean; data: any }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  list: async (filters?: {
    status?: string
    category?: string
    limit?: number
    offset?: number
  }) => {
    const query = new URLSearchParams()
    if (filters?.status) query.append('status', filters.status)
    if (filters?.category) query.append('category', filters.category)
    if (filters?.limit) query.append('limit', filters.limit.toString())
    if (filters?.offset) query.append('offset', filters.offset.toString())

    return request<{ success: boolean; data: any[] }>(
      `/api/campaigns?${query.toString()}`
    )
  },

  get: async (id: string) => {
    return request<{ success: boolean; data: any }>(`/api/campaigns/${id}`)
  },

  donate: async (campaignId: string, params: {
    donorAddress: string
    fromToken: string
    fromNetwork: string
    amount: string
    message?: string
    anonymous?: boolean
  }) => {
    return request<{ success: boolean; data: any }>(
      `/api/campaigns/${campaignId}/donate`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    )
  },

  getDonations: async (campaignId: string, limit = 50, offset = 0) => {
    return request<{ success: boolean; data: any[] }>(
      `/api/campaigns/${campaignId}/donations?limit=${limit}&offset=${offset}`
    )
  },
}

// Portfolio API
export const portfolioApi = {
  createSnapshot: async (tokens: any[]) => {
    return request<{ success: boolean; data: any }>('/api/portfolio/snapshot', {
      method: 'POST',
      body: JSON.stringify({ tokens }),
    })
  },

  getHistory: async (limit = 30) => {
    return request<{ success: boolean; data: any[] }>(
      `/api/portfolio/history?limit=${limit}`
    )
  },

  analyze: async (tokens: any[]) => {
    return request<{ success: boolean; data: any }>('/api/portfolio/analyze', {
      method: 'POST',
      body: JSON.stringify({ tokens }),
    })
  },

  getRebalancing: async (tokens: any[]) => {
    return request<{ success: boolean; data: any }>('/api/portfolio/rebalance', {
      method: 'POST',
      body: JSON.stringify({ tokens }),
    })
  },
}

// Analytics API
export const analyticsApi = {
  getDashboard: async () => {
    return request<{ success: boolean; data: any }>('/api/analytics/dashboard')
  },

  getSwapStats: async (timeframe = '30d') => {
    return request<{ success: boolean; data: any[] }>(
      `/api/analytics/swaps?timeframe=${timeframe}`
    )
  },

  getTopTokens: async (limit = 10) => {
    return request<{ success: boolean; data: any[] }>(
      `/api/analytics/tokens?limit=${limit}`
    )
  },

  getActivity: async (limit = 50) => {
    return request<{ success: boolean; data: any[] }>(
      `/api/analytics/activity?limit=${limit}`
    )
  },
}

// AI API
export const aiApi = {
  getRecommendations: async (params: {
    fromToken: string
    toToken: string
    amount: number
  }) => {
    const query = new URLSearchParams({
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount.toString(),
    })
    return request<{ success: boolean; data: any[] }>(
      `/api/ai/recommend?${query.toString()}`
    )
  },

  analyzeMarket: async (tokens: string[], timeframe = '24h') => {
    return request<{ success: boolean; data: any }>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ tokens, timeframe }),
    })
  },

  explainSwap: async (transaction: any) => {
    return request<{ success: boolean; data: string }>('/api/ai/explain', {
      method: 'POST',
      body: JSON.stringify({ transaction }),
    })
  },
}

