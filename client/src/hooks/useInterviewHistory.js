import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import {
  sessionListAtom,
  appModeAtom,
  selectedSessionAtom,
  selectedSessionIdAtom
} from '../atoms/languageState.js';
import { getInterviews, getInterviewById } from '../services/localStorage.js';
import { sortInterviewsByDate } from '../utils/interviewHelpers.js';

export function useInterviewHistory() {
  const [interviewList, setInterviewList] = useAtom(sessionListAtom);
  const [selectedInterviewId, setSelectedInterviewId] = useAtom(selectedSessionIdAtom);
  const [selectedInterview, setSelectedInterview] = useAtom(selectedSessionAtom);
  const [, setAppMode] = useAtom(appModeAtom);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadHistory = useCallback(() => {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const interviews = getInterviews();
      setInterviewList(sortInterviewsByDate(interviews));
    } catch (err) {
      console.error(err);
      setHistoryError('Unable to load interview history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [setInterviewList]);

  const loadInterviewDetail = useCallback(id => {
    if (!id) {
      setSelectedInterviewId(null);
      setSelectedInterview(null);
      setDetailError('');
      setDetailLoading(false);
      setAppMode('practice');
      return;
    }

    try {
      setDetailLoading(true);
      setDetailError('');
      const record = getInterviewById(id);
      
      if (!record) {
        setDetailError('Session not found. It may have been removed.');
        setInterviewList(prev => sortInterviewsByDate(prev.filter(item => item.id !== id)));
        setSelectedInterviewId(null);
        setSelectedInterview(null);
        setAppMode('practice');
      } else {
        setSelectedInterviewId(id);
        setSelectedInterview(record);
        setAppMode('history');
      }
    } catch (err) {
      console.error(err);
      setDetailError('Unable to load session details.');
      setSelectedInterviewId(null);
      setSelectedInterview(null);
      setAppMode('practice');
    } finally {
      setDetailLoading(false);
    }
  }, [setInterviewList, setAppMode, setSelectedInterview, setSelectedInterviewId]);

  const clearSelection = useCallback(() => {
    setSelectedInterviewId(null);
    setSelectedInterview(null);
  }, [setSelectedInterview, setSelectedInterviewId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    interviewList,
    selectedInterviewId,
    selectedInterview,
    historyLoading,
    historyError,
    detailLoading,
    detailError,
    loadHistory,
    loadInterviewDetail,
    clearSelection
  };
}


