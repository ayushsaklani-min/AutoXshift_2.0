# AutoXShift v2.0 – AI-Powered Cross-Chain Financial Ecosystem

![AutoXShift Logo](https://via.placeholder.com/800x200/1a1a1a/00ff88?text=AutoXShift)

> **AI-Powered Cross-Chain Financial Ecosystem** - Complete platform for token swaps, fundraising campaigns, portfolio management, and social engagement with real-time AI optimization.

## 🚀 Features

### Core Functionality
- **Cross-Chain Swaps**: Seamless token swaps via SideShift.ai API (BTC, ETH, MATIC, USDC, etc.)
- **Campaign Fundraising**: Create and manage fundraising campaigns with cross-chain donations
- **Portfolio Management**: AI-powered portfolio analysis and rebalancing suggestions
- **Analytics Dashboard**: Comprehensive statistics and insights
- **Social Feed**: Share insights, view leaderboards, and engage with the community
- **Real-Time Updates**: WebSocket-powered live notifications and status updates
- **Multi-Network Support**: Swap between different blockchains (Bitcoin, Ethereum, Polygon, etc.)

### AI-Powered Features
- **Smart Timing**: AI predicts optimal swap times based on market conditions
- **Rate Optimization**: Real-time analysis for best exchange rates
- **Explain My Swap**: AI chatbot explaining transaction details in simple terms
- **Gas Efficiency**: Intelligent gas price recommendations

### Technical Highlights
- **SideShift API Integration**: Real cross-chain swaps using SideShift.ai infrastructure
- **AI-Powered Recommendations**: Google Gemini analyzes market conditions for optimal timing
- **No Slippage**: SideShift handles fixed-rate swaps automatically
- **Self-Custodial**: Users control their funds - deposits go directly to SideShift
- **Modular Architecture**: Clean, scalable codebase ready for production

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **ShadCN UI** components
- **Wagmi** for wallet integration
- **Ethers.js** for blockchain interactions

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** for persistent storage
- **Redis** for caching
- **WebSocket** for real-time updates
- **SideShift API** integration
- **Google Gemini** for AI features
- **JWT** authentication

### Blockchain Integration
- **Multi-Chain Support** via SideShift.ai (Bitcoin, Ethereum, Polygon, Arbitrum, Optimism, etc.)
- **Wallet Integration** via Wagmi/Viem for address retrieval

### AI & Analytics
- **Google Gemini 1.5 Flash** for recommendations
- **Real-time** market data analysis
- **Portfolio optimization** algorithms
- **Campaign analytics** and tracking

## 🏗️ Project Structure

```
autoxshift/
├── frontend/                 # Next.js React application
│   ├── app/                 # App router pages (swap, campaigns, portfolio, analytics)
│   ├── components/          # Reusable UI components
│   └── lib/                 # Utilities (auth, API, WebSocket)
├── backend/                 # Express.js API server
│   ├── routes/              # API route handlers (8 modules)
│   ├── services/            # Business logic (12 services)
│   ├── database/            # Database schema and connection
│   └── middleware/          # Auth, security, validation
└── docs/                    # Documentation
    └── API.md               # API documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MetaMask wallet (or any Web3 wallet)
- SideShift API key (get from [SideShift.ai](https://sideshift.ai/settings/api))
- Google API key (optional, for AI features)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd autoxshift
npm run install:all
```

2. **Set up environment variables:**
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (.env)
PORT=3001
SIDESHIFT_API_KEY=your_sideshift_secret_here
GOOGLE_API_KEY=your_google_api_key_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=autoxshift
DB_USER=autoxshift
DB_PASSWORD=autoxshift123
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
```

3. **Initialize database (optional but recommended):**
```bash
cd backend
.\scripts\init-db.ps1  # Windows
# OR
./scripts/init-db.sh    # Linux/Mac
```

4. **Start development servers:**
```bash
npm run dev
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws
- Health Check: http://localhost:3001/api/health

## 📱 Usage

### Basic Swap Flow
1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Select Tokens**: Choose from/to tokens (BTC, ETH, MATIC, USDC, etc.) from SideShift-supported tokens
3. **Enter Amount**: Input swap amount (must be within min/max limits)
4. **Get Quote**: Click "Get Quote" to receive a fixed-rate quote from SideShift
5. **Create Shift**: Confirm to create a shift and receive deposit address
6. **Send Funds**: Send the exact amount to the provided deposit address
7. **Monitor Status**: Watch the swap progress in real-time
8. **Receive Tokens**: Tokens are automatically sent to your wallet when complete

### AI Features
1. **Smart Timing**: AI analyzes market conditions to recommend optimal swap times
2. **Rate Analysis**: Compare rates across different token pairs
3. **Market Insights**: Get AI-powered analysis of market trends and volatility
4. **Swap Explanations**: Understand your swaps with AI-generated explanations

## 🔧 API Documentation

### Get Swap Quote
```http
POST /api/swap/quote
Content-Type: application/json

{
  "fromToken": "BTC",
  "fromNetwork": "BTC",
  "toToken": "ETH",
  "toNetwork": "ETH",
  "amount": "0.1",
  "settleAddress": "0x..."
}
```

### Create Shift
```http
POST /api/swap/shift
Content-Type: application/json

{
  "quoteId": "quote-id-from-previous-request",
  "settleAddress": "0x..."
}
```

### Get Shift Status
```http
GET /api/swap/status/:shiftId
```

### Get Supported Tokens
```http
GET /api/swap/tokens
```

### AI Recommendation Endpoint
```http
GET /api/ai/recommend?fromToken=BTC&toToken=ETH&amount=0.1
```

## 🧪 Testing

### Backend API
```bash
cd backend
npm run test:gemini  # Test Gemini AI integration
```

### Frontend
```bash
cd frontend
npm run dev  # Start development server
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Backend (Render)
```bash
# Connect GitHub repository to Render
# Set environment variables
# Deploy automatically on push
```

### Database & Infrastructure
- **PostgreSQL**: Required for persistent storage (swaps, campaigns, analytics)
- **Redis**: Optional but recommended for caching
- **Docker**: Use `docker-compose up -d` for full stack deployment

## 🔒 Security

- **Self-Custodial**: Users maintain full control of their funds - deposits go directly to SideShift
- **No Data Storage**: No sensitive user data stored on servers
- **SideShift Security**: Leverages SideShift.ai's secure infrastructure
- **Rate Limiting**: API endpoints protected against abuse

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [AutoXShift Community](https://discord.gg/autoxshift)

## 🏆 Hackathon Submission

This project was built for the **SideShift API Hackathon** focusing on:
- ✅ **API Integration**: Complete SideShift API integration
- ✅ **Use Case Relevance**: Real-world DeFi utility
- ✅ **Originality**: AI-powered optimization
- ✅ **SideShift Values**: Self-custodial, crypto-native
- ✅ **Product Design**: Modern, intuitive interface
- ✅ **Presentation**: Comprehensive documentation

---

**Built with ❤️ by the AutoXShift Team**
