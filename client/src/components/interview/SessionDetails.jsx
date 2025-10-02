import { formatLabel } from '../../utils/formatters.js';

const languageNames = {
  es: 'Spanish 🇪🇸',
  en: 'English 🇺🇸',
  fr: 'French 🇫🇷',
  de: 'German 🇩🇪',
  it: 'Italian 🇮🇹',
  pt: 'Portuguese 🇵🇹',
  ja: 'Japanese 🇯🇵',
  zh: 'Chinese 🇨🇳',
  ko: 'Korean 🇰🇷',
  ru: 'Russian 🇷🇺',
  ar: 'Arabic 🇸🇦',
  hi: 'Hindi 🇮🇳',
  nl: 'Dutch 🇳🇱'
};

export default function SessionDetails({ difficulty, jdSummary, languagePreferences, practiceSession }) {
  // If language preferences exist, show language practice details
  if (languagePreferences) {
    return (
      <section className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-5 py-4 border-b-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 m-0">Practice Settings</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Language</span>
            <strong className="text-base font-semibold text-gray-900">{languageNames[languagePreferences.language] || 'Spanish'}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Level</span>
            <strong className="text-base font-semibold text-gray-900">{formatLabel(languagePreferences.level || 'intermediate')}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Speed</span>
            <strong className="text-base font-semibold text-gray-900">{formatLabel(languagePreferences.speed || 'normal')}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Style</span>
            <strong className="text-base font-semibold text-gray-900">{formatLabel(languagePreferences.style || 'casual')}</strong>
          </div>
        </div>
      </section>
    );
  }
  
  // Otherwise show interview details
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>Session Details</h3>
        </div>
      </div>
      <div className="card-body session-details-list">
        <div className="session-detail-item">
          <span className="label">Difficulty</span>
          <strong>{formatLabel(difficulty)}</strong>
        </div>
        <div className="session-detail-item">
          <span className="label">JD summary</span>
          <strong>{jdSummary ? 'Included' : 'Not provided'}</strong>
        </div>
      </div>
    </section>
  );
}
