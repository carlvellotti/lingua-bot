import { 
  evaluationFocus, 
  personas, 
  questionBank, 
  defaultQuestionIds, 
  DEFAULT_DIFFICULTY,
  interviewCategories 
} from './_lib/config.js';
import { withCors } from './_lib/cors.js';

async function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    // NEW: Categories with all questions
    categories: interviewCategories,
    
    // OLD: Keep for backward compatibility
    questions: questionBank,
    evaluationFocus,
    
    // Keep personas
    personas: Object.values(personas).map(persona => ({
      id: persona.id,
      label: persona.label,
      description: persona.description,
      voice: persona.voice
    })),
    
    // OLD: Keep for backward compatibility
    defaults: {
      questionIds: defaultQuestionIds,
      difficulty: DEFAULT_DIFFICULTY
    }
  }));
}

export default withCors(handler);

