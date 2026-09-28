import React, { useState } from 'react';
import { Typography, TextField, Button, Tabs, Tab } from '@mui/material';

interface ExportSectionProps {
  gifStart: number;
  setGifStart: (v: number) => void;
  gifEnd: number;
  setGifEnd: (v: number) => void;
  gifFps: number;
  setGifFps: (v: number) => void;
  gifFilename: string;
  setGifFilename: (v: string) => void;
  onExportGif: () => void;
  filename: string;
  setFilename: (v: string) => void;
  onSaveScreenshot: () => void;
}

const ExportSection: React.FC<ExportSectionProps> = ({
  gifStart,
  setGifStart,
  gifEnd,
  setGifEnd,
  gifFps,
  setGifFps,
  gifFilename,
  setGifFilename,
  onExportGif,
  filename,
  setFilename,
  onSaveScreenshot,
}) => {
  const [screenshotTab, setScreenshotTab] = useState(0);

  return (
    <>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Export Options
      </Typography>

      <Tabs
        value={screenshotTab}
        onChange={(_, newValue) => setScreenshotTab(newValue)}
        textColor="inherit"
        TabIndicatorProps={{ style: { backgroundColor: 'white' } }}
        sx={{ mb: 2 }}
      >
        <Tab label="Image" sx={{ color: 'white', fontWeight: 'bold' }} />
        <Tab label="GIF" sx={{ color: 'white', fontWeight: 'bold' }} />
      </Tabs>

      {screenshotTab === 0 && (
        <>
          <Typography
            align="left"
            sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
          >
            File Name
          </Typography>
          <TextField
            fullWidth
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: 1,
              input: {
                color: 'black',
                fontWeight: 'bold',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'white',
                },
              },
            }}
          />
          <Button
            fullWidth
            variant="contained"
            onClick={onSaveScreenshot}
            sx={{
              mt: 2,
              backgroundColor: '#000c3f',
              color: 'white',
              fontWeight: 'bold',
              '&.Mui-disabled': {
                backgroundColor: '#000c3f',
                color: 'white',
                opacity: 0.6,
              },
            }}
          >
            Save Screenshot
          </Button>
        </>
      )}

      {screenshotTab === 1 && (
        <>
          <Typography
            align="left"
            sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
          >
            GIF Filename
          </Typography>
          <TextField
            fullWidth
            value={gifFilename}
            onChange={(e) => setGifFilename(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: 1,
              input: {
                color: 'black',
                fontWeight: 'bold',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'white',
                },
              },
            }}
          />
          <Typography
            align="left"
            sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
          >
            Start Dataset
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={gifStart}
            onChange={(e) => setGifStart(Number(e.target.value))}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: 1,
              input: {
                color: 'black',
                fontWeight: 'bold',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'white',
                },
              },
            }}
          />
          <Typography
            align="left"
            sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
          >
            End Dataset
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={gifEnd}
            onChange={(e) => setGifEnd(Number(e.target.value))}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: 1,
              input: {
                color: 'black',
                fontWeight: 'bold',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'white',
                },
              },
            }}
          />
          <Typography
            align="left"
            sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
          >
            Frame Rate (FPS)
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={gifFps}
            onChange={(e) => setGifFps(Number(e.target.value))}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: 'white',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: 1,
              input: {
                color: 'black',
                fontWeight: 'bold',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'white',
                },
              },
            }}
          />
          <Button
            fullWidth
            variant="contained"
            onClick={onExportGif}
            sx={{
              mt: 2,
              backgroundColor: '#000c3f',
              color: 'white',
              fontWeight: 'bold',
              '&.Mui-disabled': {
                backgroundColor: '#000c3f',
                color: 'white',
                opacity: 0.6,
              },
            }}
          >
            Export GIF
          </Button>
        </>
      )}
    </>
  );
};

export default ExportSection;
