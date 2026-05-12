export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
