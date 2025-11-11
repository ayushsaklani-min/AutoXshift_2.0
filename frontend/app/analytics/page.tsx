'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  Zap,
  Users
} from 'lucide-react'
import { analyticsApi } from '@/lib/api'
import { authenticateWallet } from '@/lib/auth'
import { formatTokenAmount, formatUSD } from '@/lib/utils'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
  const { address } = useAccount()
  const [stats, setStats] = useState<any>(null)
  const [swapStats, setSwapStats] = useState<any[]>([])
  const [topTokens, setTopTokens] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (address) {
      authenticateWallet(address).catch(console.error)
    }
    loadAnalytics()
  }, [address])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      
      const [dashboardData, swapsData, tokensData] = await Promise.allSettled([
        analyticsApi.getDashboard(),
        analyticsApi.getSwapStats('30d'),
        analyticsApi.getTopTokens(10),
      ])

      if (dashboardData.status === 'fulfilled' && dashboardData.value.success) {
        setStats(dashboardData.value.data)
      } else if (dashboardData.status === 'rejected') {
        console.error('Failed to load dashboard:', dashboardData.reason)
      }

      if (swapsData.status === 'fulfilled' && swapsData.value.success) {
        setSwapStats(swapsData.value.data || [])
      } else if (swapsData.status === 'rejected') {
        console.error('Failed to load swap stats:', swapsData.reason)
        setSwapStats([])
      }

      if (tokensData.status === 'fulfilled' && tokensData.value.success) {
        setTopTokens(tokensData.value.data || [])
      } else if (tokensData.status === 'rejected') {
        console.error('Failed to load top tokens:', tokensData.reason)
        setTopTokens([])
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Track your activity and platform statistics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Swaps</p>
                <p className="text-2xl font-bold">{stats?.totalSwaps || 0}</p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">
                  {formatTokenAmount(stats?.totalVolume || '0')}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{stats?.activeCampaigns || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Interactions</p>
                <p className="text-2xl font-bold">{stats?.aiInteractions || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Swap Volume (30 Days)</CardTitle>
            <CardDescription>Daily swap volume over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={swapStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="volume" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Top Tokens</CardTitle>
            <CardDescription>Most swapped tokens by volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topTokens}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="token" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_volume" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-lg">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalDonations || 0}</p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.recentActivity || 0}</p>
            <p className="text-sm text-muted-foreground mt-2">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-lg">Swap Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalSwaps || 0}</p>
            <p className="text-sm text-muted-foreground mt-2">All time</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

