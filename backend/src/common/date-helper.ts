export function formatDateString(dateVal: any): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  return String(dateVal);
}
