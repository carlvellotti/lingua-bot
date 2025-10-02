import { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import {
  interviewQuestionStackAtom,
  interviewPersonaAtom,
  reviewSettingsAtom,
  jdSummaryAtom
} from '../../atoms/prepState.js';
import { formatLabel } from '../../utils/formatters.js';
import { parseCoachingSummary } from '../../utils/interviewHelpers.js';
import AudioVisualizer from './AudioVisualizer.jsx';
import QuestionStack from './QuestionStack.jsx';
import SessionDetails from './SessionDetails.jsx';

// Parse language learning summary markdown
function parseLanguageSummary(text) {
  if (!text) return null;
  
  const sections = {};
  const lines = text.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    // Match section headers like "## Summary" or "## What You Learned"
    if (line.startsWith('##')) {
      // Save previous section if exists
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      // Start new section
      currentSection = line.replace(/^##\s*/, '').trim();
      currentContent = [];
    } else if (currentSection && line.trim()) {
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }
  
  return Object.keys(sections).length > 0 ? sections : null;
}

const personalities = {
  fizz: {
    name: 'Fizz',
    imageUrl: '/character_images/u4945551362_animated_teenage_boy_punk_rock_boy_chilling_in_hi_de85203e-aee0-4d21-883b-5f651909d641_0.png'
  },
  marcus: {
    name: 'Marcus Chen-Williams',
    imageUrl: '/character_images/u4945551362_friendly_30_year_old_handsome_politician_sitting__0ee91f0c-4f68-4d12-9b99-952a488a7217_1.png'
  },
  sofia: {
    name: 'Sofia Rodriguez',
    imageUrl: '/character_images/u4945551362_animated_friendly_cool_20s_something_waitress_wor_1382bd2c-a9ee-4be3-b5a5-a54832a4ce67_1.png'
  },
  jazz: {
    name: 'Jasmine "Jazz" Washington',
    imageUrl: '/character_images/u4945551362_animated_african_american_40s_woman_adventurer_wh_5866a4f5-fa96-4fe2-ae69-c733155abb1b_0.png'
  }
};

export default function InterviewView({
  status,
  error,
  isMicActive,
  remoteAudioRef,
  remoteStream,
  displayMessages,
  summary,
  onReset,
  languagePreferences,
  practiceSession
}) {
  const [displayMode, setDisplayMode] = useState('equalizer'); // equalizer | transcript
  
  const interviewStack = useAtomValue(interviewQuestionStackAtom);
  const interviewPersona = useAtomValue(interviewPersonaAtom);
  const reviewSettings = useAtomValue(reviewSettingsAtom);
  const jdSummary = useAtomValue(jdSummaryAtom);
  
  const coaching = useMemo(() => parseCoachingSummary(summary), [summary]);
  const languageSummary = useMemo(() => languagePreferences ? parseLanguageSummary(summary) : null, [summary, languagePreferences]);
  
  // Get personality info for language practice
  const personality = languagePreferences 
    ? personalities[languagePreferences.personality] || personalities.fizz
    : null;

  return (
    <>
      <header className="workspace-header interview-header mb-6">
        <div className="header-text">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{summary ? 'Practice Session Complete' : 'Practice Session'}</h2>
          <p className="text-base text-gray-600">{summary ? 'Review your progress below' : 'Your conversation is live'}</p>
        </div>
      </header>

      {summary ? (
        // Show summary when practice session is complete
        <>
          <section className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-md mb-6">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-5 py-4 border-b-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 m-0">Learning Insights</h3>
            </div>
            <div className="p-6">
              {languageSummary ? (
                <div className="space-y-6">
                  {Object.entries(languageSummary).map(([title, content], index) => (
                    <div key={index}>
                      <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">{title}</h4>
                      <div className="text-base text-gray-800 leading-relaxed space-y-2">
                        {content.split('\n').map((line, i) => {
                          const trimmed = line.trim();
                          if (!trimmed) return null;
                          
                          // Handle bullet points that start with - or **
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
                            // Regular paragraph
                            return <p key={i} className="mb-2">{trimmed}</p>;
                          }
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : coaching ? (
                <div className="space-y-6">
                  {coaching.summary && (
                    <div>
                      <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-2">Summary</h4>
                      <p className="text-base text-gray-800 leading-relaxed">{coaching.summary}</p>
                    </div>
                  )}
                  {coaching.strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-green-600 uppercase tracking-wide mb-2">What You Did Well</h4>
                      <ul className="space-y-2 pl-0">
                        {coaching.strengths.map((item, index) => (
                          <li key={index} className="text-base text-gray-800 leading-relaxed pl-6 relative before:content-['→'] before:absolute before:left-0 before:text-green-500 before:font-bold">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {coaching.improvements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-2">Areas to Practice</h4>
                      <ul className="space-y-2 pl-0">
                        {coaching.improvements.map((item, index) => (
                          <li key={index} className="text-base text-gray-800 leading-relaxed pl-6 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500 before:font-bold">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <pre className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border-2 border-gray-200">{summary}</pre>
              )}
            </div>
          </section>

          <section className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-md mb-6">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-5 py-4 border-b-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 m-0">Transcript</h3>
            </div>
            {displayMessages.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3 opacity-30">💬</div>
                <div className="text-base">No transcript available</div>
              </div>
            ) : (
              <div className="p-6 max-h-[600px] overflow-y-auto space-y-4">
                {displayMessages.map((entry, index) => {
                  const role = entry.role || 'unknown';
                  const label = role === 'assistant' ? 'Tutor' : role === 'user' ? 'You' : role;
                  const text = entry.text || '';
                  return (
                    <div className="grid grid-cols-[120px_1fr] gap-4 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0" key={index}>
                      <div className="font-semibold text-sm uppercase tracking-wide text-blue-600 pt-1">{label}</div>
                      <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{text || '—'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        // Show live interview UI
        <>
          <section className="live-stage-full mb-6">
            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
              <div className="px-5 py-3 flex items-center justify-between border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                {status === 'in-progress' && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isMicActive ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600 border-2 border-gray-300'}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span className="text-sm font-semibold">{isMicActive ? 'Microphone live' : 'Microphone unavailable'}</span>
                  </div>
                )}
                <div></div>
              </div>

              <div className="flex">
                {/* Character Image - shown for language practice */}
                {personality && (
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 border-r-2 border-gray-200" style={{ width: '280px', minHeight: '400px' }}>
                    <div className="flex flex-col items-center gap-4 p-6">
                      <img 
                        src={personality.imageUrl} 
                        alt={personality.name}
                        className="w-48 h-48 rounded-2xl object-cover border-4 border-white shadow-lg"
                      />
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{personality.name}</h3>
                        <p className="text-sm text-gray-600">Your conversation partner</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio/Transcript Area */}
                {displayMode === 'transcript' ? (
                  <div className={`flex-1 p-6 min-h-[400px] bg-gray-50 ${status === 'in-progress' ? 'border-l-4 border-blue-400' : ''}`}>
                    {displayMessages.length === 0 ? (
                      <div className="text-center text-gray-400 mt-20 text-sm">Transcript will appear here once the conversation starts…</div>
                    ) : (
                      <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {displayMessages
                          .map(m => `${m.role === 'assistant' ? 'Tutor' : 'You'}: ${m.text}`)
                          .join('\n\n')}
                        {status === 'in-progress' ? '▋' : ''}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="relative flex-1 min-h-[400px] bg-gray-900 overflow-hidden">
                    <AudioVisualizer remoteStream={remoteStream} status={status} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {status === 'in-progress' && (
            <div className="flex gap-3 mb-6 justify-center">
              <button
                type="button"
                className="px-6 py-3 rounded-xl bg-white border-2 border-blue-300 text-blue-700 font-semibold text-sm hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm hover:shadow-md"
                onClick={() => setDisplayMode(displayMode === 'equalizer' ? 'transcript' : 'equalizer')}
              >
                Switch to {displayMode === 'equalizer' ? 'Transcript' : 'Visualization'}
              </button>
              <button
                type="button"
                className="px-6 py-3 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                onClick={onReset}
              >
                End Session
              </button>
            </div>
          )}
        </>
      )}

      <div className="live-details-grid">
        <SessionDetails
          difficulty={reviewSettings.difficulty}
          jdSummary={jdSummary}
          languagePreferences={languagePreferences}
          practiceSession={practiceSession}
        />
        <QuestionStack questions={interviewStack} hide={!!languagePreferences} />
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />
    </>
  );
}
