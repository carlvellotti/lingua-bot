import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { languagePreferencesAtom, appModeAtom, practiceSessionAtom, isStartingSessionAtom, sessionErrorAtom } from '../../atoms/languageState.js';
import { startLanguageSession } from '../../services/api.js';

const languages = [
  {
    id: 'es',
    label: 'Spanish',
    flag: '🇪🇸',
    description: 'Español'
  },
  {
    id: 'en',
    label: 'English',
    flag: '🇺🇸',
    description: 'English'
  },
  {
    id: 'fr',
    label: 'French',
    flag: '🇫🇷',
    description: 'Français'
  },
  {
    id: 'de',
    label: 'German',
    flag: '🇩🇪',
    description: 'Deutsch'
  },
  {
    id: 'it',
    label: 'Italian',
    flag: '🇮🇹',
    description: 'Italiano'
  },
  {
    id: 'pt',
    label: 'Portuguese',
    flag: '🇵🇹',
    description: 'Português'
  },
  {
    id: 'ja',
    label: 'Japanese',
    flag: '🇯🇵',
    description: '日本語'
  },
  {
    id: 'zh',
    label: 'Chinese',
    flag: '🇨🇳',
    description: '中文'
  },
  {
    id: 'ko',
    label: 'Korean',
    flag: '🇰🇷',
    description: '한국어'
  },
  {
    id: 'ru',
    label: 'Russian',
    flag: '🇷🇺',
    description: 'Русский'
  },
  {
    id: 'ar',
    label: 'Arabic',
    flag: '🇸🇦',
    description: 'العربية'
  },
  {
    id: 'hi',
    label: 'Hindi',
    flag: '🇮🇳',
    description: 'हिन्दी'
  },
  {
    id: 'nl',
    label: 'Dutch',
    flag: '🇳🇱',
    description: 'Nederlands'
  }
];

const personalities = [
  {
    id: 'fizz',
    label: 'Teen Punk',
    name: 'Fizz',
    description: 'Chaotic energy, wild stories, punk rock vibes',
    longDescription: 'A 16-year-old punk enthusiast with 47 documented pranks and stories from 12 different cities. Fizz teaches through chaos and makes language learning feel like an adventure.',
    imageUrl: '/character_images/u4945551362_animated_teenage_boy_punk_rock_boy_chilling_in_hi_de85203e-aee0-4d21-883b-5f651909d641_0.png'
  },
  {
    id: 'marcus',
    label: 'Young Politician',
    name: 'Marcus Chen-Williams',
    description: 'Nerdy councilman who makes politics fun',
    longDescription: 'The youngest city councilman ever elected, Marcus combines political buzzwords with sci-fi references and teaches through his campaign disasters.',
    imageUrl: '/character_images/u4945551362_friendly_30_year_old_handsome_politician_sitting__0ee91f0c-4f68-4d12-9b99-952a488a7217_1.png'
  },
  {
    id: 'sofia',
    label: 'Hustler Waitress',
    name: 'Sofia Rodriguez',
    description: 'Ambitious go-getter with three side hustles',
    longDescription: 'First-gen college grad working at a diner while building her empire. Sofia teaches language like a business skill and turns every conversation into a networking opportunity.',
    imageUrl: '/character_images/u4945551362_animated_friendly_cool_20s_something_waitress_wor_1382bd2c-a9ee-4be3-b5a5-a54832a4ce67_1.png'
  },
  {
    id: 'jazz',
    label: 'World Traveler',
    name: 'Jasmine "Jazz" Washington',
    description: 'Wanderer with stories from 37 countries',
    longDescription: 'Professional adventurer who left home at 19 and never stopped moving. Jazz teaches through wisdom collected from around the world and shares stories like campfire tales.',
    imageUrl: '/character_images/u4945551362_animated_african_american_40s_woman_adventurer_wh_5866a4f5-fa96-4fe2-ae69-c733155abb1b_0.png'
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {personalities.map(personality => (
          <div
            key={personality.id}
            onClick={() => handleChange('personality', personality.id)}
            className={`
              rounded-2xl overflow-hidden cursor-pointer transition-all
              ${preferences.personality === personality.id 
                ? 'shadow-lg scale-[1.02]' 
                : 'shadow-sm hover:shadow-md hover:scale-[1.01]'}
            `}
            style={{
              border: preferences.personality === personality.id 
                ? '2px solid #3b82f6' 
                : '2px solid #e5e7eb',
              backgroundColor: '#ffffff'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <img
                  src={personality.imageUrl}
                  alt={personality.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/40"></div>
                {preferences.personality === personality.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              <div className={`p-2 sm:p-3 text-center transition-colors ${preferences.personality === personality.id ? 'bg-blue-50/50' : 'bg-white'}`}>
                <h3 className="font-semibold text-xs sm:text-sm mb-1" style={{ color: '#111827' }}>
                  {personality.name}
                </h3>
                <p className="text-[10px] sm:text-xs leading-snug" style={{ color: '#6b7280' }}>{personality.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOptionCards = (options, category, selectedValue) => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {options.map(option => (
          <div
            key={option.id}
            onClick={() => handleChange(category, option.id)}
            className={`
              rounded-2xl p-3 sm:p-4 cursor-pointer transition-all text-center relative
              ${selectedValue === option.id 
                ? 'shadow-lg scale-[1.02]' 
                : 'shadow-sm hover:shadow-md hover:scale-[1.01]'}
            `}
            style={{
              border: selectedValue === option.id 
                ? '2px solid #3b82f6' 
                : '2px solid #e5e7eb',
              backgroundColor: selectedValue === option.id ? '#eff6ff' : '#ffffff'
            }}
          >
            {selectedValue === option.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl sm:text-3xl">{option.icon}</span>
            </div>
            <h3 className="font-semibold text-xs sm:text-sm text-center mb-1" style={{ color: '#111827' }}>
              {option.label}
            </h3>
            <p className="text-[10px] sm:text-xs leading-snug" style={{ color: '#6b7280' }}>{option.description}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="py-6 px-4 max-w-6xl mx-auto" style={{ color: '#111827' }}>
      <div className="text-center mb-8 hidden sm:block">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#111827' }}>
          Customize Your Practice
        </h1>
        <p className="text-sm sm:text-base" style={{ color: '#6b7280' }}>
          Configure your language practice experience
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8" style={{ color: '#111827' }}>
        <section>
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center" style={{ color: '#111827' }}>
            <span className="text-lg sm:text-xl mr-2">🌍</span>
            Language to Practice
          </h2>
          <select
            value={preferences.language}
            onChange={(e) => handleChange('language', e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 font-medium shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all hover:border-gray-300 text-sm sm:text-base"
          >
            {languages.map(language => (
              <option key={language.id} value={language.id}>
                {language.flag} {language.label} - {language.description}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center" style={{ color: '#111827' }}>
            <span className="text-lg sm:text-xl mr-2">👥</span>
            Choose Your Conversation Partner
          </h2>
          {renderPersonalityCards()}
        </section>

        <section>
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center" style={{ color: '#111827' }}>
            <span className="text-lg sm:text-xl mr-2">⚡</span>
            Speaking Speed
          </h2>
          {renderOptionCards(speeds, 'speed', preferences.speed)}
        </section>

        <section>
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center" style={{ color: '#111827' }}>
            <span className="text-lg sm:text-xl mr-2">📊</span>
            Language Level
          </h2>
          {renderOptionCards(levels, 'level', preferences.level)}
        </section>

        <section>
          <h2 className="text-sm sm:text-base font-semibold mb-3 flex items-center" style={{ color: '#111827' }}>
            <span className="text-lg sm:text-xl mr-2">💬</span>
            Speaking Style
          </h2>
          {renderOptionCards(styles, 'style', preferences.style)}
        </section>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="pt-4 sm:pt-6">
          <button
            type="submit"
            disabled={isStarting}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-semibold text-sm sm:text-base hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
          >
            {isStarting ? 'Starting...' : 'Start Practicing ✨'}
          </button>
        </div>
      </form>
    </div>
  );
}

