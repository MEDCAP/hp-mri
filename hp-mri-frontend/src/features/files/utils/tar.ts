/**
 * Minimal USTAR writer.
 *
 * A scan folder reaches the converter as one tar, which is the only archive this
 * app ever writes; a dependency for a format this small is not worth carrying.
 * Entries take a `Blob` as well as an `ArrayBuffer` so a `File` can be handed
 * straight to the `Blob` constructor rather than read into memory first, which
 * matters for a multi-gigabyte scan.
 */

const BLOCK_SIZE = 512;
const NAME_MAX = 100;
const PREFIX_MAX = 155;
/** The size field holds 11 octal digits, so ~8 GiB per member. */
const SIZE_MAX = 8 ** 11 - 1;
const SLASH = 0x2f;
const TYPEFLAG_REGULAR = 0x30;
/**
 * A fixed mtime, so the same folder always tars to the same bytes. Nothing
 * downstream reads it: the converter only unpacks the archive.
 */
const MTIME = 0;

const encoder = new TextEncoder();

export interface TarEntry {
  path: string;
  data: ArrayBuffer | Blob;
}

function writeAscii(block: Uint8Array, offset: number, value: string): void {
  for (let i = 0; i < value.length; i++) {
    block[offset + i] = value.charCodeAt(i);
  }
}

function writeOctal(block: Uint8Array, offset: number, length: number, value: number): void {
  writeAscii(block, offset, value.toString(8).padStart(length - 1, '0'));
}

/**
 * USTAR splits a long path across `prefix` and `name` at a slash. The leftmost
 * split whose tail fits in `name` is the one that keeps `prefix` shortest, so if
 * that one overflows `prefix` no split works.
 */
function splitPath(path: string, encoded: Uint8Array): { name: Uint8Array; prefix: Uint8Array } {
  if (encoded.length <= NAME_MAX) {
    return { name: encoded, prefix: new Uint8Array(0) };
  }
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] !== SLASH) continue;
    const nameLength = encoded.length - i - 1;
    if (nameLength === 0 || nameLength > NAME_MAX) continue;
    if (i > PREFIX_MAX) break;
    return { name: encoded.subarray(i + 1), prefix: encoded.subarray(0, i) };
  }
  throw new Error(`Path is too long for a tar header and cannot be split: ${path}`);
}

function buildHeader(path: string, size: number): Uint8Array {
  const header = new Uint8Array(BLOCK_SIZE);
  const { name, prefix } = splitPath(path, encoder.encode(path));

  header.set(name, 0);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, MTIME);
  header.fill(0x20, 148, 156);
  header[156] = TYPEFLAG_REGULAR;
  writeAscii(header, 257, 'ustar');
  writeAscii(header, 263, '00');
  header.set(prefix, 345);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeAscii(header, 148, checksum.toString(8).padStart(6, '0'));
  header[154] = 0;
  header[155] = 0x20;

  return header;
}

/**
 * Pack entries into a tar archive.
 *
 * Paths are written verbatim, so they must already be relative to the parent of
 * the experiment folder (`ischemia_121_1/sub1/file.MRD`) to match what
 * `tar cf - -C /data ischemia_121_1` produces, which is the layout the converter
 * looks for. Only file members are emitted; entries are sorted by path so the
 * same input always gives the same archive.
 */
export function buildTar(entries: TarEntry[]): Blob {
  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const parts: BlobPart[] = [];

  for (const entry of sorted) {
    const size = entry.data instanceof Blob ? entry.data.size : entry.data.byteLength;
    if (size > SIZE_MAX) {
      throw new Error(`File is too large for a tar header: ${entry.path}`);
    }
    parts.push(buildHeader(entry.path, size));
    parts.push(entry.data);
    const padding = (BLOCK_SIZE - (size % BLOCK_SIZE)) % BLOCK_SIZE;
    if (padding > 0) {
      parts.push(new Uint8Array(padding));
    }
  }

  parts.push(new Uint8Array(BLOCK_SIZE * 2));
  return new Blob(parts, { type: 'application/x-tar' });
}
