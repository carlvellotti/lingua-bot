const API_BASE_URL = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured && typeof configured === 'string' && configured.trim().length > 0) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    // Always use same-origin /api path (works for both vercel dev and production)
    return `${origin.replace(/\/$/, '')}/api`;
  }

  return '/api';
})();

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let errorMessage = text;
    try {
      const json = JSON.parse(text);
      errorMessage = json?.error || text;
    } catch (_err) {
      // ignore
    }
    const error = new Error(errorMessage || 'Request failed');
    error.status = response.status;
    throw error;
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export async function fetchConfiguration() {
  // Returns: { categories, questions, evaluationFocus, personas, defaults }
  // NEW: categories array with interview types
  // OLD: questions, evaluationFocus, defaults (backward compatible)
  const response = await fetch(`${API_BASE_URL}/questions`);
  return handleResponse(response);
}

// Note: Custom category functions moved to localStorage.js

export async function uploadJobDescription(payload) {
  const response = await fetch(`${API_BASE_URL}/interview/jd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function startInterviewSession(payload) {
  // Accepts two formats:
  // NEW: { categoryId, questionIds, difficulty, resumeRef }
  // OLD: { questionStack, difficulty, resumeRef, jdSummary } (still supported)
  const response = await fetch(`${API_BASE_URL}/interview/start-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

// Note: Interview history and save functions moved to localStorage.js

export async function summarizeInterview(conversation) {
  const response = await fetch(`${API_BASE_URL}/interview/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation })
  });
  return handleResponse(response);
}

export async function createRealtimeSession(payload) {
  const response = await fetch(`${API_BASE_URL}/realtime/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function startLanguageSession(preferences, memories = []) {
  // Start a language practice session with personality, speed, level, style
  // memories is an optional array of memory objects or strings
  const response = await fetch(`${API_BASE_URL}/language/start-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...preferences,
      memories
    })
  });
  return handleResponse(response);
}

export async function summarizeLanguageSession(conversation, preferences) {
  // Generate language learning insights from the conversation
  const response = await fetch(`${API_BASE_URL}/language/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation, preferences })
  });
  return handleResponse(response);
}

