import { buildInterviewerSystemPrompt, defaultQuestionIds, evaluationFocus, getOpenAI, resolveQuestions, resolvePersona, DEFAULT_DIFFICULTY } from '../_lib/config.js';
import { withCors } from '../_lib/cors.js';

async function handler(_req, res) {
  try {
    const selectedQuestions = resolveQuestions(defaultQuestionIds);
    const persona = resolvePersona(DEFAULT_DIFFICULTY);
    const systemPrompt = buildInterviewerSystemPrompt(selectedQuestions, evaluationFocus, persona);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Begin the interview now.' }
    ];

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages
    });

    const assistantMessage = completion.choices?.[0]?.message;
    if (!assistantMessage) {
      res.status(500).json({ error: 'No response from interviewer model.' });
      return;
    }

    const updatedConversation = [...messages, assistantMessage];
    res.status(200).json({
      conversation: updatedConversation,
      message: assistantMessage
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Failed to start interview.' });
  }
}

export default withCors(handler);

