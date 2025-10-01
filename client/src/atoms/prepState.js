import { atom } from 'jotai';

export const prepModeAtom = atom('prep'); // prep | interview | history

// NEW: Interview Categories
export const interviewCategoriesAtom = atom([]);
export const selectedCategoryIdAtom = atom(null);
export const selectedCategoryAtom = atom(get => {
  const categoryId = get(selectedCategoryIdAtom);
  const categories = get(interviewCategoriesAtom);
  return categories.find(c => c.id === categoryId) || null;
});

// OLD: Keep for backward compatibility with custom categories & JD
export const questionOptionsAtom = atom([]);
export const customCategoriesAtom = atom([]);
export const jdQuestionsAtom = atom([]);

export const selectedQuestionIdsAtom = atom([]);
export const selectedQuestionsAtom = atom(get => {
  const selectedIds = get(selectedQuestionIdsAtom);
  
  // NEW: If a category is selected, get questions from it
  const selectedCategory = get(selectedCategoryAtom);
  if (selectedCategory && selectedCategory.questions) {
    return selectedCategory.questions.filter(q => selectedIds.includes(q.id));
  }
  
  // OLD: Fallback to original behavior (custom categories, JD, old seed questions)
  const options = get(questionOptionsAtom);
  const custom = get(customCategoriesAtom).flatMap(category => category.questions || []);
  const jdGenerated = get(jdQuestionsAtom);
  const lookup = new Map();
  for (const option of options) {
    lookup.set(option.id, option);
  }
  for (const question of custom) {
    lookup.set(question.id, question);
  }
  for (const question of jdGenerated) {
    lookup.set(question.id, question);
  }
  return selectedIds.map(id => lookup.get(id)).filter(Boolean);
});

export const personaOptionsAtom = atom([]);
export const selectedPersonaAtom = atom('medium');

export const evaluationFocusAtom = atom([]);

export const jdUploadAtom = atom({
  status: 'idle',
  error: '',
  promptSummary: '',
  generatedCategories: []
});

export const jdSummaryAtom = atom('');

export const prepErrorAtom = atom('');
export const isSubmittingPrepAtom = atom(false);

export const reviewSettingsAtom = atom({
  persona: 'medium',
  difficulty: 'medium'
});

export const prepSummaryAtom = atom(get => {
  const selectedQuestions = get(selectedQuestionsAtom);
  return {
    totalQuestions: selectedQuestions.length,
    estimatedDuration: selectedQuestions.reduce((acc, question) => acc + (question.estimatedDuration || 0), 0)
  };
});

export const interviewSessionAtom = atom(null);
export const interviewQuestionStackAtom = atom([]);
export const interviewPersonaAtom = atom(null);
export const interviewResumeAtom = atom(null);

export const prepLoadedAtom = atom(false);


export const selectedInterviewIdAtom = atom(null);
export const selectedInterviewAtom = atom(null);
export const interviewListAtom = atom([]);


