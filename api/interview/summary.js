import { buildSummaryPrompt, getOpenAI } from '../_lib/config.js';
import { withCors } from '../_lib/cors.js';

async function handler(req, res) {
  try {
    const { conversation } = req.body ?? {};
    if (!Array.isArray(conversation)) {
      res.status(400).json({ error: 'Conversation history is required.' });
      return;
    }

    const transcript = conversation
      .filter(message => message.role !== 'system')
      .map(message => `${String(message.role).toUpperCase()}: ${String(message.content ?? '')}`)
      .join('\n');

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You analyze interview transcripts.' },
        { role: 'user', content: buildSummaryPrompt(transcript) }
      ]
    });

    const summaryMessage = completion.choices?.[0]?.message;
    if (!summaryMessage) {
      res.status(500).json({ error: 'No summary generated.' });
      return;
    }

    res.status(200).json({ summary: summaryMessage.content });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
}

export default withCors(handler);

