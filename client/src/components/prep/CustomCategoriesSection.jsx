import { useState, memo } from 'react';

function CustomCategoriesSection({
  categories,
  selectedQuestionIds,
  onToggle,
  onCreate,
  onUpdate,
  onDelete
}) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftQuestions, setDraftQuestions] = useState(['']);
  const [actionState, setActionState] = useState({ status: 'idle', error: '' });

  const resetDraft = () => {
    setDraftTitle('');
    setDraftQuestions(['']);
    setEditingCategoryId(null);
    setActionState({ status: 'idle', error: '' });
  };

  const openDialog = () => {
    resetDraft();
    setDialogOpen(true);
  };

  const openEditDialog = (categoryId, category) => {
    setEditingCategoryId(categoryId);
    setDraftTitle(category.title || '');
    setDraftQuestions(category.questions?.map(q => q.text || '') || ['']);
    setActionState({ status: 'idle', error: '' });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetDraft();
  };

  const addQuestionField = () => {
    setDraftQuestions(prev => [...prev, '']);
  };

  const updateQuestionField = (index, value) => {
    setDraftQuestions(prev => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const removeQuestionField = index => {
    setDraftQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!draftTitle.trim()) {
      setActionState({ status: 'error', error: 'Category title is required.' });
      return;
    }

    const questions = draftQuestions
      .map(text => text.trim())
      .filter(Boolean)
      .map(text => ({ text }));

    if (questions.length === 0) {
      setActionState({ status: 'error', error: 'Add at least one question.' });
      return;
    }

    try {
      setActionState({ status: 'saving', error: '' });
      if (editingCategoryId) {
        await onUpdate(editingCategoryId, { title: draftTitle.trim(), questions });
      } else {
        await onCreate({ title: draftTitle.trim(), questions });
      }
      closeDialog();
    } catch (error) {
      setActionState({ status: 'error', error: error?.message || 'Failed to save category.' });
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>Custom Categories</h3>
          <p className="subtle">Create your own prompts to reuse in future sessions.</p>
        </div>
        <button type="button" className="tone-button" onClick={openDialog}>
          New Category
        </button>
      </div>
      <div className="card-body">
        {Array.isArray(categories) && categories.length > 0 ? (
          categories.map(category => (
            <div key={category.id} className="custom-category">
              <div className="custom-category-header">
                <strong>{category.title}</strong>
                <div className="actions">
                  <button type="button" className="link-button" onClick={() => openEditDialog(category.id, category)}>
                    Edit
                  </button>
                  <button type="button" className="link-button danger" onClick={() => onDelete(category.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="custom-category-questions">
                {Array.isArray(category.questions) && category.questions.length > 0 ? (
                  category.questions.map(question => {
                    const id = question.id;
                    const isSelected = selectedQuestionIds.includes(id);
                    return (
                      <label key={id} className={`question-item compact ${isSelected ? 'selected' : ''}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => onToggle(id)} />
                        <span>{question.text}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className="empty-state subtle">No questions in this category yet.</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state subtle">No custom categories yet.</div>
        )}
      </div>

      {isDialogOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal" onSubmit={handleSubmit}>
            <header>
              <h4>{editingCategoryId ? 'Edit Category' : 'Create Custom Category'}</h4>
              <button type="button" className="icon-button" onClick={closeDialog} aria-label="Close">
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
              {actionState.error && <div className="error">{actionState.error}</div>}
            </div>
            <footer className="modal-footer">
              <button type="button" className="secondary" onClick={closeDialog} disabled={actionState.status === 'saving'}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={actionState.status === 'saving'}>
                {actionState.status === 'saving' ? 'Saving…' : editingCategoryId ? 'Update Category' : 'Save Category'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

export default memo(CustomCategoriesSection);


