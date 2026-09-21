import { MrdMeta } from './types';

/**
 * Readers for the meta values the viewer endpoints pass through from MRD.
 *
 * Every MRD meta key holds a list, so a scalar such as `fit_loss` arrives as a
 * one-element list; these unwrap that without every caller repeating it.
 */

/** Numbers stored under a meta key, dropping anything that is not numeric. */
export function metaNumbers(meta: MrdMeta | undefined, key: string): number[] {
  return (meta?.[key] ?? [])
    .map(value => (typeof value === 'number' ? value : Number(value)))
    .filter(value => Number.isFinite(value));
}

/** Strings stored under a meta key. */
export function metaStrings(meta: MrdMeta | undefined, key: string): string[] {
  return (meta?.[key] ?? []).map(String);
}

/** The single number stored under a meta key, or null. */
export function metaNumber(meta: MrdMeta | undefined, key: string): number | null {
  const values = metaNumbers(meta, key);
  return values.length > 0 ? values[0] : null;
}

/** The single string stored under a meta key, or null. */
export function metaString(meta: MrdMeta | undefined, key: string): string | null {
  const values = metaStrings(meta, key);
  return values.length > 0 ? values[0] : null;
}
