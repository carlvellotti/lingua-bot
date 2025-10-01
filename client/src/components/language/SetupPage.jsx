import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { languagePreferencesAtom, appModeAtom, practiceSessionAtom, isStartingSessionAtom, sessionErrorAtom } from '../../atoms/languageState.js';
import { startLanguageSession } from '../../services/api.js';

const personalities = [
  {
    id: 'friendly',
    label: 'Friendly',
    name: 'Sofia Chen',
    description: 'Warm, approachable, and patient',
    longDescription: 'A supportive language tutor who creates a comfortable environment for learning. Sofia has taught languages in community centers for over 5 years and believes in building confidence through positive reinforcement.',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'professional',
    label: 'Professional',
    name: 'Dr. Marcus Wells',
    description: 'Formal, concise, and business-oriented',
    longDescription: 'A former diplomat and current business language consultant. Dr. Wells specializes in helping professionals master formal language for international business contexts and high-stakes negotiations.',
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'humorous',
    label: 'Humorous',
    name: 'Jamie Rivera',
    description: 'Fun, witty, and uses jokes',
    longDescription: 'A stand-up comedian who teaches language through humor. Jamie believes that laughing while learning helps with retention and makes the process enjoyable. Expect puns, jokes, and cultural references in every conversation.',
    imageUrl: 'https://images.unsplash.com/photo-1542103749-8ef59b94f47e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'academic',
    label: 'Academic',
    name: 'Professor Eliza Thompson',
    description: 'Intellectual, detailed, and educational',
    longDescription: 'A linguistics professor with a passion for language structure and etymology. Prof. Thompson will challenge you with precise vocabulary and help you understand the deeper patterns and rules of language.',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
  }
];

const speeds = [
  {
    id: 'slow',
    label: 'Slow',
    description: 'Perfect for beginners',
    icon: '🐢'
  },
  {
    id: 'normal',
    label: 'Normal',
    description: 'Everyday conversation pace',
    icon: '🐇'
  },
  {
    id: 'fast',
    label: 'Fast',
    description: 'Challenge yourself',
    icon: '✈️'
  }
];

const levels = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Basic vocabulary and simple sentences',
    icon: '🌱'
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'More complex structures and varied vocabulary',
    icon: '🌿'
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Sophisticated language and nuanced expressions',
    icon: '🌳'
  },
  {
    id: 'fluent',
    label: 'Fluent',
    description: 'Native-like conversation with idioms',
    icon: '🌺'
  }
];

const styles = [
  {
    id: 'formal',
    label: 'Formal',
    description: 'Polite, proper language for professional settings',
    icon: '👔'
  },
  {
    id: 'casual',
    label: 'Casual',
    description: 'Relaxed, everyday speech',
    icon: '👕'
  },
  {
    id: 'slang',
    label: 'Slangy',
    description: 'Colloquial expressions and current slang',
    icon: '🧢'
  }
];

export default function SetupPage() {
  const [preferences, setPreferences] = useAtom(languagePreferencesAtom);
  const setAppMode = useSetAtom(appModeAtom);
  const setPracticeSession = useSetAtom(practiceSessionAtom);
  const [isStarting, setIsStarting] = useAtom(isStartingSessionAtom);
  const [error, setError] = useAtom(sessionErrorAtom);

  const handleChange = (category, value) => {
    setPreferences({
      ...preferences,
      [category]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setIsStarting(true);

    try {
      const session = await startLanguageSession(preferences);
      setPracticeSession(session);
      setAppMode('practice');
    } catch (err) {
      console.error('Failed to start language session:', err);
      setError(err?.message || 'Unable to start practice session.');
    } finally {
      setIsStarting(false);
    }
  };

  const renderPersonalityCards = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {personalities.map(personality => (
          <div
            key={personality.id}
            onClick={() => handleChange('personality', personality.id)}
            className={`
              border rounded-xl overflow-hidden cursor-pointer transition-all card-hover-effect
              ${preferences.personality === personality.id 
                ? 'border-blue-300 ring-1 ring-blue-100 shadow-sm' 
                : 'border-gray-300 bg-white hover:border-blue-200 hover:bg-blue-50/30'}
            `}
          >
            <div className="flex flex-col">
              <div className="relative h-64">
                <img
                  src={personality.imageUrl}
                  alt={personality.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-blue-50/20"></div>
                {preferences.personality === personality.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm text-gray-900">
                    {personality.name}
                  </h3>
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {personality.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-3">
                  {personality.longDescription}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOptionCards = (options, category, selectedValue) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {options.map(option => (
          <div
            key={option.id}
            onClick={() => handleChange(category, option.id)}
            className={`
              border rounded-lg p-3 cursor-pointer transition-all card-hover-effect
              ${selectedValue === option.id 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-300 bg-white shadow-sm hover:border-blue-200 hover:bg-blue-50/30'}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-sm text-gray-900">
                {option.label}
              </h3>
              <span className="text-lg">{option.icon}</span>
            </div>
            <p className="text-xs text-gray-600">{option.description}</p>
            {selectedValue === option.id && (
              <div className="mt-1 w-full flex justify-end">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-[8px]">✓</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-600 sm:text-3xl mb-1">
          Customize Your Practice
        </h1>
        <p className="mt-1 text-base text-gray-600">
          Configure your language practice experience
        </p>
        <div className="flex justify-center mt-2">
          <div className="w-20 h-1 bg-gradient-to-r from-blue-300 to-sky-300 rounded-full"></div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-blue-500 mr-2">✿</span>
            Choose Your Conversation Partner
          </h2>
          {renderPersonalityCards()}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-blue-500 mr-2">✿</span>
            Speaking Speed
          </h2>
          {renderOptionCards(speeds, 'speed', preferences.speed)}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-blue-500 mr-2">✿</span>
            Language Level
          </h2>
          {renderOptionCards(levels, 'level', preferences.level)}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-blue-500 mr-2">✿</span>
            Speaking Style
          </h2>
          {renderOptionCards(styles, 'style', preferences.style)}
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isStarting}
            className="w-full bg-gradient-to-r from-blue-400 to-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-500 hover:to-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarting ? 'Starting...' : 'Start Practicing ✨'}
          </button>
        </div>
      </form>
    </div>
  );
}

