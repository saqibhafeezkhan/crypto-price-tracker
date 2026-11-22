// Missing data is always rendered as "n/a", never as 0.
export const NOT_AVAILABLE = 'n/a';

export const isNumber = (value) => Number.isFinite(value);

export const formatUsd = (value) => {
  if (!isNumber(value)) return NOT_AVAILABLE;

  const absolute = Math.abs(value);
  if (absolute >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (absolute >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absolute >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absolute >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

export const formatPercent = (value, digits = 1) => {
  if (!isNumber(value)) return NOT_AVAILABLE;

  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
};

export const formatRatio = (value, digits = 2) => {
  if (!isNumber(value)) return NOT_AVAILABLE;

  return `${value.toFixed(digits)}×`;
};

// Fees/TVL and Rev/TVL are normally well under 1, so they read better as a
// percentage than as "0.00x".
export const formatShareRatio = (value, digits = 2) => {
  if (!isNumber(value)) return NOT_AVAILABLE;

  return `${(value * 100).toFixed(digits)}%`;
};

export const formatTokenPrice = (value, symbol = '$') => {
  if (!isNumber(value)) return NOT_AVAILABLE;

  const absolute = Math.abs(value);
  if (absolute >= 1)
    return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (absolute >= 0.01) return `${symbol}${value.toFixed(4)}`;
  return `${symbol}${value.toPrecision(3)}`;
};

export const formatCount = (value) =>
  isNumber(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : NOT_AVAILABLE;

export const changeClass = (value) => {
  if (!isNumber(value) || value === 0) return '';
  return value > 0 ? 'is-up' : 'is-down';
};

export const formatAge = (milliseconds) => {
  if (!isNumber(milliseconds)) return NOT_AVAILABLE;

  const minutes = Math.round(milliseconds / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  return `${Math.round(hours / 24)} d ago`;
};

export const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : NOT_AVAILABLE;
};

// Numeric columns sort by value with empty cells last; text columns sort
// alphabetically.
export const sortRows = (rows, { key, direction }) => {
  const factor = direction === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = left[key];
    const rightValue = right[key];
    const leftNumber = isNumber(leftValue);
    const rightNumber = isNumber(rightValue);

    if (leftNumber || rightNumber) {
      if (!leftNumber) return 1;
      if (!rightNumber) return -1;
      return (leftValue - rightValue) * factor;
    }

    return (
      String(leftValue || '').localeCompare(String(rightValue || ''), undefined, {
        numeric: true,
      }) * factor
    );
  });
};

export const nextSort = (current, key) =>
  current.key === key
    ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
    : { key, direction: 'desc' };
