'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Lightbulb,
  Target,
  Activity
} from 'lucide-react'

interface AIRecommendation {
  id: string
  type: 'timing' | 'rate' | 'gas' | 'risk'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  action?: string
  timestamp: number
}

// AI recommendations will be fetched from the backend API
// No mock data - only real AI-generated recommendations

const getRecommendationIcon = (type: string) => {
  switch (type) {
    case 'timing': return <Clock className="h-5 w-5" />
    case 'rate': return <TrendingUp className="h-5 w-5" />
    case 'gas': return <Zap className="h-5 w-5" />
    case 'risk': return <AlertTriangle className="h-5 w-5" />
    default: return <Brain className="h-5 w-5" />
  }
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'high': return 'text-red-500 bg-red-500/10'
    case 'medium': return 'text-yellow-500 bg-yellow-500/10'
    case 'low': return 'text-green-500 bg-green-500/10'
    default: return 'text-gray-500 bg-gray-500/10'
  }
}

export function AIRecommendation() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)

  useEffect(() => {
    // AI recommendations will be fetched from backend API
    // No mock data - only real AI-generated recommendations
    setRecommendations([])
  }, [])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    // Simulate analysis progress
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsAnalyzing(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleApplyRecommendation = (recommendation: AIRecommendation) => {
    // In real app, this would apply the recommendation to the swap
    // TODO: Implement recommendation application
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Analysis
        </h2>
        <p className="text-muted-foreground">
          Get intelligent recommendations for optimal swap timing and routing
        </p>
      </div>

      {/* Analysis Controls */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Analysis
          </CardTitle>
          <CardDescription>
            AI continuously analyzes market conditions to provide optimal swap recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full h-12 text-lg font-semibold neon-glow"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing Market... {analysisProgress}%
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-2" />
                  Analyze Market Conditions
                </>
              )}
            </Button>

            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analysis Progress</span>
                  <span>{analysisProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Recommendations
        </h3>

        {recommendations.length === 0 ? (
          <Card className="glass-effect">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No recommendations available</p>
                <p className="text-sm text-muted-foreground">
                  Click "Analyze Market Conditions" to get AI insights
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recommendations.map((recommendation) => (
              <Card key={recommendation.id} className="glass-effect">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getRecommendationIcon(recommendation.type)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{recommendation.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(recommendation.impact)}`}>
                            {recommendation.impact.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {recommendation.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Confidence: {recommendation.confidence}%</span>
                          <span>•</span>
                          <span>{new Date(recommendation.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">{recommendation.confidence}%</div>
                        <div className="text-xs text-muted-foreground">Confidence</div>
                      </div>
                      {recommendation.action && (
                        <Button
                          size="sm"
                          onClick={() => handleApplyRecommendation(recommendation)}
                          className="neon-glow"
                        >
                          {recommendation.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Insights Summary */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-green-500">+23%</div>
              <div className="text-sm text-muted-foreground">Rate Improvement</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-blue-500">15min</div>
              <div className="text-sm text-muted-foreground">Optimal Window</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-yellow-500">0.3%</div>
              <div className="text-sm text-muted-foreground">Gas Savings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explain My Swap */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Explain My Swap
          </CardTitle>
          <CardDescription>
            AI chatbot explains your swap in simple terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <strong>AI Assistant:</strong> Select tokens and get a quote to receive an AI-powered explanation of your swap. 
                The AI will analyze the swap details and explain the transaction in simple terms, including exchange rates, 
                fees, and estimated completion time.
              </p>
            </div>
            <Button className="w-full" variant="outline">
              Ask AI About This Swap
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
