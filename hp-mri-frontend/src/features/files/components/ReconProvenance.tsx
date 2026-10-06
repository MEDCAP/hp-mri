import React from 'react';
import { Box, Link, Paper, Typography } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { ReconStageRecord, containerImageUrl } from '../../../types/mrd';
import { stageLabel } from '../../recon/pipeline';

const mono = { fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' } as const;

/** A param value as one line: arrays of objects (peaks) one entry per line. */
const formatValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item && typeof item === 'object'
          ? Object.entries(item as Record<string, unknown>).map(([k, v]) => `${k}=${v}`).join(' ')
          : String(item)
      )
      .join('\n');
  }
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

interface ReconProvenanceProps {
  stages: ReconStageRecord[];
  parentFileId?: string;
}

/** How a reconstruction was made: its source, and each stage's image and parameters. */
const ReconProvenance: React.FC<ReconProvenanceProps> = ({ stages, parentFileId }) => (
  <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
      Reconstruction
    </Typography>

    {parentFileId && (
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="textSecondary">Source file ID</Typography>
        <Typography sx={mono}>{parentFileId}</Typography>
      </Box>
    )}

    {stages.map((stage, index) => {
      const imageUrl = stage.image ? containerImageUrl(stage.image) : null;
      const params = Object.entries(stage.params ?? {});
      return (
        <Paper key={`${stage.id}-${index}`} variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {index + 1}. {stageLabel(stage.id)}
          </Typography>

          {stage.image && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="textSecondary">Container image</Typography>
              {imageUrl ? (
                <Link href={imageUrl} target="_blank" rel="noopener noreferrer" sx={{ ...mono, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {stage.image}
                  <OpenInNew sx={{ fontSize: 14 }} />
                </Link>
              ) : (
                <Typography sx={mono}>{stage.image}</Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="textSecondary">Parameters</Typography>
            {params.length === 0 ? (
              <Typography variant="body2" color="textSecondary">None</Typography>
            ) : (
              params.map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', gap: 1 }}>
                  <Typography sx={{ ...mono, fontWeight: 600, flexShrink: 0 }}>{key}</Typography>
                  <Typography sx={{ ...mono, whiteSpace: 'pre-line' }}>{formatValue(value)}</Typography>
                </Box>
              ))
            )}
          </Box>

          {stage.args && stage.args.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="textSecondary">Arguments</Typography>
              <Typography sx={mono}>{stage.args.join(' ')}</Typography>
            </Box>
          )}
        </Paper>
      );
    })}
  </Box>
);

export default ReconProvenance;
