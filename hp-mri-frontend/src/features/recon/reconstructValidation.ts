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

/**
 * The recon CLI splits a `-{name}_{modifier}` token at its first underscore, so
 * an underscore inside the name would be read as the start of the modifier
 * suffix and the peak would be fitted under the wrong flags.
 */
export const PEAK_NAME_HINT =
  'Letters and digits only, starting with a letter. An underscore is not allowed: the recon CLI splits the peak token at its first underscore and would read the rest of the name as modifier flags.';

export function isValidPeakName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]*$/.test(name);
}

export function isValidTunableInput(value: string): boolean {
  return value === '' || /^-?\d*\.?\d*$/.test(value);
}
