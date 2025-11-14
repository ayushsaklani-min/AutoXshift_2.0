'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { SwapPanel } from '@/components/SwapPanel'
import { AIRecommendation } from '@/components/AIRecommendation'
import { WalletOverview } from '@/components/WalletOverview'
import { SwapHistory } from '@/components/SwapHistory'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, Zap, BarChart3, History, PieChart } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('swap')

  // Fix hydration error by only rendering connector names on client
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        {!isConnected && (
          <Card className="mb-8 glass-effect border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Wallet className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="font-semibold">Connect Your Wallet</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet to start swapping tokens
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {connectors.map((connector) => (
                    <Button
                      key={connector.id}
                      onClick={() => connect({ connector })}
                      className="neon-glow hover:neon-glow"
                      variant="outline"
                    >
                      {mounted ? connector.name : 'Connect'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 glass-effect">
                <TabsTrigger value="swap" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Swap
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  AI Analysis
                </TabsTrigger>
                <TabsTrigger value="wallet" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="swap" className="mt-6">
                <SwapPanel />
              </TabsContent>
              
              <TabsContent value="ai" className="mt-6">
                <AIRecommendation />
              </TabsContent>
              
              <TabsContent value="wallet" className="mt-6">
                <WalletOverview />
              </TabsContent>
              
              <TabsContent value="history" className="mt-6">
                <SwapHistory />
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-primary font-semibold">Polygon Amoy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet</span>
                  <span className="text-sm font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-green-500 font-semibold">Connected</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/campaigns">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Campaigns
                  </Button>
                </Link>
                <Link href="/portfolio">
                  <Button variant="outline" className="w-full justify-start">
                    <PieChart className="h-4 w-4 mr-2" />
                    Portfolio
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="text-lg">AI Features</CardTitle>
                <CardDescription>
                  Powered by advanced AI optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm">Smart Timing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm">Rate Optimization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-sm">Gas Efficiency</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-sm">AutoX Mode</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
