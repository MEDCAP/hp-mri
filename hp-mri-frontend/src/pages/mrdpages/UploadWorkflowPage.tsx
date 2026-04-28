import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  Cancel,
  CloudUpload,
  ErrorOutline,
  FolderOpen,
  HourglassEmpty,
  Visibility,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../layouts/HeaderAccount';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileWithPath {
  file: File;
  relativePath: string;
}

interface FileDataset {
  id: string;
  folderName: string;
  rawFile?: FileWithPath;
  reconFiles: FileWithPath[];
  fitFiles: FileWithPath[];
  epsiFiles: FileWithPath[];
  otherFiles: FileWithPath[];
  status: 'pending' | 'error';
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFilesIntoDatasets(filesWithPaths: FileWithPath[]): FileDataset[] {
  const map = new Map<string, FileDataset>();

  for (const fwp of filesWithPaths) {
    if (fwp.file.name.startsWith('.')) continue;

    const parts = fwp.relativePath.split('/');
    const folderName = parts.length > 1 ? parts[0] : fwp.file.name;

    if (!map.has(folderName)) {
      map.set(folderName, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        folderName,
        reconFiles: [],
        fitFiles: [],
        epsiFiles: [],
        otherFiles: [],
        status: 'pending',
      });
    }

    const ds = map.get(folderName)!;
    const name = fwp.file.name.toLowerCase();
    const inEpsiSubdir =
      parts.length >= 3 && parts[1].toLowerCase() === 'epsi';

    if (name === 'raw.mrd2') {
      ds.rawFile = fwp;
    } else if (name.endsWith('_recon.mrd2')) {
      ds.reconFiles.push(fwp);
    } else if (name.endsWith('_fit.mrd2')) {
      ds.fitFiles.push(fwp);
    } else if (name.endsWith('_epsi.npy') || inEpsiSubdir) {
      ds.epsiFiles.push(fwp);
    } else if (!name.endsWith('.ds_store')) {
      ds.otherFiles.push(fwp);
    }
  }

  return Array.from(map.values());
}

async function traverseEntry(
  entry: FileSystemEntry,
  basePath: string
): Promise<FileWithPath[]> {
  const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const file = await new Promise<File>((resolve) =>
      (entry as FileSystemFileEntry).file(resolve)
    );
    return [{ file, relativePath: fullPath }];
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const allFiles: FileWithPath[] = [];
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve) =>
        reader.readEntries(resolve)
      );
      for (const child of batch) {
        const sub = await traverseEntry(child, fullPath);
        allFiles.push(...sub);
      }
    } while (batch.length > 0);
    return allFiles;
  }

  return [];
}

function datasetSummary(ds: FileDataset): string {
  const parts: string[] = [];
  if (ds.rawFile) parts.push('raw.mrd2');
  if (ds.reconFiles.length)
    parts.push(`${ds.reconFiles.length} recon`);
  if (ds.fitFiles.length)
    parts.push(`${ds.fitFiles.length} fit`);
  if (ds.epsiFiles.length)
    parts.push(`${ds.epsiFiles.length} EPSI`);
  if (ds.otherFiles.length)
    parts.push(`${ds.otherFiles.length} other`);
  return parts.join(', ') || 'no recognized files';
}

// ─── Styled Components ────────────────────────────────────────────────────────

const DropZone = styled(Paper, {
  shouldForwardProp: (p) => p !== 'isDragOver',
})<{ isDragOver: boolean }>(({ theme, isDragOver }) => ({
  border: `2px dashed ${
    isDragOver ? theme.palette.primary.main : theme.palette.divider
  }`,
  borderRadius: 12,
  padding: theme.spacing(6, 4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragOver
    ? alpha(theme.palette.primary.main, 0.04)
    : theme.palette.background.paper,
  transition: theme.transitions.create(
    ['border-color', 'background-color', 'transform'],
    { duration: theme.transitions.duration.short }
  ),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
  ...(isDragOver && { transform: 'scale(1.02)', borderWidth: 3 }),
}));

// ─── Main Component ───────────────────────────────────────────────────────────

const STEPS = ['Upload folders/files', 'Reconstruction', 'View'];

const UploadWorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [datasets, setDatasets] = useState<FileDataset[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [reconAlgorithm, setReconAlgorithm] = useState('');
  const [logLines] = useState<string[]>([
    // TODO: replace with live backend log stream
  ]);

  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── File ingestion ──────────────────────────────────────────────────────────

  const addFiles = useCallback((filesWithPaths: FileWithPath[]) => {
    const incoming = parseFilesIntoDatasets(filesWithPaths);
    if (incoming.length === 0) return;
    setDatasets((prev) => {
      // merge: if a folder with the same name already exists, skip it
      const existingNames = new Set(prev.map((d) => d.folderName));
      const novel = incoming.filter((d) => !existingNames.has(d.folderName));
      return [...prev, ...novel];
    });
  }, []);

  const handleFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesWithPaths: FileWithPath[] = Array.from(e.target.files).map(
        (file) => ({
          file,
          relativePath: file.webkitRelativePath || file.name,
        })
      );
      addFiles(filesWithPaths);
      // reset so the same folder can be re-added after removal
      e.target.value = '';
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const items = Array.from(e.dataTransfer.items);
      const allFiles: FileWithPath[] = [];
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          const files = await traverseEntry(entry, '');
          allFiles.push(...files);
        }
      }
      addFiles(allFiles);
    },
    [addFiles]
  );

  const removeDataset = (id: string) =>
    setDatasets((prev) => prev.filter((d) => d.id !== id));

  // ── Step actions ────────────────────────────────────────────────────────────

  const handleReconstruct = () => {
    // TODO: trigger backend reconstruction for each dataset
    setActiveStep(1);
  };

  const handleViewResults = () => {
    setActiveStep(2);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        width: isSidebarOpen ? 'calc(100% - 260px)' : 'calc(100% - 80px)',
        marginLeft: isSidebarOpen ? 260 : 80,
        marginTop: 64,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <Container maxWidth="lg" sx={{ pt: 3, pb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Upload MRD Files
        </Typography>

        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          {/* ── Stepper ── */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* ══════════════════════════════════════════
              STEP 0 – Upload folders / files
          ══════════════════════════════════════════ */}
          {activeStep === 0 && (
            <>
              {/* Drop zone */}
              <DropZone
                isDragOver={isDragOver}
                elevation={isDragOver ? 4 : 1}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => folderInputRef.current?.click()}
              >
                <CloudUpload
                  sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
                />
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  Drop a folder here
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  or click to browse — select a folder containing{' '}
                  <code>raw.mrd2</code>, <code>*_recon.mrd2</code>,{' '}
                  <code>*_fit.mrd2</code>, and EPSI files
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FolderOpen />}
                  onClick={(e) => {
                    e.stopPropagation();
                    folderInputRef.current?.click();
                  }}
                >
                  Browse Folder
                </Button>
              </DropZone>

              {/* Hidden folder input */}
              <input
                ref={folderInputRef}
                type="file"
                style={{ display: 'none' }}
                multiple
                // @ts-ignore — webkitdirectory is non-standard but widely supported
                webkitdirectory=""
                onChange={handleFolderInput}
              />

              {/* Dataset table */}
              {datasets.length > 0 && (
                <TableContainer sx={{ mt: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            Folder name
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            Files detected
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ width: 80 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Status
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: 48 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {datasets.map((ds) => (
                        <TableRow
                          key={ds.id}
                          sx={{
                            backgroundColor:
                              ds.status === 'error'
                                ? alpha('#f44336', 0.08)
                                : 'inherit',
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {ds.folderName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {ds.status === 'error' && ds.error ? (
                              <Typography variant="body2" color="error">
                                {ds.error}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {datasetSummary(ds)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {ds.status === 'error' ? (
                              <Tooltip title="Error">
                                <ErrorOutline color="error" fontSize="small" />
                              </Tooltip>
                            ) : (
                              <Tooltip title="Pending reconstruction">
                                <HourglassEmpty
                                  fontSize="small"
                                  sx={{ color: 'text.disabled' }}
                                />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                onClick={() => removeDataset(ds.id)}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Actions */}
              <Box
                sx={{
                  mt: 3,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Button
                  variant="contained"
                  disabled={datasets.length === 0}
                  onClick={handleReconstruct}
                >
                  Reconstruct
                </Button>
              </Box>
            </>
          )}

          {/* ══════════════════════════════════════════
              STEP 1 – Reconstruction (TODO: backend)
          ══════════════════════════════════════════ */}
          {activeStep === 1 && (
            <>
              {/* Algorithm selector row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Select
                  value={reconAlgorithm}
                  onChange={(e) => setReconAlgorithm(e.target.value)}
                  displayEmpty
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="" disabled>
                    Select reconstruction algorithm…
                  </MenuItem>
                  {/* TODO: populate from backend */}
                  <MenuItem value="epsi">EPSI</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
                <Tooltip title="Add algorithm (coming soon)">
                  <span>
                    <IconButton
                      disabled
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: 1,
                        '&:disabled': { bgcolor: 'action.disabledBackground' },
                      }}
                    >
                      <Add />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              {/* Log area */}
              <Box
                sx={{
                  bgcolor: '#e8e8e8',
                  borderRadius: 1,
                  minHeight: 220,
                  p: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                {logLines.length === 0 ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{ color: '#aaa', userSelect: 'none' }}
                    >
                      LOG
                    </Typography>
                  </Box>
                ) : (
                  logLines.map((line, i) => (
                    <span key={i}>{line}</span>
                  ))
                )}
              </Box>

              {/* TODO notice */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1 }}
              >
                Backend reconstruction not yet connected — this step is a
                placeholder.
              </Typography>

              {/* Actions */}
              <Box
                sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}
              >
                <Button onClick={() => setActiveStep(0)}>Back</Button>
                <Button
                  variant="contained"
                  onClick={handleViewResults}
                >
                  View Results
                </Button>
              </Box>
            </>
          )}

          {/* ══════════════════════════════════════════
              STEP 2 – View
          ══════════════════════════════════════════ */}
          {activeStep === 2 && (
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Visibility sx={{ fontSize: 64, color: 'primary.main' }} />
              <Typography variant="h6">
                Ready to view results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Open the viewer to inspect your reconstructed MRD data.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setActiveStep(1)}>Back</Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/viewer')}
                >
                  Open in Viewer
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </div>
  );
};

export default UploadWorkflowPage;
