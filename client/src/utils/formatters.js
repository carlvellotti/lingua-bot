const sidebarDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric'
});

const sidebarTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit'
});

const detailTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const headerTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full',
  timeStyle: 'short'
});

export function formatLabel(value, fallback = '') {
  if (!value || typeof value !== 'string') return fallback;
  if (value.length === 0) return fallback;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatSidebarTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${sidebarDateFormatter.format(date)} · ${sidebarTimeFormatter.format(date)}`;
}

export function formatDetailTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return detailTimestampFormatter.format(date);
}

export function formatHeaderTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return headerTimestampFormatter.format(date);
}

export function shortenSummary(text, limit = 110) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit - 1)}…`;
}



