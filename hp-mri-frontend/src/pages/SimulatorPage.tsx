import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import {
  Button,
  Checkbox,
  Container,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import axios from 'axios';

interface Simulator {
  id: number;
  name: string;
  date: string;
  owner: string;
  sequence: string;
  image: string;
  isSelected: boolean;
}

const SimulatorPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Simulator; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });

  useEffect(() => {
    axios
      .get('http://127.0.0.1:5000/api/simulator')
      .then((response) => setSimulators(response.data))
      .catch((error) => console.error('Error fetching Simulator:', error));
  }, []);

  const filteredSimulators = simulators.filter(
    (file) =>
      file.name.toLowerCase().includes(search.toLowerCase()) ||
      file.date.toLowerCase().includes(search.toLowerCase()) ||
      file.owner.toLowerCase().includes(search.toLowerCase())
  );

  const sortedSimulators = filteredSimulators.sort((a, b) => {
    const key = sortConfig.key;
    const aValue = key === 'date' ? new Date(a[key]) : a[key];
    const bValue = key === 'date' ? new Date(b[key]) : b[key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Simulator) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelection = (fileId: number) => {
    setSimulators((prevSimulators) =>
      prevSimulators.map((file) =>
        file.id === fileId ? { ...file, isSelected: !file.isSelected } : file
      )
    );
  };

  const handleDelete = () => {
    // // API Call for delete, commented so that we don't accidentally delete during dev
    // // TODO: Uncomment, eventually
    // const selectedSimulatorIds = simulators.filter(simulator => simulator.isSelected).map(simulator => simulator.id);
    // if (selectedSimulatorIds.length === 0) return;

    // axios
    //   .delete(`http://127.0.0.1:5000/api/simulators/`, { data: { ids: selectedSimulatorIds } })
    //   .then(() => {
    //     // Remove the deleted simulator from the local state
    //     setSimulators(simulators.filter(file => !file.isSelected));
    //   })
    //   .catch(error => console.error("Error deleting simulator:", error));
  };

  const isAnyFileSelected = simulators.some((file) => file.isSelected);

  return (
    <Container maxWidth="lg" sx={{ marginLeft: isSidebarOpen ? '260px' : '80px', transition: 'margin-left 0.3s' }}>
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Typography variant="h4" gutterBottom>
        Simulator
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
                Name{' '}
                {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
              <TableCell onClick={() => handleSort('date')}>
                Date{' '}
                {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
              <TableCell onClick={() => handleSort('owner')}>
                Owner{' '}
                {sortConfig.key === 'owner' && (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
              <TableCell onClick={() => handleSort('sequence')}>
                Sequence{' '}
                {sortConfig.key === 'sequence' &&
                  (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
              <TableCell onClick={() => handleSort('image')}>
                Image{' '}
                {sortConfig.key === 'image' && (sortConfig.direction === 'asc' ? <ArrowUpward /> : <ArrowDownward />)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedSimulators.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <Checkbox
                    checked={file.isSelected}
                    onChange={() => handleSelection(file.id)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>{file.name}</TableCell>
                <TableCell>{file.date}</TableCell>
                <TableCell>{file.owner}</TableCell>
                <TableCell>{file.sequence}</TableCell>
                <TableCell>{file.image}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default SimulatorPage;