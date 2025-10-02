import { OpenAI } from 'openai';
import { withCors } from '../_lib/cors.js';

let openaiInstance;
function getOpenAI() {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversation, preferences } = req.body || {};

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'Invalid conversation data' });
    }

    const transcript = conversation
      .map(turn => `${turn.role === 'assistant' ? 'Tutor' : 'Learner'}: ${turn.content || turn.text || ''}`)
      .join('\n\n');

    const languageNames = {
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ja: 'Japanese',
      zh: 'Chinese',
      ko: 'Korean',
      ru: 'Russian',
      ar: 'Arabic',
      hi: 'Hindi',
      nl: 'Dutch'
    };

    const targetLanguage = languageNames[preferences?.language] || 'the target language';

    const summaryPrompt = `You are a language learning coach reviewing a ${targetLanguage} practice conversation. Analyze the following conversation and provide helpful feedback.

**Conversation:**
${transcript}

**Target Language:** ${targetLanguage}
**Learner's Level:** ${preferences?.level || 'intermediate'}
**Practice Style:** ${preferences?.style || 'casual'}

**Provide feedback in the following format:**

## Summary
[Brief overview of the session - what topics were discussed, overall flow]

## What You Learned
- [New vocabulary, phrases, or expressions introduced]
- [Grammar points covered]
- [Cultural insights or contextual knowledge]

## Areas of Strength
- [Things the learner did well]
- [Good usage examples from the conversation]

## Areas to Work On
- [Specific mistakes or areas for improvement]
- [Suggestions for practice]
- [Resources or tips for improvement]

## Vocabulary Review
[List key words/phrases from this session with brief definitions]

Keep the tone encouraging and constructive. Focus on actionable insights the learner can use to improve.`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful language learning coach providing constructive feedback on practice conversations.'
        },
        {
          role: 'user',
          content: summaryPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate feedback at this time.';

    return res.json({ summary });
  } catch (error) {
    console.error('Language summary error:', error);
    return res.status(500).json({ error: 'Failed to generate session summary.' });
  }
}

export default withCors(handler);

