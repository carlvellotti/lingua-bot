import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function truncateText(text, maxLength) {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength);
}

async function callJDGPT(promptPayload, attempt = 1) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: promptPayload,
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty JD generation response');
    }

    const parsed = JSON.parse(content);
    if (!parsed || !parsed.categories) {
      throw new Error('Invalid JD generation response format');
    }
    
    return parsed;
  } catch (error) {
    if (attempt < 2) {
      console.warn('JD generation retrying after error:', error);
      await new Promise(resolve => setTimeout(resolve, 400));
      return callJDGPT(promptPayload, attempt + 1);
    }
    throw error;
  }
}

function normaliseJDQuestions(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .map(category => {
      if (!category || typeof category !== 'object') return null;
      const title = typeof category.title === 'string' ? category.title.trim() : '';
      const questions = Array.isArray(category.questions)
        ? category.questions
            .map(question => {
              if (!question || typeof question !== 'object') return null;
              const text = typeof question.text === 'string' ? question.text.trim() : '';
              if (!text) return null;
              return {
                id: question.id || crypto.randomUUID(),
                text,
                rationale: typeof question.rationale === 'string' ? question.rationale.trim() : ''
              };
            })
            .filter(Boolean)
        : [];
      if (!title || questions.length === 0) return null;
      return { title, questions };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  const { method, body } = req;

  try {
    if (method === 'POST') {
      const text = typeof body?.jobDescription === 'string' ? body.jobDescription : '';
      
      const trimmed = truncateText(text, 8000);
      if (!trimmed) {
        return res.status(400).json({ error: 'Job description text required.' });
      }

      const promptPayload = [
        {
          role: 'system',
          content:
            'You generate structured interview questions from a job description. Output JSON: {"promptSummary": string, "categories": [{"title": string, "questions": [{"id": string, "text": string, "rationale": string}]}]}.'
        },
        {
          role: 'user',
          content: `Job description:\n${trimmed}\n\nGenerate 3-4 categories with 2-3 questions each. Questions should be concise and PM-focused.`
        }
      ];

      const result = await callJDGPT(promptPayload);
      const categories = normaliseJDQuestions(result?.categories);
      
      if (categories.length === 0) {
        return res.status(500).json({ error: 'No questions generated.' });
      }

      return res.json({
        categories,
        promptSummary: typeof result?.promptSummary === 'string' ? result.promptSummary : ''
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('JD processing error:', error);
    res.status(500).json({ error: error?.message || 'Failed to process job description.' });
  }
}
