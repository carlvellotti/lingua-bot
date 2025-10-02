import { useAtom, useAtomValue } from 'jotai';
import { prepModeAtom, selectedInterviewIdAtom, selectedInterviewAtom } from '../../atoms/prepState.js';
import { useInterviewHistory } from '../../hooks/useInterviewHistory.js';
import { normaliseTranscriptEntryContent, parseCoachingSummary, getRecordTitle } from '../../utils/interviewHelpers.js';
import { formatHeaderTimestamp } from '../../utils/formatters.js';
import { useMemo } from 'react';

// Parse language learning summary markdown
function parseLanguageSummary(text) {
  if (!text) return null;
  
  const sections = {};
  const lines = text.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    if (line.startsWith('##')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = line.replace(/^##\s*/, '').trim();
      currentContent = [];
    } else if (currentSection && line.trim()) {
      currentContent.push(line);
    }
  }
  
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }
  
  return Object.keys(sections).length > 0 ? sections : null;
}

export default function HistoryView({ onReturnToLive, summary, sessionData = null }) {
  const [prepMode, setPrepMode] = useAtom(prepModeAtom);
  const selectedInterviewId = useAtomValue(selectedInterviewIdAtom);
  const selectedInterview = useAtomValue(selectedInterviewAtom);
  const { detailLoading, detailError } = useInterviewHistory();

  // Use passed session data if provided (for language practice), otherwise use interview atoms
  const activeSession = sessionData || selectedInterview;
  
  const detailTitle = useMemo(() => getRecordTitle(activeSession), [activeSession]);
  const detailTimestamp = useMemo(() => formatHeaderTimestamp(activeSession?.createdAt), [activeSession]);
  const detailEvaluation = activeSession?.evaluation ?? null;
  
  const detailCoaching = useMemo(() => {
    if (!detailEvaluation) return null;
    const summaryValue = detailEvaluation.summary ?? detailEvaluation.rawSummary;
    const strengthsValue = Array.isArray(detailEvaluation.strengths)
      ? detailEvaluation.strengths
      : [];
    const improvementsValue = Array.isArray(detailEvaluation.improvements)
      ? detailEvaluation.improvements
      : [];

    if (summaryValue || strengthsValue.length > 0 || improvementsValue.length > 0) {
      return {
        summary: summaryValue ?? '',
        strengths: strengthsValue,
        improvements: improvementsValue
      };
    }

    if (typeof detailEvaluation.rawSummary === 'string') {
      return parseCoachingSummary(detailEvaluation.rawSummary);
    }

    if (typeof detailEvaluation.text === 'string') {
      return parseCoachingSummary(detailEvaluation.text);
    }

    return null;
  }, [detailEvaluation]);
  
  // Parse language learning summary if present
  const languageSummary = useMemo(() => {
    // Check if this is a language practice session (has sessionData or metadata with preferences)
    const isLanguageSession = sessionData || activeSession?.metadata?.preferences;
    if (!isLanguageSession) return null;
    
    // Try parsing from summary prop first, then from activeSession.summary
    const summaryText = summary || activeSession?.summary;
    return parseLanguageSummary(summaryText);
  }, [sessionData, activeSession, summary]);
  
  const detailTranscript = activeSession?.transcript ?? [];

  // Show loading state if we're in history mode but data hasn't loaded yet
  if (!sessionData && detailLoading) {
    return (
      <>
        <header className="workspace-header">
          <div className="header-text">
            <h2>Loading...</h2>
            <p className="subtle">Fetching session details</p>
          </div>
        </header>
        <div className="spinner" style={{ margin: '2rem auto' }}>Loading session...</div>
      </>
    );
  }

  // Show error state
  if (!sessionData && detailError) {
    return (
      <>
        <header className="workspace-header">
          <div className="header-text">
            <h2>Error</h2>
            <p className="subtle">{detailError}</p>
          </div>
        </header>
        <div className="banner error">{detailError}</div>
      </>
    );
  }

  // If no session loaded, don't render
  if (!activeSession) {
    return null;
  }

  return (
    <>
      <header className="workspace-header interview-header mb-6">
        <div className="header-text">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{detailTitle}</h2>
          <p className="text-base text-gray-600">{detailTimestamp || 'Saved session'}</p>
        </div>
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
          onClick={onReturnToLive}
        >
          Return to live mode
        </button>
      </header>

      {detailError && <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">{detailError}</div>}

      {/* Learning Insights - First */}
      <section className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-md mb-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 px-5 py-4 border-b-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 m-0">Learning Insights</h3>
        </div>
        <div className="p-6">
          {detailLoading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3 opacity-30">⏳</div>
              <div className="text-base">Loading insights…</div>
            </div>
          ) : languageSummary ? (
            <div className="space-y-6">
              {Object.entries(languageSummary).map(([title, content], index) => (
                <div key={index}>
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">{title}</h4>
                  <div className="text-base text-gray-800 leading-relaxed space-y-2">
                    {content.split('\n').map((line, i) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      
                      if (trimmed.startsWith('- **') || trimmed.startsWith('**-')) {
                        // Remove markdown formatting and clean up colons
                        let text = trimmed
                          .replace(/^-?\s*\*\*/, '')  // Remove leading - and **
                          .replace(/\*\*/g, '')       // Remove all remaining **
                          .replace(/::+/g, ':')       // Replace multiple colons with single
                          .trim();
                        return (
                          <div key={i} className="pl-6 relative">
                            <span className="absolute left-0 text-blue-500 font-bold">→</span>
                            <span className="font-semibold">{text}</span>
                          </div>
                        );
                      } else if (trimmed.startsWith('-')) {
                        return (
                          <div key={i} className="pl-6 relative">
                            <span className="absolute left-0 text-blue-500">•</span>
                            <span>{trimmed.substring(1).trim()}</span>
                          </div>
                        );
                      } else {
                        return <p key={i} className="mb-2">{trimmed}</p>;
                      }
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : detailCoaching ? (
            <div className="space-y-6">
              {detailCoaching.summary && (
                <div>
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-2">Summary</h4>
                  <p className="text-base text-gray-800 leading-relaxed">{detailCoaching.summary}</p>
                </div>
              )}
              {detailCoaching.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-green-600 uppercase tracking-wide mb-2">What You Did Well</h4>
                  <ul className="space-y-2 pl-0">
                    {detailCoaching.strengths.map((item, index) => (
                      <li key={index} className="text-base text-gray-800 leading-relaxed pl-6 relative before:content-['→'] before:absolute before:left-0 before:text-green-500 before:font-bold">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {detailCoaching.improvements.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-2">Areas to Practice</h4>
                  <ul className="space-y-2 pl-0">
                    {detailCoaching.improvements.map((item, index) => (
                      <li key={index} className="text-base text-gray-800 leading-relaxed pl-6 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500 before:font-bold">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : summary ? (
            <pre className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border-2 border-gray-200">{summary}</pre>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3 opacity-30">📊</div>
              <div className="text-base">No evaluation available</div>
              <div className="text-sm mt-2 opacity-60">This session was saved before completion</div>
            </div>
          )}
        </div>
      </section>

      {/* Transcript - Second */}
      <section className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-md mb-6">
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-5 py-4 border-b-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 m-0">Transcript</h3>
        </div>
        {detailLoading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3 opacity-30">⏳</div>
            <div className="text-base">Loading transcript…</div>
          </div>
        ) : detailTranscript.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3 opacity-30">💬</div>
            <div className="text-base">No transcript available</div>
          </div>
        ) : (
          <div className="p-6 max-h-[600px] overflow-y-auto space-y-4">
            {detailTranscript.map((entry, index) => {
              const role = entry.role || 'unknown';
              const label = role === 'assistant' ? 'Tutor' : role === 'user' ? 'You' : role;
              const text = normaliseTranscriptEntryContent(entry.content ?? entry.text ?? entry.contentText);
              return (
                <div className="grid grid-cols-[120px_1fr] gap-4 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0" key={entry.id || index}>
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-600 pt-1">{label}</div>
                  <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{text || '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
