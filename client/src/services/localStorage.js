/**
 * localStorage Service
 * 
 * Handles all localStorage operations for interviews and categories.
 * Replaces the SQLite backend with browser-based storage.
 */

const STORAGE_KEYS = {
  INTERVIEWS: 'interview-coach-interviews',
  CATEGORIES: 'interview-coach-categories',
  VERSION: 'interview-coach-version',
  LAST_EXPORT: 'interview-coach-last-export'
};

const CURRENT_VERSION = '1.0.0';

// Initialize version on first load
function ensureVersion() {
  const version = localStorage.getItem(STORAGE_KEYS.VERSION);
  if (!version) {
    localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
  }
}

/**
 * Safe JSON parse with error handling
 */
function safeJSONParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse JSON from localStorage:', error);
    return fallback;
  }
}

/**
 * Safe JSON stringify with error handling
 */
function safeJSONStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Failed to stringify JSON for localStorage:', error);
    throw new Error('Failed to serialize data');
  }
}

/**
 * Check if localStorage is available and has space
 */
function checkStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('localStorage is not available:', error);
    return false;
  }
}

/**
 * Get approximate storage usage (in KB)
 */
export function getStorageUsage() {
  let totalSize = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += localStorage[key].length + key.length;
    }
  }
  return Math.round(totalSize / 1024); // Convert to KB
}

// ============================================
// INTERVIEW OPERATIONS
// ============================================

/**
 * Get all interviews from localStorage
 * @returns {Array} Array of interview objects
 */
export function getInterviews() {
  ensureVersion();
  if (!checkStorageAvailable()) {
    console.warn('localStorage not available, returning empty array');
    return [];
  }
  
  const data = localStorage.getItem(STORAGE_KEYS.INTERVIEWS);
  const interviews = safeJSONParse(data, []);
  
  // Ensure it's an array
  return Array.isArray(interviews) ? interviews : [];
}

/**
 * Get a single interview by ID
 * @param {string} id - Interview ID
 * @returns {Object|null} Interview object or null if not found
 */
export function getInterviewById(id) {
  const interviews = getInterviews();
  return interviews.find(interview => interview.id === id) || null;
}

/**
 * Save or update an interview
 * @param {Object} interview - Interview object to save
 * @returns {Object} Saved interview object
 */
export function saveInterview(interview) {
  if (!interview) {
    throw new Error('Interview object is required');
  }
  
  if (!checkStorageAvailable()) {
    throw new Error('localStorage is not available');
  }
  
  const interviews = getInterviews();
  const now = new Date().toISOString();
  
  // Generate ID if not provided
  if (!interview.id) {
    interview.id = generateId();
  }
  
  // Set timestamps
  const existingIndex = interviews.findIndex(item => item.id === interview.id);
  const isUpdate = existingIndex !== -1;
  
  const interviewRecord = {
    ...interview,
    createdAt: isUpdate ? interviews[existingIndex].createdAt : (interview.createdAt || now),
    updatedAt: now
  };
  
  // Update or add
  if (isUpdate) {
    interviews[existingIndex] = interviewRecord;
  } else {
    interviews.push(interviewRecord);
  }
  
  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.INTERVIEWS, safeJSONStringify(interviews));
    return interviewRecord;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please export and clear old interviews.');
    }
    throw error;
  }
}

/**
 * Save a practice session (alias for saveInterview for language learning)
 * @param {Object} session - Session object
 * @returns {Object} Saved session record with timestamps
 */
export function saveSession(session) {
  return saveInterview(session);
}

/**
 * Delete an interview by ID
 * @param {string} id - Interview ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteInterview(id) {
  const interviews = getInterviews();
  const filteredInterviews = interviews.filter(interview => interview.id !== id);
  
  if (filteredInterviews.length === interviews.length) {
    return false; // Not found
  }
  
  localStorage.setItem(STORAGE_KEYS.INTERVIEWS, safeJSONStringify(filteredInterviews));
  return true;
}

// ============================================
// CUSTOM CATEGORY OPERATIONS
// ============================================

/**
 * Get all custom categories from localStorage
 * @returns {Array} Array of category objects
 */
export function getCustomCategories() {
  ensureVersion();
  if (!checkStorageAvailable()) {
    console.warn('localStorage not available, returning empty array');
    return [];
  }
  
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  const categories = safeJSONParse(data, []);
  
  return Array.isArray(categories) ? categories : [];
}

/**
 * Get a single category by ID
 * @param {string} id - Category ID
 * @returns {Object|null} Category object or null if not found
 */
export function getCustomCategoryById(id) {
  const categories = getCustomCategories();
  return categories.find(category => category.id === id) || null;
}

/**
 * Save or update a custom category
 * @param {Object} category - Category object to save
 * @returns {Object} Saved category object
 */
export function saveCustomCategory(category) {
  if (!category) {
    throw new Error('Category object is required');
  }
  
  if (!category.title || typeof category.title !== 'string' || category.title.trim().length === 0) {
    throw new Error('Category title is required');
  }
  
  if (!checkStorageAvailable()) {
    throw new Error('localStorage is not available');
  }
  
  const categories = getCustomCategories();
  const now = new Date().toISOString();
  
  // Generate ID if not provided
  if (!category.id) {
    category.id = generateId();
  }
  
  // Ensure questions array exists and is normalized
  const questions = normalizeQuestions(category.questions || []);
  
  // Set timestamps
  const existingIndex = categories.findIndex(item => item.id === category.id);
  const isUpdate = existingIndex !== -1;
  
  const categoryRecord = {
    id: category.id,
    title: category.title.trim(),
    questions,
    createdAt: isUpdate ? categories[existingIndex].createdAt : (category.createdAt || now),
    updatedAt: now
  };
  
  // Update or add
  if (isUpdate) {
    categories[existingIndex] = categoryRecord;
  } else {
    categories.push(categoryRecord);
  }
  
  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, safeJSONStringify(categories));
    return categoryRecord;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please export and clear old data.');
    }
    throw error;
  }
}

/**
 * Delete a custom category by ID
 * @param {string} id - Category ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteCustomCategory(id) {
  const categories = getCustomCategories();
  const filteredCategories = categories.filter(category => category.id !== id);
  
  if (filteredCategories.length === categories.length) {
    return false; // Not found
  }
  
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, safeJSONStringify(filteredCategories));
  return true;
}

/**
 * Normalize questions array (same logic as backend)
 */
function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) {
    return [];
  }
  
  return questions
    .map(question => {
      if (!question || typeof question !== 'object') return null;
      
      const id = typeof question.id === 'string' && question.id.trim().length > 0
        ? question.id.trim()
        : generateId();
      
      const text = typeof question.text === 'string' ? question.text.trim() : '';
      if (!text) return null;
      
      const source = typeof question.source === 'string' ? question.source.trim() : null;
      const categoryId = typeof question.categoryId === 'string' ? question.categoryId.trim() : null;
      const estimatedDuration = Number.isFinite(question.estimatedDuration)
        ? Number(question.estimatedDuration)
        : null;
      
      return {
        id,
        text,
        source,
        categoryId,
        estimatedDuration
      };
    })
    .filter(Boolean);
}

// ============================================
// EXPORT / IMPORT OPERATIONS
// ============================================

/**
 * Export all data as a JSON object
 * @returns {Object} Export data object
 */
export function exportAllData() {
  const interviews = getInterviews();
  const categories = getCustomCategories();
  const lastExport = localStorage.getItem(STORAGE_KEYS.LAST_EXPORT);
  
  const exportData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      interviews,
      categories
    },
    metadata: {
      interviewCount: interviews.length,
      categoryCount: categories.length,
      lastExport: lastExport || null
    }
  };
  
  // Update last export timestamp
  localStorage.setItem(STORAGE_KEYS.LAST_EXPORT, exportData.exportedAt);
  
  return exportData;
}

/**
 * Import data from a JSON object
 * @param {Object} exportData - Export data object
 * @param {Object} options - Import options
 * @param {boolean} options.merge - If true, merge with existing data; if false, replace
 * @returns {Object} Import result with counts
 */
export function importData(exportData, options = { merge: true }) {
  if (!exportData || typeof exportData !== 'object') {
    throw new Error('Invalid import data');
  }
  
  if (!exportData.version || !exportData.data) {
    throw new Error('Import data is missing required fields (version, data)');
  }
  
  // TODO: Add version compatibility check
  // For now, we only have v1.0.0
  
  const { merge } = options;
  const importedInterviews = Array.isArray(exportData.data.interviews) ? exportData.data.interviews : [];
  const importedCategories = Array.isArray(exportData.data.categories) ? exportData.data.categories : [];
  
  let interviews = [];
  let categories = [];
  
  if (merge) {
    // Merge: Keep existing data, add new items, update duplicates
    const existingInterviews = getInterviews();
    const existingCategories = getCustomCategories();
    
    // Create maps for efficient lookups
    const interviewMap = new Map(existingInterviews.map(item => [item.id, item]));
    const categoryMap = new Map(existingCategories.map(item => [item.id, item]));
    
    // Add/update imported items
    importedInterviews.forEach(item => {
      interviewMap.set(item.id, item);
    });
    
    importedCategories.forEach(item => {
      categoryMap.set(item.id, item);
    });
    
    interviews = Array.from(interviewMap.values());
    categories = Array.from(categoryMap.values());
  } else {
    // Replace: Clear existing data, use only imported data
    interviews = importedInterviews;
    categories = importedCategories;
  }
  
  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.INTERVIEWS, safeJSONStringify(interviews));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, safeJSONStringify(categories));
    localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
    
    return {
      success: true,
      interviewsImported: importedInterviews.length,
      categoriesImported: importedCategories.length,
      totalInterviews: interviews.length,
      totalCategories: categories.length
    };
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Cannot import data.');
    }
    throw error;
  }
}

/**
 * Clear all data from localStorage (nuclear option)
 * @returns {boolean} True if successful
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.INTERVIEWS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.LAST_EXPORT);
    // Keep version
    return true;
  } catch (error) {
    console.error('Failed to clear data:', error);
    return false;
  }
}

/**
 * Get last export date
 * @returns {string|null} ISO date string or null
 */
export function getLastExportDate() {
  return localStorage.getItem(STORAGE_KEYS.LAST_EXPORT);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a unique ID (UUID v4 compatible)
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get storage health status
 * @returns {Object} Status object
 */
export function getStorageHealth() {
  const usageKB = getStorageUsage();
  const maxKB = 5 * 1024; // Assume ~5MB limit (conservative)
  const usagePercent = (usageKB / maxKB) * 100;
  
  return {
    usageKB,
    maxKB,
    usagePercent: Math.round(usagePercent),
    status: usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'ok',
    message: 
      usagePercent > 90 ? 'Storage almost full. Export and clear old interviews immediately.' :
      usagePercent > 80 ? 'Storage usage high. Consider exporting and clearing old interviews.' :
      'Storage usage is healthy.'
  };
}

