import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { Box, Typography } from '@mui/material';

export const TUTORIAL_KEY = 'mrd-tutorial-complete';

const steps: Step[] = [
  {
    target: 'body',
    content: (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome to MRD Files!
        </Typography>
        <Typography variant="body2">
          Let us walk you through the key features of this page.
        </Typography>
      </Box>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="file-table"]',
    content: (
      <Typography variant="body2">
        This is the <strong>file library</strong>. Public MRD files are listed here, ready for you to explore.
      </Typography>
    ),
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="file-table"]',
    content: (
      <Typography variant="body2">
        <strong>Single-click</strong> any row to select and highlight it. This enables the Delete and Download buttons above.
      </Typography>
    ),
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '[data-tutorial="file-table"]',
    content: (
      <Typography variant="body2">
        <strong>Double-click</strong> any row to instantly open that file in the MR Visualizer.
      </Typography>
    ),
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '[data-tutorial="info-icon"]',
    content: (
      <Typography variant="body2">
        Click the <strong>ⓘ icon</strong> on any row to open a side panel with the full file details — study date, owner, size, and more.
      </Typography>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="search"]',
    content: (
      <Typography variant="body2">
        Use the <strong>search bar</strong> to filter files by name, subject type, or owner.
      </Typography>
    ),
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          You're all set!
        </Typography>
        <Typography variant="body2">
          Create an account to unlock file uploads, downloads, and group collaboration features.
        </Typography>
      </Box>
    ),
    placement: 'center',
    disableBeacon: true,
  },
];

interface MRDTutorialProps {
  run: boolean;
  onFinish: () => void;
}

const MRDTutorial: React.FC<MRDTutorialProps> = ({ run, onFinish }) => {
  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TUTORIAL_KEY, 'true');
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks={false}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#011F5B',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonNext: {
          borderRadius: 6,
          fontWeight: 600,
        },
        buttonBack: {
          color: '#011F5B',
        },
        buttonSkip: {
          color: '#888',
        },
      }}
    />
  );
};

export default MRDTutorial;
