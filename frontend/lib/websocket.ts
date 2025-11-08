const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 
  (typeof window !== 'undefined' 
    ? `ws://${window.location.hostname}:3001/ws`
    : 'ws://localhost:3001/ws')

export type WebSocketMessage = 
  | { type: 'connected'; clientId: string; timestamp: number }
  | { type: 'authenticated'; userId: string; timestamp: number }
  | { type: 'subscribed'; channel: string; timestamp: number }
  | { type: 'unsubscribed'; channel: string; timestamp: number }
  | { type: 'broadcast'; channel: string; data: any; timestamp: number }
  | { type: 'message'; data: any; timestamp: number }
  | { type: 'error'; message: string; timestamp: number }

export type WebSocketCallback = (message: WebSocketMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private callbacks: Set<WebSocketCallback> = new Set()
  private subscriptions: Set<string> = new Set()
  private token: string | null = null
  private isConnecting = false

  connect(token?: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection)
            resolve()
          }
        }, 100)
      })
    }

    this.isConnecting = true
    this.token = token || null

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL)

        this.ws.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          console.log('WebSocket connected')

          // Authenticate if token provided
          if (this.token) {
            this.authenticate(this.token)
          }

          // Resubscribe to channels
          this.subscriptions.forEach((channel) => {
            this.subscribe(channel)
          })

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          this.isConnecting = false
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          this.isConnecting = false
          console.log('WebSocket disconnected')
          this.attemptReconnect()
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private handleMessage(message: WebSocketMessage): void {
    // Notify all callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback(message)
      } catch (error) {
        console.error('Error in WebSocket callback:', error)
      }
    })
  }

  authenticate(token: string): void {
    this.token = token
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'authenticate',
        token,
      }))
    }
  }

  subscribe(channel: string): void {
    this.subscriptions.add(channel)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel,
      }))
    }
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
      }))
    }
  }

  onMessage(callback: WebSocketCallback): () => void {
    this.callbacks.add(callback)
    return () => {
      this.callbacks.delete(callback)
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      this.connect(this.token || undefined).catch(() => {
        // Reconnection will be attempted again
      })
    }, delay)
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscriptions.clear()
    this.callbacks.clear()
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton instance
export const wsClient = new WebSocketClient()

