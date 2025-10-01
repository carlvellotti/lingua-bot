import { withCors } from '../_lib/cors.js';

const REALTIME_MODEL = process.env.REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

const personalities = {
  friendly: {
    id: 'friendly',
    name: 'Sofia Chen',
    voice: 'alloy',
    systemPrompt: `You are Sofia Chen, a warm and supportive language tutor. You create a comfortable learning environment and believe in building confidence through positive reinforcement. Be patient, encouraging, and approachable. Use gentle corrections and celebrate progress.`,
    turnDetection: { silenceDurationMs: 1400 }
  },
  professional: {
    id: 'professional',
    name: 'Dr. Marcus Wells',
    voice: 'echo',
    systemPrompt: `You are Dr. Marcus Wells, a professional language consultant with diplomatic experience. You specialize in formal language and business contexts. Maintain a respectful, professional tone. Provide clear, concise feedback and focus on precision in communication.`,
    turnDetection: { silenceDurationMs: 1200 }
  },
  humorous: {
    id: 'humorous',
    name: 'Jamie Rivera',
    voice: 'shimmer',
    systemPrompt: `You are Jamie Rivera, a witty language teacher who uses humor to make learning fun. You believe laughter aids retention. Use puns, jokes, and cultural references. Keep the mood light while still providing valuable language practice.`,
    turnDetection: { silenceDurationMs: 1300 }
  },
  academic: {
    id: 'academic',
    name: 'Professor Eliza Thompson',
    voice: 'sage',
    systemPrompt: `You are Professor Eliza Thompson, a linguistics professor passionate about language structure and etymology. Provide intellectual, detailed explanations. Challenge learners with precise vocabulary and help them understand deeper language patterns and rules.`,
    turnDetection: { silenceDurationMs: 1100 }
  }
};

const speedInstructions = {
  slow: 'Speak slowly and clearly, with deliberate pacing. Pause between phrases to give the learner time to process.',
  normal: 'Speak at a natural, conversational pace as you would with a native speaker.',
  fast: 'Speak quickly and naturally, mimicking native speaker speed in everyday contexts.'
};

const levelInstructions = {
  beginner: 'Use basic vocabulary and simple sentence structures. Avoid idioms and complex grammar. Break down concepts into small, digestible pieces.',
  intermediate: 'Use moderately complex vocabulary and varied sentence structures. Introduce some idioms and common expressions. Expect the learner to handle multi-clause sentences.',
  advanced: 'Use sophisticated vocabulary and complex sentence structures. Include idioms, nuanced expressions, and cultural references. Challenge the learner with abstract concepts.',
  fluent: 'Engage in native-level conversation with full use of idioms, slang, and cultural nuances. Discuss complex topics with subtlety and precision.'
};

const styleInstructions = {
  formal: 'Use polite, proper language appropriate for professional or formal settings. Avoid contractions and casual expressions.',
  casual: 'Use relaxed, everyday speech patterns. Contractions and colloquial language are fine. Keep it conversational and natural.',
  slang: 'Use contemporary slang, colloquial expressions, and informal language. Teach current expressions that native speakers actually use.'
};

function buildLanguageTutoringPrompt(preferences) {
  const personality = personalities[preferences.personality] || personalities.friendly;
  const speedInstruction = speedInstructions[preferences.speed] || speedInstructions.normal;
  const levelInstruction = levelInstructions[preferences.level] || levelInstructions.intermediate;
  const styleInstruction = styleInstructions[preferences.style] || styleInstructions.casual;

  return `${personality.systemPrompt}

**Conversation Style:**
${styleInstruction}

**Speaking Speed:**
${speedInstruction}

**Language Level:**
${levelInstruction}

**Your Role:**
- Engage the learner in natural conversation on various topics
- Gently correct mistakes without interrupting the flow
- Ask follow-up questions to encourage the learner to speak more
- Introduce new vocabulary and expressions appropriate to their level
- Provide context and explanations when introducing new concepts
- Be encouraging and supportive of their efforts
- Keep the conversation flowing naturally - don't make it feel like a formal lesson

**Conversation Flow:**
1. Start with a friendly greeting and ask how they're doing
2. Guide the conversation through interesting topics
3. Listen actively and respond naturally
4. Offer corrections and explanations when helpful
5. Keep them engaged and speaking as much as possible

Begin the conversation now with a warm greeting!`;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured.' });
  }

  try {
    const preferences = req.body || {};
    
    const personality = personalities[preferences.personality] || personalities.friendly;
    const systemPrompt = buildLanguageTutoringPrompt(preferences);

    const sessionBody = {
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        instructions: systemPrompt,
        audio: {
          input: {
            transcription: {
              model: 'gpt-4o-mini-transcribe',
              language: 'en'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: personality.turnDetection?.silenceDurationMs || 1200
            }
          },
          output: { voice: personality.voice || 'alloy' }
        }
      }
    };

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionBody)
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      console.error('Failed to create realtime session:', payload);
      return res.status(500).json({ error: 'Failed to create realtime session.' });
    }

    const clientSecret = payload?.client_secret?.value || payload?.value;
    if (!clientSecret) {
      console.error('Unexpected realtime token response:', payload);
      return res.status(500).json({ error: 'Realtime token missing in response.' });
    }

    return res.json({
      clientSecret,
      expiresAt: payload?.client_secret?.expires_at || payload?.expires_at || null,
      model: REALTIME_MODEL,
      instructions: systemPrompt,
      personality: {
        id: personality.id,
        name: personality.name
      },
      preferences
    });
  } catch (error) {
    console.error('Start language session error:', error);
    return res.status(500).json({ error: 'Failed to start session.' });
  }
}

export default withCors(handler);

