'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  History, 
  ArrowUpDown, 
  CheckCircle, 
  Clock, 
  XCircle,
  ExternalLink,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react'
import { formatTimeAgo, formatTokenAmount, formatUSD, getExplorerUrl } from '@/lib/utils'

interface SwapTransaction {
  id: string
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  fromIcon: string
  toIcon: string
  status: 'completed' | 'pending' | 'failed'
  timestamp: number
  txHash: string
  gasUsed: string
  gasPrice: string
  fee: string
  rate: number
}

// Swap history will be fetched from API or stored in database
// For now, showing empty state

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-500 bg-green-500/10'
    case 'pending':
      return 'text-yellow-500 bg-yellow-500/10'
    case 'failed':
      return 'text-red-500 bg-red-500/10'
    default:
      return 'text-gray-500 bg-gray-500/10'
  }
}

export function SwapHistory() {
  const [transactions, setTransactions] = useState<SwapTransaction[]>([])
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Swap history would be fetched from API
    // SideShift doesn't provide user-specific history, so this would need database storage
    setTransactions([])
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const handleExport = () => {
    // In real app, this would export transaction data
    // TODO: Implement export functionality
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.status === filter
    const matchesSearch = searchTerm === '' || 
      tx.fromToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.toToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: transactions.length,
    completed: transactions.filter(tx => tx.status === 'completed').length,
    pending: transactions.filter(tx => tx.status === 'pending').length,
    failed: transactions.filter(tx => tx.status === 'failed').length,
    totalVolume: transactions
      .filter(tx => tx.status === 'completed')
      .reduce((sum, tx) => sum + parseFloat(tx.fromAmount), 0)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <History className="h-8 w-8 text-primary" />
          Swap History
        </h2>
        <p className="text-muted-foreground">
          Track all your token swaps and transaction history
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-effect">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Swaps</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="glass-effect">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 rounded-lg border bg-background"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <Card className="glass-effect">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <History className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No transactions found</p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'Your swap history will appear here'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((tx) => (
            <Card key={tx.id} className="glass-effect">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl">{tx.fromIcon}</div>
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      <div className="text-2xl">{tx.toIcon}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">
                          {tx.fromAmount} {tx.fromToken} → {tx.toAmount} {tx.toToken}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {getStatusIcon(tx.status)}
                          <span className="ml-1">{tx.status.toUpperCase()}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Rate: 1 {tx.fromToken} = {tx.rate.toFixed(4)} {tx.toToken}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(tx.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-sm">
                      <div className="text-muted-foreground">Gas Used</div>
                      <div className="font-mono">{tx.gasUsed} MATIC</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">Fee</div>
                      <div className="font-mono">{tx.fee} {tx.fromToken}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getExplorerUrl(tx.txHash), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
          <CardDescription>
            Overview of your swap activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTokenAmount(stats.totalVolume.toString())}</div>
              <div className="text-sm text-muted-foreground">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0.3%</div>
              <div className="text-sm text-muted-foreground">Avg Fee</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2.1min</div>
              <div className="text-sm text-muted-foreground">Avg Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
