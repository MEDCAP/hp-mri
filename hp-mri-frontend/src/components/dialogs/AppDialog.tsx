import React from 'react';
import { Dialog, Slide, styled } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';

// Shared slide-up transition used by all app dialogs.
export const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Shared rounded dialog shell. `maxWidth` (px) is parameterized via a prop because
// individual dialogs use different widths; everything else matches the previous
// per-file copies exactly.
export const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop) => prop !== 'paperMaxWidth' && prop !== 'paperMaxHeight',
})<{ paperMaxWidth?: number; paperMaxHeight?: string }>(
  ({ theme, paperMaxWidth = 500, paperMaxHeight }) => ({
    '& .MuiDialog-paper': {
      borderRadius: 16,
      boxShadow: theme.shadows[24],
      maxWidth: paperMaxWidth,
      width: '100%',
      margin: 16,
      ...(paperMaxHeight ? { maxHeight: paperMaxHeight } : {}),
    },
  }),
);
