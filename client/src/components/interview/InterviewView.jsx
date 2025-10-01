import { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import {
  interviewQuestionStackAtom,
  interviewPersonaAtom,
  reviewSettingsAtom,
  jdSummaryAtom
} from '../../atoms/prepState.js';
import { formatLabel } from '../../utils/formatters.js';
import { parseCoachingSummary } from '../../utils/interviewHelpers.js';
import AudioVisualizer from './AudioVisualizer.jsx';
import QuestionStack from './QuestionStack.jsx';
import SessionDetails from './SessionDetails.jsx';

export default function InterviewView({
  status,
  error,
  isMicActive,
  remoteAudioRef,
  remoteStream,
  displayMessages,
  summary,
  onReset
}) {
  const [displayMode, setDisplayMode] = useState('equalizer'); // equalizer | transcript
  
  const interviewStack = useAtomValue(interviewQuestionStackAtom);
  const interviewPersona = useAtomValue(interviewPersonaAtom);
  const reviewSettings = useAtomValue(reviewSettingsAtom);
  const jdSummary = useAtomValue(jdSummaryAtom);
  
  const coaching = useMemo(() => parseCoachingSummary(summary), [summary]);

  return (
    <>
      <header className="workspace-header interview-header">
        <div className="header-text">
          <h2>{summary ? 'Practice Session Complete' : 'Practice Session'}</h2>
          <p className="subtle">{summary ? 'Review your progress below' : 'Your conversation is live'}</p>
        </div>
      </header>

      {summary ? (
        // Show summary when practice session is complete
        <>
          <section className="summary">
            <h3>Learning Insights</h3>
            <div>
              {coaching ? (
                <>
                  {coaching.summary && (
                    <div className="summary-block">
                      <h4>Summary</h4>
                      <p>{coaching.summary}</p>
                    </div>
                  )}
                  {coaching.strengths.length > 0 && (
                    <div className="summary-block">
                      <h4>What You Did Well</h4>
                      <ul>
                        {coaching.strengths.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {coaching.improvements.length > 0 && (
                    <div className="summary-block">
                      <h4>Areas to Practice</h4>
                      <ul>
                        {coaching.improvements.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <pre>{summary}</pre>
              )}
            </div>
          </section>

          <section className="history-section">
            <h3>Transcript</h3>
            {displayMessages.length === 0 ? (
              <div className="history-placeholder">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>💬</div>
                <div>No transcript available</div>
              </div>
            ) : (
              <div className="history-transcript">
                {displayMessages.map((entry, index) => {
                  const role = entry.role || 'unknown';
                  const label = role === 'assistant' ? 'Tutor' : role === 'user' ? 'You' : role;
                  const text = entry.text || '';
                  return (
                    <div className="history-turn" key={index}>
                      <div className="turn-role">{label}</div>
                      <div className="turn-text">{text || '—'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        // Show live interview UI
        <>
          <section className="live-stage-full">
            <div className="panel">
              <div className="panel-header">
                {status === 'in-progress' ? (
                  <div className={`mic-indicator ${isMicActive ? 'active' : ''}`}>
                    <span className="dot" />
                    <span>{isMicActive ? 'Microphone live' : 'Microphone unavailable'}</span>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>

              {displayMode === 'transcript' ? (
                <div className={`transcript-view ${status === 'in-progress' ? 'active' : ''}`}>
                  {displayMessages.length === 0 ? (
                    <span className="placeholder subtle">Transcript will appear here once the conversation starts…</span>
                  ) : (
                    <pre>
                      {displayMessages
                        .map(m => `${m.role === 'assistant' ? 'Tutor' : 'You'}: ${m.text}`)
                        .join('\n\n')}
                      {status === 'in-progress' ? '▋' : ''}
                    </pre>
                  )}
                </div>
              ) : (
                <AudioVisualizer remoteStream={remoteStream} status={status} />
              )}
            </div>
          </section>

          {status === 'in-progress' && (
            <div className="interview-actions">
              <button
                type="button"
                className="toggle-button"
                onClick={() => setDisplayMode(displayMode === 'equalizer' ? 'transcript' : 'equalizer')}
              >
                Switch to {displayMode === 'equalizer' ? 'Transcript' : 'Visualization'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={onReset}
              >
                End Session
              </button>
            </div>
          )}
        </>
      )}

      <div className="live-details-grid">
        <SessionDetails
          difficulty={reviewSettings.difficulty}
          jdSummary={jdSummary}
        />
        <QuestionStack questions={interviewStack} />
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />
    </>
  );
}
