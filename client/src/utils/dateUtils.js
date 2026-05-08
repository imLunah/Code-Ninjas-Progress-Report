export function today() {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  // pg returns DATE columns as full ISO timestamps — strip the time part to avoid timezone shift
  const datePart = String(dateStr).split('T')[0];
  return new Date(datePart + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
