export function isValidValueInput(value: string): boolean {
  return value === '' || /^-?\d*\.?\d*$/.test(value);
}

export function formatValueOnBlur(value: string | number): { value: string; error: string | null } {
  const v = value;
  if (v === '' || v === '-' || v === '.' || v === '-.') {
    return { value: '0.00', error: null };
  }
  const numericValue = parseFloat(v.toString());
  if (isNaN(numericValue)) {
    return { value: '0.00', error: 'Please enter a valid number for frequency offset (e.g., 0.00, -2.50, 3.75)' };
  }
  return { value: numericValue.toFixed(2), error: null };
}

export function isValidWiggleInput(value: string): boolean {
  return value === '' || /^(\d*\.?\d*)$/.test(value);
}

export function formatWiggleOnBlur(value: string | number): { value: string; error: string | null } {
  if (value === '' || value === '.') {
    return { value: '1.0', error: null };
  }
  const numericValue = parseFloat(value.toString());
  if (isNaN(numericValue) || numericValue < 0) {
    return { value: '1.0', error: 'Please enter a valid positive number for wiggle factor (e.g., 1.0)' };
  }
  return { value: numericValue.toFixed(1), error: null };
}
