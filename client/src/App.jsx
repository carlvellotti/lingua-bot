import { useCallback, useEffect, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  appModeAtom,
  languagePreferencesAtom,
  practiceSessionAtom,
  selectedSessionIdAtom,
  selectedSessionAtom,
  sessionListAtom
} from './atoms/languageState.js';
import { summarizeLanguageSession } from './services/api.js';
import { saveSession } from './services/localStorage.js';
import { useRealtimeInterview } from './hooks/useRealtimeInterview.js';
import { useInterviewMessages } from './hooks/useInterviewMessages.js';
import { sortInterviewsByDate } from './utils/interviewHelpers.js';
import SetupPage from './components/language/SetupPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import InterviewView from './components/interview/InterviewView.jsx';
import HistoryView from './components/interview/HistoryView.jsx';
import './redesign.css';

function PracticeExperience() {
  const appMode = useAtomValue(appModeAtom);
  const preferences = useAtomValue(languagePreferencesAtom);
  const [practiceSession, setPracticeSession] = useAtom(practiceSessionAtom);

  const [summary, setSummary] = useState('');
  
  const selectedSessionId = useAtomValue(selectedSessionIdAtom);
  const selectedSession = useAtomValue(selectedSessionAtom);
  const [sessionList, setSessionList] = useAtom(sessionListAtom);

  // Scroll to top when practice starts
  useEffect(() => {
    if (appMode === 'practice') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [appMode]);

  const {
    status,
    error,
    isMicActive,
    remoteAudioRef,
    remoteStream,
    dataChannelRef,
    startInterview,
    cleanupConnection
  } = useRealtimeInterview();
  
  const isViewingHistory = appMode === 'history' && selectedSessionId !== null;

  const fetchSummary = useCallback(async conversation => {
    if (!conversation || conversation.length === 0) {
      setSummary('Transcript unavailable, so feedback could not be generated.');
      return;
    }

    try {
      setSummary('Generating learning insights…');
      const { summary: summaryText } = await summarizeLanguageSession(conversation, preferences);
      setSummary(summaryText || '');

      const metadata = {
        preferences,
        savedAt: new Date().toISOString()
      };

      const record = saveSession({
        transcript: conversation,
        summary: summaryText,
        metadata,
        title: `Practice Session - ${new Date().toLocaleDateString()}`
      });

      setSessionList(prev => sortInterviewsByDate([record, ...prev.filter(item => item.id !== record?.id)]));
    } catch (err) {
      console.error(err);
      setSummary('Unable to generate summary right now.');
    }
  }, [preferences, setSessionList]);

  const {
    displayMessages,
    conversationRef,
    handleDataChannelMessage,
    resetMessages
  } = useInterviewMessages({
    onComplete: (conversation) => {
      cleanupConnection();
      setPracticeSession(null); // Clear session to prevent auto-restart
      fetchSummary(conversation);
    }
  });

  useEffect(() => {
    if (appMode === 'practice' && practiceSession && status === 'idle') {
      const initPractice = async () => {
        // For language practice, we don't have a question stack, so pass empty array
        // The system prompt is already set in the session
        await startInterview(practiceSession, [], handleDataChannelMessage);
      };
      initPractice();
    }
  }, [appMode, practiceSession, status, startInterview, handleDataChannelMessage]);

  const resetPractice = useCallback((options = {}) => {
    const { forceDiscard = false } = options;

    const hasConversation = conversationRef.current && conversationRef.current.length > 0;

    if (!forceDiscard && hasConversation) {
      fetchSummary(conversationRef.current);
      cleanupConnection();
      setPracticeSession(null); // Clear session to prevent auto-restart
      return;
    }

    cleanupConnection();
    setPracticeSession(null); // Clear session to prevent auto-restart
    setSummary('');
    resetMessages();
  }, [cleanupConnection, fetchSummary, resetMessages, setPracticeSession]);

  if (isViewingHistory) {
    return (
      <HistoryView
        onReturnToLive={() => resetPractice({ forceDiscard: true })}
        summary={summary}
      />
    );
  }

  return (
    <InterviewView
      status={status}
      error={error}
      isMicActive={isMicActive}
      remoteAudioRef={remoteAudioRef}
      remoteStream={remoteStream}
      displayMessages={displayMessages}
      summary={summary}
      onReset={() => resetPractice()}
    />
  );
}

export default function App() {
  const appMode = useAtomValue(appModeAtom);
  
  if (appMode === 'setup') {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="workspace" style={{ backgroundColor: '#f0f7ff' }}>
          <div className="w-full max-w-4xl mx-auto p-3 md:p-4">
            <SetupPage />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workspace">
        <PracticeExperience />
      </main>
    </div>
  );
}
