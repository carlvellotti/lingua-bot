export default function QuestionStack({ questions }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>Question Stack</h3>
          <p className="subtle">Reference while you interview.</p>
        </div>
      </div>
      <div className="card-body question-stack">
        {questions.length === 0 ? (
          <div className="empty-state subtle">Question stack unavailable.</div>
        ) : (
          <ul className="question-stack-list">
            {questions.map(question => (
              <li key={question.id} className="question-stack-item">
                <strong>{question.text || question.prompt}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
