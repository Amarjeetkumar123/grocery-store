// Small readers shared by every form check. Each returns the cleaned value
// or null, and records a friendly message in fieldErrors when needed.

const indianMobileNumberPattern = /^[6-9][0-9]{9}$/;

// Accepts "98765 43210", "+91 98765-43210", "09876543210" -> "9876543210".
export function normalizeIndianMobileNumber(input) {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/[\s-]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return indianMobileNumberPattern.test(digits) ? digits : null;
}

// Trims and collapses spaces. Returns '' for missing text, null if too long.
function cleanText(value, maximumLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned.length <= maximumLength ? cleaned : null;
}

// errorKey lets list items report errors as e.g. "packSizes.0.label".
export function readRequiredText(source, fieldName, label, maximumLength, fieldErrors, errorKey = fieldName) {
  const cleaned = cleanText(source[fieldName], maximumLength);
  if (!cleaned) {
    fieldErrors[errorKey] = cleaned === null
      ? `${label} can be at most ${maximumLength} characters.`
      : `Please enter ${label.toLowerCase()}.`;
  }
  return cleaned || null;
}

export function readOptionalText(source, fieldName, label, maximumLength, fieldErrors, errorKey = fieldName) {
  const cleaned = cleanText(source[fieldName], maximumLength);
  if (cleaned === null) fieldErrors[errorKey] = `${label} can be at most ${maximumLength} characters.`;
  return cleaned || null;
}

export function readPositiveInteger(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
