import { memo, useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { appModeAtom } from '../atoms/languageState.js';
import { useInterviewHistory } from '../hooks/useInterviewHistory.js';
import { formatSidebarTimestamp, shortenSummary } from '../utils/formatters.js';
import { getListDisplayTitle } from '../utils/interviewHelpers.js';

function Sidebar() {
  const setAppMode = useSetAtom(appModeAtom);
  const {
    interviewList,
    selectedInterviewId,
    historyLoading,
    historyError,
    loadInterviewDetail,
    clearSelection
  } = useInterviewHistory();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile and collapse by default
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsExpanded(!mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNewSession = () => {
    clearSelection();
    setAppMode('setup');
  };

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  const historyCount = interviewList?.length || 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Lingua Bot</h1>
        <div className="sidebar-actions">
          <button type="button" className="sidebar-primary-action" onClick={handleNewSession}>
            New Session
          </button>
          {!isExpanded && historyCount > 0 && (
            <button type="button" className="history-toggle" onClick={toggleExpanded} aria-label={`View past sessions (${historyCount})`}>
              <span className="history-icon">⏮</span>
              <span className="history-count">{historyCount}</span>
            </button>
          )}
        </div>
      </div>
      {isExpanded && (
        <>
          <div className="sidebar-body">
        {historyLoading ? (
          <div className="sidebar-placeholder subtle">Loading history…</div>
        ) : historyError ? (
          <div className="sidebar-placeholder error">{historyError}</div>
        ) : interviewList.length === 0 ? (
          <div className="sidebar-placeholder subtle">No sessions yet. Start a new practice session to see it here.</div>
        ) : (
          <ul className="interview-list">
            {interviewList.map(item => {
              const isActive = item.id === selectedInterviewId;
              const label = getListDisplayTitle(item);
              const subtitle = formatSidebarTimestamp(item.createdAt);
              const snippet = shortenSummary(item.evaluationSummary ?? '');
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`interview-list-item ${isActive ? 'active' : ''}`}
                    onClick={() => loadInterviewDetail(item.id)}
                  >
                    <span className="item-title">{label}</span>
                    <span className="item-meta">{subtitle}</span>
                    {snippet && <span className="item-snippet">{snippet}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {isMobile && (
        <button type="button" className="history-collapse" onClick={toggleExpanded}>
          Hide History
        </button>
      )}
        </>
      )}
    </aside>
  );
}

export default memo(Sidebar);


