import { atom } from 'jotai';

// App mode: 'setup' | 'practice' | 'history'
export const appModeAtom = atom('setup');

// Language learning preferences
export const languagePreferencesAtom = atom({
  language: 'es', // Target language to learn
  personality: 'fizz',
  speed: 'normal',
  level: 'intermediate',
  style: 'casual'
});

// Session state
export const practiceSessionAtom = atom(null);
export const sessionErrorAtom = atom('');
export const isStartingSessionAtom = atom(false);

// History
export const selectedSessionIdAtom = atom(null);
export const selectedSessionAtom = atom(null);
export const sessionListAtom = atom([]);

