import { memo } from 'react';

function QuestionSection({ title, subtitle, questions, selectedQuestionIds, onToggle }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="subtle">{subtitle}</p>}
        </div>
      </div>
      <div className="card-body question-list">
        {Array.isArray(questions) && questions.length > 0 ? (
          questions.map(question => {
            const id = question.id;
            const prompt = question.prompt || question.text;
            const description = question.description || question.rationale || '';
            const isSelected = selectedQuestionIds.includes(id);
            return (
              <label key={id} className={`question-item ${isSelected ? 'selected' : ''}`}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(id)} />
                <div>
                  <strong>
                    {prompt}
                    {question.estimatedDuration && (
                      <span className="duration-badge"> ({question.estimatedDuration} min)</span>
                    )}
                  </strong>
                  {description && <p className="subtle">{description}</p>}
                </div>
              </label>
            );
          })
        ) : (
          <div className="empty-state subtle">No questions available.</div>
        )}
      </div>
    </section>
  );
}

export default memo(QuestionSection);


