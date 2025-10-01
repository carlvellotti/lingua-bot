# Lingua Bot 🌍

A real-time language learning conversation tool powered by OpenAI's GPT-4 Realtime API.

## Features

- 🎭 **4 AI Tutor Personalities** - Choose from Friendly, Professional, Humorous, or Academic tutors
- ⚡ **Adjustable Speaking Speed** - Slow, Normal, or Fast pace
- 📊 **4 Language Levels** - Beginner, Intermediate, Advanced, Fluent
- 💬 **3 Communication Styles** - Formal, Casual, or Slangy
- 🎙️ **Real-time Voice Conversation** - Natural, flowing conversations with AI
- 📈 **Learning Insights** - Get feedback on vocabulary, grammar, strengths, and areas to practice
- 📝 **Session History** - Review past conversations and track your progress
- 🎨 **Beautiful UI** - Clean, modern interface with visual feedback

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API Key with access to GPT-4 Realtime API

### Installation

```bash
# Install dependencies
npm install
cd client && npm install
cd ..
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Run Locally

```bash
# Development mode
npm run dev

# Or with Vercel CLI
vercel dev
```

Visit `http://localhost:3000` to start practicing!

## Deployment to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings
   - Add `OPENAI_API_KEY` environment variable
   - Redeploy if necessary

## How It Works

### Setup Flow

1. **Choose Your Tutor** - Select a personality that matches your learning style
2. **Configure Preferences** - Set speaking speed, language level, and communication style
3. **Start Practicing** - Click "Start Practicing ✨" to begin your session

### Practice Session

- Speak naturally with your AI tutor
- See real-time audio visualization
- View transcript as you speak
- End the session anytime to get insights

### Learning Insights

After each session, you'll receive:
- **Summary** - Overview of topics discussed
- **What You Learned** - New vocabulary, grammar points, cultural insights
- **What You Did Well** - Your strengths in the conversation
- **Areas to Practice** - Specific suggestions for improvement
- **Vocabulary Review** - Key words and phrases from the session

## Architecture

### Frontend (`/client`)
- **React** + **Vite** for fast development
- **Jotai** for state management
- **WebRTC** for real-time audio streaming
- Beautiful, responsive UI

### Backend (`/api`)
- **Vercel Serverless Functions**
- OpenAI Realtime API integration
- Session management
- Learning insights generation

### Key Technologies
- OpenAI GPT-4 Realtime API
- WebRTC for audio streaming
- LocalStorage for session history
- Vercel for deployment

## Project Structure

```
lingua-bot/
├── api/
│   ├── language/
│   │   ├── start-session.js    # Create practice sessions
│   │   └── summary.js           # Generate learning insights
│   └── _lib/
│       └── cors.js              # CORS helper
├── client/
│   ├── src/
│   │   ├── atoms/               # Jotai state atoms
│   │   ├── components/
│   │   │   ├── language/        # Setup page
│   │   │   └── interview/       # Practice session UI
│   │   ├── hooks/               # React hooks
│   │   ├── services/            # API & WebRTC services
│   │   └── utils/               # Helper functions
│   └── public/
├── vercel.json                  # Vercel configuration
└── package.json
```

## Tutor Personalities

### 🌸 Sofia Chen (Friendly)
Warm, approachable, and patient. Perfect for building confidence through positive reinforcement.

### 👔 Dr. Marcus Wells (Professional)
Former diplomat and business language consultant. Specializes in formal language for international business.

### 😄 Jamie Rivera (Humorous)
Stand-up comedian who teaches through humor. Makes learning fun with jokes, puns, and cultural references.

### 🎓 Professor Eliza Thompson (Academic)
Linguistics professor passionate about language structure. Provides detailed, intellectual explanations.

## Development

### Scripts

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Client Scripts

```bash
cd client

# Install dependencies
npm install

# Run dev server
npm run dev

# Build
npm run build
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `REALTIME_MODEL` | GPT model to use (default: gpt-4o-realtime-preview-2024-12-17) | No |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using OpenAI's GPT-4 Realtime API
