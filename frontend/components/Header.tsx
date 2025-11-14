'use client'

import { useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Wallet, 
  Settings, 
  Moon, 
  Sun, 
  LogOut,
  Zap,
  BarChart3
} from 'lucide-react'
import { formatAddress } from '@/lib/utils'

export function Header() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const pathname = usePathname()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const isHomePage = pathname === '/'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-green-400 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold neon-text">AutoXShift</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Router</p>
            </div>
          </a>
        </div>

        {/* Navigation - Hidden on home page */}
        {!isHomePage && (
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/" className="text-sm font-medium hover:text-primary transition-colors">
              Swap
            </a>
            <a href="/campaigns" className="text-sm font-medium hover:text-primary transition-colors">
              Campaigns
            </a>
            <a href="/portfolio" className="text-sm font-medium hover:text-primary transition-colors">
              Portfolio
            </a>
            <a href="/analytics" className="text-sm font-medium hover:text-primary transition-colors">
              Analytics
            </a>
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Network Status */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-500">Polygon Amoy</span>
          </div>

          {/* Wallet Info */}
          {address && (
            <Card className="px-4 py-2 glass-effect">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{formatAddress(address)}</p>
                  <p className="text-xs text-muted-foreground">Connected</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => disconnect()}
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Settings */}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
