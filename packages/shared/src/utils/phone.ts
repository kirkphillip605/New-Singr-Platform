/**
 * Formats a phone number string to E.164 format.
 * - Strips all non-digit characters (except '+').
 * - Prepends '+1' if the number is 10 digits (US code assumption).
 * - Prepends '+' if the number starts with '1' and is 11 digits.
 * - If already starting with '+', returns it cleaned of other characters.
 * - Defaults to prepending '+1' if it has digits but doesn't start with '+'.
 */
export function formatE164(phone: string): string {
  if (!phone) return '';
  
  // Clean all characters except digits and '+'
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // US 11 digits starting with 1
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  
  // US 10 digits
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // General fallback for digits-only
  if (cleaned.length > 0) {
    return `+1${cleaned}`;
  }
  
  return cleaned;
}
