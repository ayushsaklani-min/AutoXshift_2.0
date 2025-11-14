'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Heart, 
  TrendingUp, 
  Users, 
  Target,
  Clock,
  ExternalLink,
  ArrowLeft
} from 'lucide-react'
import { campaignApi } from '@/lib/api'
import { authenticateWallet, getToken, getUser } from '@/lib/auth'
import { formatTokenAmount, formatTimeAgo } from '@/lib/utils'

interface Campaign {
  id: string
  title: string
  description: string
  goal_amount: string
  current_amount: string
  goal_token: string
  goal_network: string
  status: string
  creator_address: string
  created_at: string
  donation_count?: number
}

export default function CampaignsPage() {
  const { address } = useAccount()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (address) {
      authenticateWallet(address).catch(console.error)
    }
    loadCampaigns()
  }, [address])

  const loadCampaigns = async () => {
    try {
      setIsLoading(true)
      const data = await campaignApi.list({ status: 'active', limit: 20 })
      if (data.success) {
        setCampaigns(data.data)
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!address) return

    const formData = new FormData(e.currentTarget)
    const campaignData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      goalAmount: formData.get('goalAmount') as string,
      goalToken: formData.get('goalToken') as string,
      goalNetwork: formData.get('goalNetwork') as string,
      category: formData.get('category') as string || 'general',
    }

    try {
      setIsCreating(true)
      const data = await campaignApi.create(campaignData)
      if (data.success) {
        setShowCreateForm(false)
        loadCampaigns()
      }
    } catch (error: any) {
      console.error('Failed to create campaign:', error)
      alert(error.message || 'Failed to create campaign')
    } finally {
      setIsCreating(false)
    }
  }

  const getProgress = (current: string, goal: string) => {
    const currentNum = parseFloat(current || '0')
    const goalNum = parseFloat(goal || '1')
    return Math.min(100, (currentNum / goalNum) * 100)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold mb-2">Campaigns</h1>
            <p className="text-muted-foreground">
              Support causes and fundraise across multiple blockchains
            </p>
          </div>
        </div>
        {address && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        )}
      </div>

      {showCreateForm && (
        <Card className="mb-8 glass-effect">
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
            <CardDescription>
              Start a fundraising campaign that accepts donations from any blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input name="title" required placeholder="Campaign title" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  required
                  className="w-full p-2 border rounded-lg"
                  rows={4}
                  placeholder="Describe your campaign..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Goal Amount</label>
                  <Input name="goalAmount" type="number" required placeholder="10000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Goal Token</label>
                  <Input name="goalToken" required placeholder="USDC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Network</label>
                  <Input name="goalNetwork" required placeholder="ETH" />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input name="category" placeholder="general" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Campaign'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="glass-effect">
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Be the first to create a campaign!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => {
            const progress = getProgress(campaign.current_amount, campaign.goal_amount)
            return (
              <Card key={campaign.id} className="glass-effect hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{campaign.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {campaign.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>
                        {formatTokenAmount(campaign.current_amount)} {campaign.goal_token}
                      </span>
                      <span className="text-muted-foreground">
                        of {formatTokenAmount(campaign.goal_amount)} {campaign.goal_token}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{campaign.donation_count || 0} donors</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(new Date(campaign.created_at).getTime())}</span>
                    </div>
                  </div>

                  <Button className="w-full" asChild>
                    <a href={`/campaigns/${campaign.id}`}>
                      View Campaign
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

