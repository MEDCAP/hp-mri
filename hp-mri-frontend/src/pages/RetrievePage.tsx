import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import {
  Button,
  Checkbox,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowUpward, ArrowDownward, CloudDownload, Delete, UploadFile, Refresh } from '@mui/icons-material';
import axios from 'axios';

interface MRDFile {
  id: number;
  name: string;
  date: string;
  owner: string;
  reconImagesCount: number;
  isSelected: boolean;
}

const RetrievePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<MRDFile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof MRDFile; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });
  const navigate = useNavigate();

  const fetchFiles = () => {
    axios
      .get('http://127.0.0.1:5000/api/mrd-files')
      .then((response) => setFiles(response.data))
      .catch((error) => console.error('Error fetching MRD files:', error));
  };

  useEffect(() => {
    fetchFiles();
    document.title = "MRD Files - HP"; // Dynamically updates the tab title
  }, []);

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(search.toLowerCase()) ||
      file.date.toLowerCase().includes(search.toLowerCase()) ||
      file.owner.toLowerCase().includes(search.toLowerCase())
  );

  const sortedFiles = filteredFiles.sort((a, b) => {
    const key = sortConfig.key;
    const aValue = key === 'date' ? new Date(a[key]) : a[key];
    const bValue = key === 'date' ? new Date(b[key]) : b[key];
    return aValue < bValue
      ? sortConfig.direction === 'asc'
        ? -1
        : 1
      : sortConfig.direction === 'asc'
        ? 1
        : -1;
  });

  const handleSort = (key: keyof MRDFile) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelection = (fileId: number) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, isSelected: !file.isSelected } : file
      )
    );
  };

  const goToDetails = (file: MRDFile) => {
    navigate(`/file-details/${file.id}`);
  };

  const isAnyFileSelected = files.some((file) => file.isSelected);

  const handleDelete = () => {
    // // API Call for delete, commented so that we don't accidentally delete during dev
    // // TODO: Uncomment, eventually
    // const selectedFileIds = files.filter(file => file.isSelected).map(file => file.id);
    // if (selectedFileIds.length === 0) return;

    // axios
    //   .delete(`http://127.0.0.1:5000/api/mrd-file/`, { data: { ids: selectedFileIds } })
    //   .then(() => {
    //     // Remove the deleted files from the local state
    //     setFiles(files.filter(file => !file.isSelected));
    //   })
    //   .catch(error => console.error("Error deleting files:", error));
  };

  return (
    <div
      style={{
        marginLeft: isSidebarOpen ? '260px' : '80px',
        width: isSidebarOpen ? 'calc(100% - 260px)' : 'calc(100% - 80px)',
        transition: 'margin-left 0.3s, width 0.3s',
      }}
    >
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <Container maxWidth="lg" sx={{ paddingTop: 2 }}>
        <Typography variant="h4" gutterBottom>
          Retrieve MRD Files
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ marginBottom: 2 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>
          <Grid item xs={6} textAlign="right">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <Tooltip title="Upload new file">
                <Link to="/upload" style={{ textDecoration: 'none' }}>
                  <Button variant="outlined" startIcon={<UploadFile />} sx={{ flex: '1 1 24%', marginTop: '-8px' }} >
                    Upload
                  </Button>
                </Link>
              </Tooltip>
              <Tooltip title="Refresh MRD files">
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchFiles}
                  sx={{
                    flex: '1 1 24%',
                    marginTop: '-8px'
                  }}
                >
                  Refresh
                </Button>
              </Tooltip>
              <Tooltip title="Delete selected files">
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Delete />}
                  disabled={!isAnyFileSelected}
                  onClick={handleDelete}
                  sx={{
                    flex: '1 1 24%',
                    marginTop: '-8px'
                  }}
                >
                  Delete
                </Button>
              </Tooltip>
              <Tooltip title="Download selected files">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CloudDownload />}
                  disabled={!isAnyFileSelected}
                  sx={{
                    flex: '1 1 24%',
                    marginTop: '-8px'
                  }}
                >
                  Download
                </Button>
              </Tooltip>
            </div>
          </Grid>
        </Grid>

        <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                {['name', 'date', 'owner', 'reconImagesCount'].map((key) => (
                  <TableCell key={key} onClick={() => handleSort(key as keyof MRDFile)} sx={{ cursor: 'pointer' }}>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}{' '}
                      {sortConfig.key === key && (
                        <IconButton
                          size="small"
                          sx={{
                            padding: 0,
                            marginLeft: 0.5,
                            verticalAlign: 'middle',
                            transform: 'translateY(0px)',
                          }}
                        >
                          {sortConfig.direction === 'asc' ? (
                            <ArrowUpward fontSize="small" />
                          ) : (
                            <ArrowDownward fontSize="small" />
                          )}
                        </IconButton>
                      )}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedFiles.map((file) => (
                <TableRow
                  key={file.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f1f1f1',
                    },
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={file.isSelected}
                      onChange={() => handleSelection(file.id)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      sx={{
                        cursor: 'pointer',
                        color: '#011F5B',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() => goToDetails(file)}
                    >
                      {file.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{file.date}</TableCell>
                  <TableCell>{file.owner}</TableCell>
                  <TableCell>{file.reconImagesCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </div>
  );
};

export default RetrievePage;
