import { getOpenAI } from '../_lib/config.js';
import { withCors } from '../_lib/cors.js';

async function handler(req, res) {
  try {
    const { conversation } = req.body ?? {};
    if (!Array.isArray(conversation) || conversation.length === 0) {
      res.status(400).json({ error: 'Conversation history is required.' });
      return;
    }

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: conversation
    });

    const assistantMessage = completion.choices?.[0]?.message;
    if (!assistantMessage) {
      res.status(500).json({ error: 'No response from interviewer model.' });
      return;
    }

    const updatedConversation = [...conversation, assistantMessage];
    res.status(200).json({ conversation: updatedConversation, message: assistantMessage });
  } catch (error) {
    console.error('Error continuing interview:', error);
    res.status(500).json({ error: 'Failed to continue interview.' });
  }
}

export default withCors(handler);

