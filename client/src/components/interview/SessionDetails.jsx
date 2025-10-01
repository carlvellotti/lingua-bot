import { formatLabel } from '../../utils/formatters.js';

export default function SessionDetails({ difficulty, jdSummary }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>Session Details</h3>
        </div>
      </div>
      <div className="card-body session-details-list">
        <div className="session-detail-item">
          <span className="label">Difficulty</span>
          <strong>{formatLabel(difficulty)}</strong>
        </div>
        <div className="session-detail-item">
          <span className="label">JD summary</span>
          <strong>{jdSummary ? 'Included' : 'Not provided'}</strong>
        </div>
      </div>
    </section>
  );
}
