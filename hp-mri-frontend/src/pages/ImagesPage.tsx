import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ArrowUpward, ArrowDownward, CloudDownload, Delete, Refresh } from '@mui/icons-material';
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

  const fetchImages = () => {
    axios
      .get('http://127.0.0.1:5000/api/images')
      .then((response) => setImages(response.data))
      .catch((error) => console.error('Error fetching images:', error));
  };

  useEffect(() => {
    fetchImages();
    document.title = "Images - HP-MRI";
  }, []);

  const filteredImages = images.filter(
    (image) =>
      image.name.toLowerCase().includes(search.toLowerCase()) ||
      image.date.toLowerCase().includes(search.toLowerCase()) ||
      image.owner.toLowerCase().includes(search.toLowerCase()) ||
      image.sequence.toLowerCase().includes(search.toLowerCase())
  );

  const sortedImages = filteredImages.sort((a, b) => {
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

  const handleSort = (key: keyof Image) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelection = (imageId: number) => {
    setImages((prevImages) =>
      prevImages.map((image) =>
        image.id === imageId ? { ...image, isSelected: !image.isSelected } : image
      )
    );
  };

  const goToDetails = (image: Image) => {
    navigate(`/file-details/${image.sequence_id}`, {
      state: { activeTab: 'Image', selectedImageId: image.id },
    });
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
            <Tooltip title="Refresh images">
              <Button
                variant="contained"
                color="error"
                sx={{
                  marginRight: 1,
                  marginTop: '-8px',
                }}
                startIcon={<Refresh />}
                onClick={fetchImages}
              >
                Refresh
              </Button>
            </Tooltip>
            <Tooltip title="Delete selected images">
              <Button
                variant="contained"
                color="error"
                sx={{
                  marginRight: 1,
                  marginTop: '-8px',
                }}
                startIcon={<Delete />}
                disabled={!isAnyFileSelected}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </Tooltip>
            <Tooltip title="Download selected images">
              <Button
                variant="contained"
                color="primary"
                sx={{ marginTop: '-8px' }}
                startIcon={<CloudDownload />}
                disabled={!isAnyFileSelected}
              >
                Download
              </Button>
            </Tooltip>
          </Grid>
        </Grid>

        <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                {['name', 'date', 'owner', 'sequence'].map((key) => (
                  <TableCell key={key} onClick={() => handleSort(key as keyof Image)} sx={{ cursor: 'pointer' }}>
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
              {sortedImages.map((image) => (
                <TableRow
                  key={image.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f1f1f1',
                    },
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={image.isSelected}
                      onChange={() => handleSelection(image.id)}
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
                      onClick={() => goToDetails(image)}
                    >
                      {image.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{image.date}</TableCell>
                  <TableCell>{image.owner}</TableCell>
                  <TableCell>{image.sequence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </div>
  );
};

export default ImagesPage;