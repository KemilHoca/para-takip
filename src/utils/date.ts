export const formatDate = (
  dateObj: Date | string | number | null | undefined
): string => {
  if (!dateObj) return '';

  const d = new Date(dateObj);

  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}.${d.getFullYear()}`;
};

export const formatTime = (
  dateObj: Date | string | number | null | undefined
): string => {
  if (!dateObj) return '';

  const d = new Date(dateObj);

  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};