import { DEFAULT_TURN_DETECTION, REALTIME_BASE_URL, REALTIME_MODEL, buildInterviewerSystemPrompt, evaluationFocus, resolvePersona, resolveQuestions } from '../_lib/config.js';
import { withCors } from '../_lib/cors.js';

async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OpenAI API key is not configured.' });
    return;
  }

  try {
    const { questionIds, difficulty } = req.body ?? {};
    const selectedQuestions = resolveQuestions(questionIds);
    const persona = resolvePersona(difficulty);
    const instructions = buildInterviewerSystemPrompt(selectedQuestions, evaluationFocus, persona);
    const voice = persona.voice || process.env.REALTIME_VOICE || 'alloy';
    const turnDetection = {
      ...DEFAULT_TURN_DETECTION,
      ...(persona.turnDetectionOverrides ?? {})
    };
    const sessionBody = {
      session: {
        type: 'realtime',
        model: process.env.REALTIME_MODEL || REALTIME_MODEL,
        instructions,
        audio: {
          input: {
            transcription: {
              model: process.env.REALTIME_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
              language: 'en'
            },
            turn_detection: turnDetection
          },
          output: { voice }
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
      console.error('Failed to create realtime session token:', payload);
      res.status(500).json({ error: 'Failed to create realtime session token.' });
      return;
    }

    const clientSecret = payload?.client_secret?.value || payload?.value;
    if (!clientSecret) {
      console.error('Unexpected realtime token response:', payload);
      res.status(500).json({ error: 'Realtime token missing in response.' });
      return;
    }

    res.status(200).json({
      clientSecret,
      expiresAt: payload?.client_secret?.expires_at || payload?.expires_at || null,
      model: process.env.REALTIME_MODEL || REALTIME_MODEL,
      baseUrl: process.env.REALTIME_BASE_URL || REALTIME_BASE_URL,
      instructions,
      persona: {
        id: persona.id,
        label: persona.label,
        description: persona.description
      },
      questions: selectedQuestions.map(q => ({ id: q.id, prompt: q.prompt }))
    });
  } catch (error) {
    console.error('Error creating realtime session:', error);
    res.status(500).json({ error: 'Failed to create realtime session.' });
  }
}

export default withCors(handler);

