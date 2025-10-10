import { useState, useEffect } from 'react';
import { getMemories, clearMemories } from '../../services/localStorage.js';
import { formatDetailTimestamp } from '../../utils/formatters.js';

export default function MemoriesModal({ personalityId, personalityName, onClose }) {
  const [memories, setMemories] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (personalityId) {
      const loadedMemories = getMemories(personalityId);
      // Sort by timestamp descending (newest first)
      const sortedMemories = loadedMemories.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // Newest first
      });
      setMemories(sortedMemories);
    }
  }, [personalityId]);

  const handleClearAll = () => {
    setShowConfirmation(true);
  };

  const confirmClear = () => {
    try {
      clearMemories(personalityId);
      setMemories([]);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Failed to clear memories:', error);
      alert('Failed to clear memories. Please try again.');
    }
  };

  const cancelClear = () => {
    setShowConfirmation(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                💭 {personalityName}'s Memories
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {memories.length} {memories.length === 1 ? 'memory' : 'memories'} saved
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {memories.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🧠</div>
                <p className="text-gray-500 text-lg mb-2">No memories yet!</p>
                <p className="text-gray-400 text-sm">
                  Start a conversation to build history with {personalityName}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <p className="text-gray-800 mb-2">{memory.memory}</p>
                    <p className="text-xs text-gray-400">
                      {formatDetailTimestamp(memory.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            {showConfirmation ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={cancelClear}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmClear}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleClearAll}
                disabled={memories.length === 0}
                className="w-full py-2.5 text-sm font-medium text-red-600 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-red-200"
              >
                Clear All Memories
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

