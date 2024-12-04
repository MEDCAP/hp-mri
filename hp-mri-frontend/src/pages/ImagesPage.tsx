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

interface Image {
  id: number;
  name: string;
  date: string;
  owner: string;
  sequence_id: number;
  sequence: string;
  isSelected: boolean;
}

const ImagesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [images, setImages] = useState<Image[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Image; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });
  const navigate = useNavigate();

  // Fetch data from backend on component mount
  useEffect(() => {
    axios
      .get('http://127.0.0.1:5000/api/images')
      .then((response) => {
        setImages(response.data);
      })
      .catch((error) => {
        console.error('Error fetching Images:', error);
      });
  }, []);

  // Filter the files based on search input
  const filteredFiles = images.filter(
    (file) =>
      file.name.toLowerCase().includes(search.toLowerCase()) ||
      file.date.toLowerCase().includes(search.toLowerCase()) ||
      file.owner.toLowerCase().includes(search.toLowerCase()) ||
      file.sequence.toLowerCase().includes(search.toLowerCase())
  );

  // Sort the filtered files based on sortConfig
  const sortedFiles = filteredFiles.sort((a, b) => {
    const key = sortConfig.key;

    const aValue = key === 'date' ? new Date(a[key]) : a[key];
    const bValue = key === 'date' ? new Date(b[key]) : b[key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column sorting
  const handleSort = (key: keyof Image) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const isAnyFileSelected = images.some((image) => image.isSelected);

  const handleDelete = () => {
    // // API Call for delete, commented so that we don't accidentally delete during dev
    // // TODO: Uncomment, eventually
    // const selectedImageIds = images.filter(image => image.isSelected).map(image => image.id);
    // if (selectedImageIds.length === 0) return;

    // axios
    //   .delete(`http://127.0.0.1:5000/api/images/delete`, { data: { ids: selectedImageIds } })
    //   .then(() => {
    //     setImages(images.filter(image => !image.isSelected));
    //   })
    //   .catch(error => console.error("Error deleting images:", error));
  };

  const handleSelection = (imageId: number) => {
    setImages((prevImages) =>
      prevImages.map((image) =>
        image.id === imageId ? { ...image, isSelected: !image.isSelected } : image
      )
    );
  };

  // Navigate to MRDFileDetails with activeTab and selectedImageId state
  const goToDetails = (file: Image) => {
    navigate(`/file-details/${file.sequence_id}`, {
      state: { activeTab: 'Image', selectedImageId: file.id },
    });
  };

  return (
    <Container maxWidth="lg" sx={{ marginLeft: isSidebarOpen ? '260px' : '80px', transition: 'margin-left 0.3s' }}>
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Typography variant="h4" gutterBottom>
        Images
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
              <TableCell onClick={() => handleSort('sequence')}>
                Sequence{' '}
                {sortConfig.key === 'sequence' &&
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
                <TableCell>{file.sequence}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default ImagesPage;