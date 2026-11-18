import { MrdArrayResponse, MrdImageData } from '../../api/types';

type ImageArray = Extract<MrdArrayResponse, { kind: 'image' }>;

export interface ConcatenationSource {
  fileName: string;
  array: ImageArray;
}

export interface ConcatenationResult {
  /** [channel][slice][row][col][frequency][measurement] */
  data: MrdImageData;
  labels: string[];
  valueRange: [number, number];
  sourceFiles: string[];
  totalMeasurements: number;
  /** Shape of `data`, as the backend reports shapes. */
  shape: number[];
}

/**
 * Join image arrays along the measurement axis. Every other axis must match
 * the first source's; a mismatch is an error rather than a silent skip.
 */
export function concatenateImages(sources: ConcatenationSource[]): ConcatenationResult {
  if (sources.length === 0) throw new Error('Nothing to concatenate');

  const [first] = sources;
  const baseShape = first.array.shape.slice(0, 5);
  for (const { fileName, array } of sources) {
    const shape = array.shape.slice(0, 5);
    if (shape.length !== 5 || shape.some((size, axis) => size !== baseShape[axis])) {
      throw new Error(
        `${fileName} has shape [${shape.join(', ')}], expected [${baseShape.join(', ')}] before the measurement axis`
      );
    }
  }

  const data: MrdImageData = first.array.data.map((channel, c) =>
    channel.map((slice, s) =>
      slice.map((row, r) =>
        row.map((col, x) =>
          col.map((_frequency, f) =>
            sources.flatMap(({ array }) => array.data[c][s][r][x][f])
          )
        )
      )
    )
  );

  const totalMeasurements = sources.reduce((sum, { array }) => sum + (array.shape[5] ?? 0), 0);
  const labels = Array.from(new Set(sources.flatMap(({ array }) => array.labels)));

  return {
    data,
    labels,
    valueRange: [
      Math.min(...sources.map(({ array }) => array.value_min)),
      Math.max(...sources.map(({ array }) => array.value_max)),
    ],
    sourceFiles: sources.map(({ fileName }) => fileName),
    totalMeasurements,
    shape: [...baseShape, totalMeasurements],
  };
}
