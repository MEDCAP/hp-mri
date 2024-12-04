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
} from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
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

  // Fetch data from backend on component mount
  useEffect(() => {
    axios
      .get('http://127.0.0.1:5000/api/mrd-files')
      .then((response) => {
        setFiles(response.data);
      })
      .catch((error) => {
        console.error('Error fetching MRD files:', error);
      });
  }, []);

  // Filter the files based on search input
  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(search.toLowerCase()) ||
      file.date.toLowerCase().includes(search.toLowerCase()) ||
      file.owner.toLowerCase().includes(search.toLowerCase())
  );

  // Sort the filtered files based on sortConfig
  const sortedFiles = filteredFiles.sort((a, b) => {
    const key = sortConfig.key;

    // Check if the sorting key is 'date' and parse it as a Date object
    const aValue = key === 'date' ? new Date(a[key]) : a[key];
    const bValue = key === 'date' ? new Date(b[key]) : b[key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column sorting
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

  // Handle navigating to the details page with state
  const goToDetails = (file: MRDFile) => {
    navigate(`/file-details/${file.id}`);
  };

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

  const isAnyFileSelected = files.some((file) => file.isSelected);

  return (
    <Container maxWidth="lg" sx={{ marginLeft: isSidebarOpen ? '260px' : '80px', transition: 'margin-left 0.3s' }}>
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Typography variant="h4" gutterBottom>
        Retrieve MRD Files
      </Typography>
      <Grid container spacing={2} alignItems="center" sx={{ marginBottom: 2 }}>
        <Grid item xs={8}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Grid>
        <Grid item xs={4} textAlign="right">
          <Button
            variant="contained"
            color="primary"
            sx={{ marginRight: 1 }}
            disabled={!isAnyFileSelected}
            onClick={() => alert('Download functionality not implemented')}
          >
            Download
          </Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={!isAnyFileSelected}
            onClick={handleDelete}
          >
            Delete
          </Button>
          <Link to="/upload" style={{ textDecoration: 'none' }}>
            <Button variant="outlined">Upload</Button>
          </Link>
        </Grid>
      </Grid>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell onClick={() => handleSort('name')}>
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
              <TableCell onClick={() => handleSort('date')}>
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
              <TableCell onClick={() => handleSort('owner')}>
                Owner {sortConfig.key === 'owner' && (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
              <TableCell onClick={() => handleSort('reconImagesCount')}>
                Recon Images{' '}
                {sortConfig.key === 'reconImagesCount' &&
                  (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedFiles.map((file) => (
              <TableRow key={file.id}>
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
                    sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'blue' }}
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
  );
};

export default RetrievePage;