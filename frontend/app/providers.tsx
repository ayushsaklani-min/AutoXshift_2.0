'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig, createConfig } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { useState } from 'react'

// Configure Wagmi - Support multiple chains for SideShift cross-chain swaps
const supportedChains = [mainnet, polygon, arbitrum, optimism]

const config = createConfig({
  connectors: [
    new InjectedConnector({ chains: supportedChains }),
    new MetaMaskConnector({ chains: supportedChains }),
    new WalletConnectConnector({
      chains: supportedChains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
      },
    }),
  ],
  publicClient: createPublicClient({
    chain: mainnet, // Default to mainnet, but users can switch
    transport: http(),
  }),
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  )
}
