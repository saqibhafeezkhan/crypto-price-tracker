export const formatRelative = (iso, now = Date.now()) => {
  const time = Date.parse(iso || '');
  if (!Number.isFinite(time)) return '—';

  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;

  return `${Math.floor(seconds / (7 * 86400))}w ago`;
};

export const formatClock = (iso) => {
  const time = Date.parse(iso || '');
  if (!Number.isFinite(time)) return '—';

  return `${new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(time)} UTC`;
};

export const formatAbsolute = (iso) => {
  const time = Date.parse(iso || '');
  if (!Number.isFinite(time)) return '';

  return `${new Date(time).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};
