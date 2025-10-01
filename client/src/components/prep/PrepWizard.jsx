import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  prepModeAtom,
  prepLoadedAtom,
  questionOptionsAtom,
  customCategoriesAtom,
  jdQuestionsAtom,
  selectedQuestionIdsAtom,
  selectedQuestionsAtom,
  personaOptionsAtom,
  reviewSettingsAtom,
  evaluationFocusAtom,
  jdUploadAtom,
  jdSummaryAtom,
  prepErrorAtom,
  isSubmittingPrepAtom,
  prepSummaryAtom,
  interviewSessionAtom,
  interviewQuestionStackAtom,
  interviewPersonaAtom,
  // NEW: Category atoms
  interviewCategoriesAtom,
  selectedCategoryIdAtom,
  selectedCategoryAtom
} from '../../atoms/prepState.js';
import {
  fetchConfiguration,
  uploadJobDescription,
  startInterviewSession
} from '../../services/api.js';
import {
  getCustomCategories,
  saveCustomCategory,
  deleteCustomCategory
} from '../../services/localStorage.js';
import QuestionSection from './QuestionSection.jsx';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function PrepWizard() {
  const setPrepMode = useSetAtom(prepModeAtom);
  const [prepLoaded, setPrepLoaded] = useAtom(prepLoadedAtom);

  const [questionOptions, setQuestionOptions] = useAtom(questionOptionsAtom);
  const [customCategories, setCustomCategories] = useAtom(customCategoriesAtom);
  const setJdGeneratedQuestions = useSetAtom(jdQuestionsAtom);

  const [selectedQuestionIds, setSelectedQuestionIds] = useAtom(selectedQuestionIdsAtom);
  const selectedQuestions = useAtomValue(selectedQuestionsAtom);

  const [personaOptions, setPersonaOptions] = useAtom(personaOptionsAtom);
  const [reviewSettings, setReviewSettings] = useAtom(reviewSettingsAtom);
  const setEvaluationFocus = useSetAtom(evaluationFocusAtom);

  const [jdUploadState, setJdUploadState] = useAtom(jdUploadAtom);
  const [jdSummary, setJdSummary] = useAtom(jdSummaryAtom);
  const [prepError, setPrepError] = useAtom(prepErrorAtom);
  const [isSubmitting, setIsSubmitting] = useAtom(isSubmittingPrepAtom);
  const prepSummary = useAtomValue(prepSummaryAtom);

  const setInterviewSession = useSetAtom(interviewSessionAtom);
  const setInterviewStack = useSetAtom(interviewQuestionStackAtom);
  const setInterviewPersona = useSetAtom(interviewPersonaAtom);
  const jdTextRef = useRef('');
  const [jdText, setJdText] = useState('');

  // NEW: Category state
  const [interviewCategories, setInterviewCategories] = useAtom(interviewCategoriesAtom);
  const [selectedCategoryId, setSelectedCategoryId] = useAtom(selectedCategoryIdAtom);
  const selectedCategory = useAtomValue(selectedCategoryAtom);

  // Local state for section expansion
  const [jdSectionExpanded, setJdSectionExpanded] = useState(false);
  
  // Custom category dialog state
  const [isCustomDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftQuestions, setDraftQuestions] = useState(['']);
  const [customActionState, setCustomActionState] = useState({ status: 'idle', error: '' });

  const loadInitialConfiguration = useCallback(async () => {
    try {
      setPrepError('');

      const config = await fetchConfiguration();
      const {
        categories: interviewCats = [],  // NEW: Interview categories
        questions = [],                  // OLD: Seed questions (backward compatible)
        evaluationFocus: focusAreas = [],
        personas = [],
        defaults = {}
      } = config || {};

      const safeInterviewCats = ensureArray(interviewCats);
      const safeQuestions = ensureArray(questions);
      const safePersonas = ensureArray(personas);
      const safeFocusAreas = ensureArray(focusAreas);

      // NEW: Set interview categories
      setInterviewCategories(safeInterviewCats);
      
      // OLD: Keep for backward compatibility
      setQuestionOptions(safeQuestions);
      setEvaluationFocus(safeFocusAreas);
      setPersonaOptions(safePersonas.map(persona => ({
        id: persona.id,
        label: persona.label,
        description: persona.description,
        voice: persona.voice
      })));

      setReviewSettings(prev => ({
        ...prev,
        persona:
          (typeof defaults.persona === 'string' && defaults.persona) ||
          prev.persona ||
          safePersonas[0]?.id ||
          'medium',
        difficulty:
          (typeof defaults.difficulty === 'string' && defaults.difficulty) ||
          prev.difficulty ||
          'medium'
      }));

      // No default questions - user must manually select
      setSelectedQuestionIds([]);

      setJdGeneratedQuestions([]);
      setJdUploadState({ status: 'idle', error: '', promptSummary: '', generatedCategories: [] });
      setJdSummary('');

      const categories = getCustomCategories();
      setCustomCategories(ensureArray(categories));

      setPrepLoaded(true);
    } catch (error) {
      console.error('Failed to load prep configuration', error);
      setPrepError(error?.message || 'Unable to load interview prep data.');
    }
  }, [
    setCustomCategories,
    setEvaluationFocus,
    setInterviewCategories,  // NEW: Added for categories
    setJdGeneratedQuestions,
    setJdSummary,
    setJdUploadState,
    setPersonaOptions,
    setPrepError,
    setPrepLoaded,
    setQuestionOptions,
    setReviewSettings,
    setSelectedQuestionIds
  ]);

  useEffect(() => {
    if (!prepLoaded) {
      loadInitialConfiguration();
    }
  }, [loadInitialConfiguration, prepLoaded]);

  const handleToggleQuestion = useCallback(
    id => {
      setSelectedQuestionIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
    },
    [setSelectedQuestionIds]
  );

  // NEW: Handle category selection (toggle accordion)
  const handleCategorySelect = useCallback(
    categoryId => {
      if (selectedCategoryId === categoryId) {
        // Collapsing: deselect all questions from this category
        const category = interviewCategories.find(c => c.id === categoryId);
        if (category) {
          const categoryQuestionIds = category.questions.map(q => q.id);
          setSelectedQuestionIds(prev => prev.filter(id => !categoryQuestionIds.includes(id)));
        }
        setSelectedCategoryId(null);
      } else {
        // Expanding: clear selections from other categories
        setSelectedCategoryId(categoryId);
      }
    },
    [selectedCategoryId, interviewCategories, setSelectedCategoryId, setSelectedQuestionIds]
  );

  const handleCustomCategoryCreate = useCallback(
    payload => {
      const category = saveCustomCategory(payload);
      setCustomCategories(prev => [...prev, category]);
    },
    [setCustomCategories]
  );

  const handleCustomCategoryUpdate = useCallback(
    (id, updates) => {
      try {
        // Get existing category and merge with updates
        const existing = customCategories.find(c => c.id === id);
        if (!existing) {
          throw new Error('Category not found');
        }
        const updated = saveCustomCategory({ ...existing, ...updates, id });
        setCustomCategories(prev => prev.map(category => (category.id === id ? updated : category)));
      } catch (error) {
        console.error('Failed to update category', error);
        setPrepError(error?.message || 'Unable to update category.');
      }
    },
    [customCategories, setCustomCategories, setPrepError]
  );

  const handleCustomCategoryDelete = useCallback(
    id => {
      try {
        const removed = customCategories.find(category => category.id === id);
        const deleted = deleteCustomCategory(id);
        if (!deleted) {
          throw new Error('Category not found');
        }
        setCustomCategories(prev => prev.filter(category => category.id !== id));
        if (removed && Array.isArray(removed.questions)) {
          const removedIds = new Set(removed.questions.map(question => question.id));
          setSelectedQuestionIds(prev => prev.filter(questionId => !removedIds.has(questionId)));
        }
      } catch (error) {
        console.error('Failed to delete category', error);
        setPrepError(error?.message || 'Unable to delete category.');
      }
    },
    [customCategories, setCustomCategories, setSelectedQuestionIds, setPrepError]
  );

  // Custom category dialog handlers
  const resetCustomDraft = useCallback(() => {
    setDraftTitle('');
    setDraftQuestions(['']);
    setEditingCategoryId(null);
    setCustomActionState({ status: 'idle', error: '' });
  }, []);

  const openCustomDialog = useCallback(() => {
    resetCustomDraft();
    setCustomDialogOpen(true);
  }, [resetCustomDraft]);

  const openEditCustomDialog = useCallback((categoryId, category) => {
    setEditingCategoryId(categoryId);
    setDraftTitle(category.title || '');
    setDraftQuestions(category.questions?.map(q => q.text || '') || ['']);
    setCustomActionState({ status: 'idle', error: '' });
    setCustomDialogOpen(true);
  }, []);

  const closeCustomDialog = useCallback(() => {
    setCustomDialogOpen(false);
    resetCustomDraft();
  }, [resetCustomDraft]);

  const addQuestionField = useCallback(() => {
    setDraftQuestions(prev => [...prev, '']);
  }, []);

  const updateQuestionField = useCallback((index, value) => {
    setDraftQuestions(prev => prev.map((item, idx) => (idx === index ? value : item)));
  }, []);

  const removeQuestionField = useCallback(index => {
    setDraftQuestions(prev => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleCustomSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!draftTitle.trim()) {
      setCustomActionState({ status: 'error', error: 'Category title is required.' });
      return;
    }

    const questions = draftQuestions
      .map(text => text.trim())
      .filter(Boolean)
      .map(text => ({ text }));

    if (questions.length === 0) {
      setCustomActionState({ status: 'error', error: 'Add at least one question.' });
      return;
    }

    try {
      setCustomActionState({ status: 'saving', error: '' });
      if (editingCategoryId) {
        handleCustomCategoryUpdate(editingCategoryId, { title: draftTitle.trim(), questions });
      } else {
        handleCustomCategoryCreate({ title: draftTitle.trim(), questions });
      }
      closeCustomDialog();
    } catch (error) {
      setCustomActionState({ status: 'error', error: error?.message || 'Failed to save category.' });
    }
  }, [draftTitle, draftQuestions, editingCategoryId, handleCustomCategoryCreate, handleCustomCategoryUpdate, closeCustomDialog]);

  const handleJDUpload = useCallback(
    async jobDescription => {
      setJdUploadState({ status: 'uploading', error: '', promptSummary: '', generatedCategories: [] });
      try {
        const result = await uploadJobDescription({ jobDescription });
        const categories = ensureArray(result?.categories).map(category => ({
          title: category.title,
          questions: ensureArray(category.questions).map(question => ({
            ...question,
            prompt: question.text,
            source: 'JD',
            categoryId: category.title
          }))
        }));

        setJdUploadState({
          status: 'success',
          error: '',
          promptSummary: result?.promptSummary || '',
          generatedCategories: categories
        });

        const flattened = categories.flatMap(category => category.questions);
        setJdGeneratedQuestions(flattened);
        setJdSummary(result?.promptSummary || '');
        setJdText('');
        jdTextRef.current = '';
        // Keep JD section expanded to show generated questions
      } catch (error) {
        console.error('JD upload failed', error);
        setJdUploadState({
          status: 'error',
          error: error?.message || 'Failed to process job description.',
          promptSummary: '',
          generatedCategories: []
        });
        setJdGeneratedQuestions([]);
        setJdSummary('');
      }
    },
    [setJdGeneratedQuestions, setJdSummary, setJdUploadState]
  );

  const jdSelectionSections = useMemo(() => {
    if (!jdUploadState.generatedCategories || jdUploadState.generatedCategories.length === 0) {
      return null;
    }

    return jdUploadState.generatedCategories.map(category => (
      <QuestionSection
        key={category.title}
        title={category.title}
        questions={category.questions}
        selectedQuestionIds={selectedQuestionIds}
        onToggle={handleToggleQuestion}
      />
    ));
  }, [handleToggleQuestion, jdUploadState.generatedCategories, selectedQuestionIds]);

  const handleStartInterview = useCallback(async () => {
    if (selectedQuestions.length === 0) {
      setPrepError('Select at least one question before starting.');
      return;
    }

    setPrepError('');
    setIsSubmitting(true);

    try {
      const payload = {
        questionStack: selectedQuestions.map(question => ({
          id: question.id,
          text: question.prompt || question.text,
          source: question.source || null,
          categoryId: question.categoryId || null,
          estimatedDuration: question.estimatedDuration || null
        })),
        persona: { id: reviewSettings.persona },
        difficulty: reviewSettings.difficulty,
        jdSummary: jdSummary || jdUploadState.promptSummary || ''
      };

      const response = await startInterviewSession(payload);

      setInterviewSession(response.session);
      setInterviewStack(response.questionStack || []);
      setInterviewPersona(response.persona || null);
      setJdSummary(response.jdSummary || '');
      setPrepMode('interview');
    } catch (error) {
      console.error('Failed to start interview session', error);
      setPrepError(error?.message || 'Unable to start interview.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    jdSummary,
    jdUploadState.promptSummary,
    reviewSettings.difficulty,
    reviewSettings.persona,
    selectedQuestions,
    setInterviewPersona,
    setInterviewSession,
    setInterviewStack,
    setIsSubmitting,
    setJdSummary,
    setPrepError,
    setPrepMode
  ]);

  const totalSelectedQuestions = prepSummary.totalQuestions ?? selectedQuestions.length;
  const estimatedDurationLabel = prepSummary.estimatedDuration
    ? `${prepSummary.estimatedDuration} min`
    : '—';

  if (!prepLoaded) {
    return (
      <div className="prep-wizard loading">
        <div className="spinner" aria-label="Loading interview prep" />
        <p>Loading interview prep data…</p>
      </div>
    );
  }

  return (
    <div className="prep-wizard">
      <header className="prep-header">
        <h2>Interview Prep Wizard</h2>
        <p className="subtle">Curate your question stack, upload context, and start when ready.</p>
      </header>

      <div className="prep-content">
        <div className="prep-main-flow">
          <section className="card">
            <div className="card-header">
              <h3>Select Interview Type</h3>
              <p className="subtle">Choose from curated categories, generate from a job description, or create your own</p>
            </div>
            <div className="card-body">
              {/* Section 1: Curated Interview Types */}
              <div className="interview-type-section">
                <h4 className="section-title">Curated Interview Types</h4>
                <div className="category-accordion">
                    {interviewCategories.map(category => {
                      const isExpanded = selectedCategoryId === category.id;
                      return (
                        <div key={category.id} className={`category-accordion-item ${isExpanded ? 'expanded' : ''}`}>
                          <button
                            className="category-accordion-trigger"
                            onClick={() => handleCategorySelect(category.id)}
                            type="button"
                          >
                            <div className="category-accordion-header">
                              <div className="category-accordion-title">
                                <strong>{category.name}</strong>
                                <p className="subtle">{category.description}</p>
                              </div>
                              <svg
                                className="category-accordion-chevron"
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M5 7.5L10 12.5L15 7.5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="category-accordion-content">
                              <div className="question-list">
                                {category.questions.map(question => {
                                  const isSelected = selectedQuestionIds.includes(question.id);
                                  return (
                                    <label
                                      key={question.id}
                                      className={`question-item ${isSelected ? 'selected' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleQuestion(question.id)}
                                      />
                                      <div>
                                        <strong>
                                          {question.text}
                                          <span className="duration-badge"> ({question.estimatedDuration} min)</span>
                                        </strong>
                                        {question.rationale && <p className="subtle">{question.rationale}</p>}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Section 2: Job Description Based */}
              <div className="interview-type-section">
                <h4 className="section-title">Job Description Based</h4>
                <div className="category-accordion">
                  <div className={`category-accordion-item ${jdSectionExpanded ? 'expanded' : ''}`}>
                    <button
                      className="category-accordion-trigger"
                      onClick={() => setJdSectionExpanded(!jdSectionExpanded)}
                      type="button"
                    >
                      <div className="category-accordion-header">
                        <div className="category-accordion-title">
                          <strong>Generate Questions from Job Description</strong>
                          <p className="subtle">Paste a job description to create tailored interview questions</p>
                        </div>
                        <svg
                          className="category-accordion-chevron"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 7.5L10 12.5L15 7.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </button>
                    
                    {jdSectionExpanded && (
                      <div className="category-accordion-content">
                        <div className="jd-upload-area">
                          {/* Only show input area when not successfully generated */}
                          {jdUploadState.status !== 'success' && (
                            <>
                              <label className="textarea-label">
                                <span className="textarea-title">Job Description Text</span>
                                <textarea
                                  className="jd-textarea"
                                  rows={12}
                                  placeholder="Paste the job description here..."
                                  disabled={jdUploadState.status === 'uploading'}
                                  onChange={event => {
                                    jdTextRef.current = event.target.value;
                                    setJdText(event.target.value);
                                    if (jdUploadState.error) {
                                      setJdUploadState(prev => ({ ...prev, error: '' }));
                                    }
                                  }}
                                  value={jdText}
                                />
                              </label>
                              <button
                                type="button"
                                className="primary"
                                onClick={() => {
                                  const text = jdTextRef.current.trim();
                                  if (!text) {
                                    setJdUploadState(prev => ({ ...prev, error: 'Paste a job description before generating.' }));
                                    return;
                                  }
                                  setJdUploadState(prev => ({ ...prev, error: '' }));
                                  handleJDUpload(text);
                                }}
                                disabled={jdUploadState.status === 'uploading'}
                              >
                                {jdUploadState.status === 'uploading' ? 'Generating…' : 'Generate Questions'}
                              </button>
                              {jdUploadState.error && <div className="error">{jdUploadState.error}</div>}
                            </>
                          )}
                          
                          {/* Generated questions appear below */}
                          {jdUploadState.status === 'success' && jdUploadState.generatedCategories.length > 0 && (
                            <div className="generated-questions-wrapper">
                              <div className="generated-header">
                                <strong>Generated Questions</strong>
                                <p className="subtle">Select questions to add to your interview stack</p>
                              </div>
                              {jdSelectionSections}
                            </div>
                          )}
                          {jdUploadState.status === 'success' && jdUploadState.generatedCategories.length === 0 && (
                            <div className="empty-state subtle">No questions generated. Try another description.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Custom Categories */}
              <div className="interview-type-section">
                <h4 className="section-title">Custom Categories</h4>
                <div className="category-accordion">
                  {customCategories.map(category => {
                    const categoryQuestionIds = category.questions?.map(q => q.id) || [];
                    const hasSelectedQuestions = categoryQuestionIds.some(id => selectedQuestionIds.includes(id));
                    const isExpanded = selectedCategoryId === `custom-${category.id}`;
                    return (
                      <div key={category.id} className={`category-accordion-item ${isExpanded ? 'expanded' : ''}`}>
                        <div className="custom-category-wrapper">
                          <button
                            className="category-accordion-trigger"
                            onClick={() => {
                              // Toggle expansion for this custom category
                              if (isExpanded) {
                                setSelectedCategoryId(null);
                              } else {
                                setSelectedCategoryId(`custom-${category.id}`);
                              }
                            }}
                            type="button"
                          >
                            <div className="category-accordion-header">
                              <div className="category-accordion-title">
                                <strong>{category.title}</strong>
                                <p className="subtle">{category.questions?.length || 0} questions</p>
                              </div>
                              <div className="custom-category-actions">
                                <button
                                  type="button"
                                  className="icon-action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditCustomDialog(category.id, category);
                                  }}
                                  title="Edit"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.3333 2.00004C11.5084 1.82494 11.716 1.68605 11.9441 1.59129C12.1722 1.49653 12.4165 1.44775 12.6633 1.44775C12.9101 1.44775 13.1544 1.49653 13.3825 1.59129C13.6106 1.68605 13.8183 1.82494 13.9933 2.00004C14.1684 2.17513 14.3073 2.38282 14.402 2.61091C14.4968 2.83899 14.5456 3.08333 14.5456 3.33004C14.5456 3.57675 14.4968 3.82108 14.402 4.04917C14.3073 4.27725 14.1684 4.48494 13.9933 4.66004L5.00001 13.6534L1.33334 14.6667L2.34668 11L11.3333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="icon-action-button danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete category "${category.title}"?`)) {
                                      handleCustomCategoryDelete(category.id);
                                    }
                                  }}
                                  title="Delete"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 4H3.33333H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M5.33334 4.00004V2.66671C5.33334 2.31309 5.47381 1.97395 5.72386 1.7239C5.97391 1.47385 6.31305 1.33337 6.66668 1.33337H9.33334C9.68696 1.33337 10.0261 1.47385 10.2762 1.7239C10.5262 1.97395 10.6667 2.31309 10.6667 2.66671V4.00004M12.6667 4.00004V13.3334C12.6667 13.687 12.5262 14.0261 12.2762 14.2762C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66668C4.31305 14.6667 3.97391 14.5262 3.72386 14.2762C3.47381 14.0261 3.33334 13.687 3.33334 13.3334V4.00004H12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                                <svg
                                  className="category-accordion-chevron"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M5 7.5L10 12.5L15 7.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="category-accordion-content">
                              <div className="question-list">
                                {category.questions?.map(question => {
                                  const isSelected = selectedQuestionIds.includes(question.id);
                                  return (
                                    <label
                                      key={question.id}
                                      className={`question-item ${isSelected ? 'selected' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleQuestion(question.id)}
                                      />
                                      <div>
                                        <strong>{question.text || question.prompt}</strong>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Empty state for creating new custom category */}
                  <div className="category-accordion-item empty-state-item">
                    <button
                      className="category-accordion-trigger"
                      onClick={openCustomDialog}
                      type="button"
                    >
                      <div className="category-accordion-header">
                        <div className="category-accordion-title">
                          <strong>
                            <svg
                              className="plus-icon"
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}
                            >
                              <path
                                d="M10 5V15M5 10H15"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                            Create Custom Category
                          </strong>
                          <p className="subtle">Add your own interview questions</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="prep-sidebar">
          <section className="card">
            <div className="card-header">
              <h3>Prep Summary</h3>
            </div>
            <div className="card-body summary-card">
              <div>
                <span className="label"># Questions</span>
                <strong>{totalSelectedQuestions}</strong>
              </div>
              <div>
                <span className="label">Est. Duration</span>
                <strong>{estimatedDurationLabel}</strong>
              </div>
            </div>
            
            {/* Review Stack integrated into Prep Summary */}
            {selectedQuestions.length > 0 && (
              <div className="card-body review-stack-section">
                <div className="review-stack-header">
                  <span className="review-stack-label">Question Stack</span>
                </div>
                <div className="review-stack-list">
                  {selectedQuestions.map((question, index) => (
                    <div key={question.id} className="review-stack-item">
                      <span className="question-number">{index + 1}.</span>
                      <span className="question-text">{question.prompt || question.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="card">
            <div className="card-header">
              <h3>Interview Settings</h3>
            </div>
            <div className="card-body interview-settings">
              <label>
                <span className="label">Difficulty</span>
                <select
                  value={reviewSettings.difficulty}
                  onChange={event =>
                    setReviewSettings(prev => ({
                      ...prev,
                      difficulty: event.target.value
                    }))
                  }
                  className="styled-select"
                >
                  <option value="easy">Easy - Supportive and encouraging</option>
                  <option value="medium">Medium - Realistic with follow-ups</option>
                  <option value="hard">Hard - Challenging and rigorous</option>
                </select>
              </label>
              <button type="button" className="primary big-button" onClick={handleStartInterview} disabled={isSubmitting || selectedQuestions.length === 0}>
                {isSubmitting ? 'Starting…' : 'Start Interview'}
              </button>
            </div>
          </section>
        </aside>
      </div>

      {prepError && prepError.trim().length > 0 && (
        <div className="banner error fixed-bottom">{prepError}</div>
      )}

      {/* Custom Category Creation/Edit Modal */}
      {isCustomDialogOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal" onSubmit={handleCustomSubmit}>
            <header>
              <h4>{editingCategoryId ? 'Edit Category' : 'Create Custom Category'}</h4>
              <button type="button" className="icon-button" onClick={closeCustomDialog} aria-label="Close">
                ×
              </button>
            </header>
            <div className="modal-body">
              <label>
                Category Title
                <input
                  type="text"
                  value={draftTitle}
                  onChange={event => setDraftTitle(event.target.value)}
                  placeholder="e.g. Growth Metrics"
                />
              </label>
              <div className="question-fields">
                <strong>Questions</strong>
                {draftQuestions.map((value, index) => (
                  <div key={index} className="question-field">
                    <input
                      type="text"
                      value={value}
                      onChange={event => updateQuestionField(index, event.target.value)}
                      placeholder="Enter question"
                    />
                    {draftQuestions.length > 1 && (
                      <button type="button" className="icon-button" onClick={() => removeQuestionField(index)} aria-label="Remove question">
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="link-button" onClick={addQuestionField}>
                  + Add another question
                </button>
              </div>
              {customActionState.error && <div className="error">{customActionState.error}</div>}
            </div>
            <footer className="modal-footer">
              <button type="button" className="secondary" onClick={closeCustomDialog} disabled={customActionState.status === 'saving'}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={customActionState.status === 'saving'}>
                {customActionState.status === 'saving' ? 'Saving…' : editingCategoryId ? 'Update Category' : 'Save Category'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}


