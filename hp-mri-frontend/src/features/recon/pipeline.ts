import { PeakModifier, PipelineStage, ReconPeak, ReconStageParams } from '../../api/types';
import { isValidPeakName } from './reconstructValidation';

/** One peak row as the form holds it: numbers stay text until submit. */
export interface Parameter {
  id: string;
  name: string;
  value: string;
  isSource: boolean;
  isSmallPeak: boolean;
  isProduct: boolean;
}

export const TUNABLE_KEYS = ['line_broadening', 'fit_df', 'fit_dw', 'fit_dph'] as const;
export type TunableKey = (typeof TUNABLE_KEYS)[number];
export type TunableValues = Record<TunableKey, string>;

export const TUNABLE_SPECS: { key: TunableKey; label: string; help: string }[] = [
  {
    key: 'line_broadening',
    label: 'Line broadening (Hz)',
    help: 'Apodisation applied before the fit, in Hz.',
  },
  { key: 'fit_df', label: 'fit_df', help: 'Frequency step the fitter searches over.' },
  { key: 'fit_dw', label: 'fit_dw', help: 'Linewidth step the fitter searches over.' },
  { key: 'fit_dph', label: 'fit_dph', help: 'Phase step the fitter searches over.' },
];

export const EMPTY_TUNABLES: TunableValues = {
  line_broadening: '',
  fit_df: '',
  fit_dw: '',
  fit_dph: '',
};

export type StageForm =
  | { id: 'shift' }
  | { id: 'recon'; peaks: Parameter[]; tunables: TunableValues };

export type StageId = StageForm['id'];
export type ReconStageForm = Extract<StageForm, { id: 'recon' }>;

/** Order stages are offered in when adding one back. */
export const STAGE_ORDER: StageId[] = ['shift', 'recon'];

export const STAGE_LABELS: Record<StageId, string> = {
  shift: 'Frequency drift correction',
  recon: 'Spectral reconstruction',
};

export const STAGE_DESCRIPTIONS: Record<StageId, string> = {
  shift: 'Re-centres each spectrum on the source peak. Takes no parameters, and a scan that does not drift can skip it.',
  recon: 'Fits the listed peaks and writes a metabolite map per peak.',
};

/** Stage ids come back from the job API as plain strings. */
export function stageLabel(id: string): string {
  const known = STAGE_ORDER.find((stageId) => stageId === id);
  return known ? STAGE_LABELS[known] : id;
}

const REFERENCE_PEAKS: { name: string; value: string; modifiers: PeakModifier[] }[] = [
  { name: 'bic', value: '0.00', modifiers: ['t', 'm'] },
  { name: 'urea', value: '2.30', modifiers: [] },
  { name: 'pyr', value: '9.70', modifiers: ['s'] },
  { name: 'ala', value: '15.20', modifiers: ['t', 'm'] },
  { name: 'hyd', value: '18.10', modifiers: ['t', 'm'] },
  { name: 'lac', value: '21.80', modifiers: ['m'] },
];

let peakSeq = 0;

export function nextPeakId(): string {
  peakSeq += 1;
  return `peak-${peakSeq}`;
}

export function createPeak(): Parameter {
  return {
    id: nextPeakId(),
    name: '',
    value: '',
    isSource: false,
    isSmallPeak: false,
    isProduct: false,
  };
}

export function referencePeaks(): Parameter[] {
  return REFERENCE_PEAKS.map((peak) => ({
    id: nextPeakId(),
    name: peak.name,
    value: peak.value,
    isSource: peak.modifiers.includes('s'),
    isSmallPeak: peak.modifiers.includes('t'),
    isProduct: peak.modifiers.includes('m'),
  }));
}

export function createStage(id: StageId): StageForm {
  if (id === 'shift') return { id: 'shift' };
  return { id: 'recon', peaks: referencePeaks(), tunables: { ...EMPTY_TUNABLES } };
}

export function defaultPipeline(): StageForm[] {
  return [createStage('shift'), createStage('recon')];
}

export function peakModifiers(peak: Parameter): PeakModifier[] {
  const modifiers: PeakModifier[] = [];
  if (peak.isSource) modifiers.push('s');
  if (peak.isSmallPeak) modifiers.push('t');
  if (peak.isProduct) modifiers.push('m');
  return modifiers;
}

function toReconPeak(peak: Parameter): ReconPeak {
  return {
    name: peak.name.trim(),
    ppm: Number(peak.value),
    modifiers: peakModifiers(peak),
  };
}

export function buildPipelineStages(stages: StageForm[]): PipelineStage[] {
  return stages.map((stage) => {
    if (stage.id === 'shift') return { id: 'shift', params: {} };

    const params: ReconStageParams = { peaks: stage.peaks.map(toReconPeak) };
    for (const key of TUNABLE_KEYS) {
      const raw = stage.tunables[key].trim();
      if (raw !== '') params[key] = Number(raw);
    }
    return { id: 'recon', params };
  });
}

/** The first thing wrong with the pipeline, or null when it is ready to post. */
export function validatePipeline(stages: StageForm[]): string | null {
  if (stages.length === 0) return 'Add at least one stage to the pipeline';

  const recon = stages.find((stage): stage is ReconStageForm => stage.id === 'recon');
  if (!recon) return null;

  if (recon.peaks.length === 0) return 'Add at least one peak to the reconstruction stage';

  for (const peak of recon.peaks) {
    const name = peak.name.trim();
    if (name === '') return 'Every peak needs a name';
    if (!isValidPeakName(name)) return `"${name}" is not a valid peak name: use letters and digits only, starting with a letter`;
    if (!Number.isFinite(Number(peak.value)) || peak.value.trim() === '') {
      return `Peak "${name}" needs a numeric frequency offset`;
    }
  }

  const names = recon.peaks.map((peak) => peak.name.trim().toLowerCase());
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  if (duplicate) return `Peak "${duplicate}" is listed twice`;

  for (const { key, label } of TUNABLE_SPECS) {
    const raw = recon.tunables[key].trim();
    if (raw !== '' && !Number.isFinite(Number(raw))) return `${label} must be a number`;
  }

  return null;
}
