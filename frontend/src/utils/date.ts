// Utility to format a date string or Date object in IST
export function formatIST(dateInput: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(dateInput);
  // 'Asia/Kolkata' is the IANA timezone for IST
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    ...options,
  });
} 