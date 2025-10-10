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
    const { conversation, preferences, existingMemories } = req.body || {};

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

    // Format existing memories if provided
    let existingMemoriesSection = '';
    if (Array.isArray(existingMemories) && existingMemories.length > 0) {
      existingMemoriesSection = '\n\n**EXISTING MEMORIES YOU ALREADY HAVE:**\n';
      existingMemories.forEach(mem => {
        const memoryText = typeof mem === 'string' ? mem : mem?.memory;
        if (memoryText) {
          existingMemoriesSection += `- ${memoryText}\n`;
        }
      });
      existingMemoriesSection += '\n**DO NOT repeat any of these existing memories. Only extract NEW information from this conversation.**\n';
    }

    const summaryPrompt = `You are a language learning coach reviewing a ${targetLanguage} practice conversation. Analyze the following conversation and provide helpful feedback AND extract key memories.

**Conversation:**
${transcript}

**Target Language:** ${targetLanguage}
**Learner's Level:** ${preferences?.level || 'intermediate'}
**Practice Style:** ${preferences?.style || 'casual'}
${existingMemoriesSection}
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

Keep the tone encouraging and constructive. Focus on actionable insights the learner can use to improve.

---

**ADDITIONALLY, extract up to up to 10 NEW key memories from this conversation that should be remembered for future sessions.**

**CRITICAL: Only extract information that is NEW and NOT already covered in the existing memories above. Do not repeat or rephrase existing memories. UNLESS their is an update, in which case add the update.**

**ONLY include:**
- NEW personal details the learner shared (job, hobbies, interests, family, lifestyle)
- NEW topics they wanted to discuss or brought up
- NEW stories they shared about their life
- NEW preferences they mentioned (likes, dislikes, styles)
- NEW goals or aspirations they discussed
- UPDATES to existing memories

**DO NOT include:**
- Anything already in the existing memories list (if provided)
- Mistakes, struggles, or errors they made
- Grammar or vocabulary they had difficulty with
- Areas they need to work on
- Any performance assessment

**If there are fewer than 10 new things to remember, that's fine - only extract what's genuinely new.**

Return these as a JSON object at the very end of your response in this EXACT format:
\`\`\`json
{
  "memories": [
    "User is a high school teacher in San Francisco",
    "Loves skateboarding and wants to learn new tricks",
    "Enjoys outdoor activities on weekends"
  ]
}
\`\`\`

Keep memories concise (under 100 characters each), positive, and focused on who the person IS, not how they're learning.`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5',
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

    const rawContent = completion.choices[0]?.message?.content || 'Unable to generate feedback at this time.';

    // Extract memories JSON from the response
    let memories = [];
    let summary = rawContent;
    
    try {
      // Look for JSON code block with memories
      const jsonMatch = rawContent.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        const memoriesData = JSON.parse(jsonMatch[1]);
        memories = Array.isArray(memoriesData.memories) ? memoriesData.memories : [];
        // Remove the JSON block from the summary
        summary = rawContent.replace(/```json\s*\{[\s\S]*?\}\s*```/, '').trim();
      }
    } catch (error) {
      console.warn('Failed to extract memories from summary:', error);
      // Continue without memories if extraction fails
    }

    return res.json({ summary, memories });
  } catch (error) {
    console.error('Language summary error:', error);
    return res.status(500).json({ error: 'Failed to generate session summary.' });
  }
}

export default withCors(handler);

