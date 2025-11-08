import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { logger } from '../utils/logger'
import { authService } from './authService'

interface ClientConnection {
  ws: WebSocket
  userId?: string
  walletAddress?: string
  subscriptions: Set<string>
}

class WebSocketService {
  private wss: WebSocketServer | null = null
  private clients: Map<string, ClientConnection> = new Map()

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' })

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId()
      const connection: ClientConnection = {
        ws,
        subscriptions: new Set(),
      }

      this.clients.set(clientId, connection)

      logger.info(`WebSocket client connected: ${clientId}`)

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString())
          await this.handleMessage(clientId, data)
        } catch (error) {
          logger.error('WebSocket message error:', error)
          this.sendError(ws, 'Invalid message format')
        }
      })

      ws.on('close', () => {
        this.clients.delete(clientId)
        logger.info(`WebSocket client disconnected: ${clientId}`)
      })

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error)
      })

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        clientId,
        timestamp: Date.now(),
      })
    })

    logger.info('WebSocket server initialized')
  }

  private async handleMessage(clientId: string, data: any) {
    const connection = this.clients.get(clientId)
    if (!connection) return

    switch (data.type) {
      case 'authenticate':
        await this.handleAuthenticate(clientId, data.token)
        break
      case 'subscribe':
        this.handleSubscribe(clientId, data.channel)
        break
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, data.channel)
        break
      default:
        this.sendError(connection.ws, 'Unknown message type')
    }
  }

  private async handleAuthenticate(clientId: string, token: string) {
    const connection = this.clients.get(clientId)
    if (!connection) return

    const payload = authService.verifyToken(token)
    if (payload) {
      connection.userId = payload.userId
      connection.walletAddress = payload.walletAddress
      this.send(connection.ws, {
        type: 'authenticated',
        userId: payload.userId,
        timestamp: Date.now(),
      })
    } else {
      this.sendError(connection.ws, 'Authentication failed')
    }
  }

  private handleSubscribe(clientId: string, channel: string) {
    const connection = this.clients.get(clientId)
    if (!connection) return

    connection.subscriptions.add(channel)
    this.send(connection.ws, {
      type: 'subscribed',
      channel,
      timestamp: Date.now(),
    })
  }

  private handleUnsubscribe(clientId: string, channel: string) {
    const connection = this.clients.get(clientId)
    if (!connection) return

    connection.subscriptions.delete(channel)
    this.send(connection.ws, {
      type: 'unsubscribed',
      channel,
      timestamp: Date.now(),
    })
  }

  // Broadcast to all clients subscribed to a channel
  broadcast(channel: string, data: any) {
    let count = 0
    this.clients.forEach((connection) => {
      if (connection.subscriptions.has(channel)) {
        this.send(connection.ws, {
          type: 'broadcast',
          channel,
          data,
          timestamp: Date.now(),
        })
        count++
      }
    })
    logger.debug(`Broadcasted to ${count} clients on channel: ${channel}`)
  }

  // Send to specific user
  sendToUser(userId: string, data: any) {
    this.clients.forEach((connection) => {
      if (connection.userId === userId) {
        this.send(connection.ws, {
          type: 'message',
          data,
          timestamp: Date.now(),
        })
      }
    })
  }

  // Send to specific wallet
  sendToWallet(walletAddress: string, data: any) {
    this.clients.forEach((connection) => {
      if (connection.walletAddress?.toLowerCase() === walletAddress.toLowerCase()) {
        this.send(connection.ws, {
          type: 'message',
          data,
          timestamp: Date.now(),
        })
      }
    })
  }

  private send(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.send(ws, {
      type: 'error',
      message,
      timestamp: Date.now(),
    })
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  getConnectedCount(): number {
    return this.clients.size
  }
}

export const websocketService = new WebSocketService()

