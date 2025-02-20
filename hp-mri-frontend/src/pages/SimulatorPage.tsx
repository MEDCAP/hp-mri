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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowUpward, ArrowDownward, Refresh, Add, Delete } from '@mui/icons-material';
import axios from 'axios';

interface Simulator {
  id: number;
  name: string;
  sequence: string;
  image: string;
  isSelected: boolean;
}

const SimulatorPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Simulator; direction: 'asc' | 'desc' }>({
    key: 'sequence',
    direction: 'desc',
  });

  const navigate = useNavigate();

  const fetchSimulators = () => {
    axios
      .get('http://127.0.0.1:5000/api/simulator')
      .then((response) => setSimulators(response.data))
      .catch((error) => console.error('Error fetching simulators:', error));
  };

  useEffect(() => {
    fetchSimulators();
  }, []);

  const filteredSimulators = simulators.filter(
    (sim) =>
      sim.name.toLowerCase().includes(search.toLowerCase()) ||
      sim.sequence.toLowerCase().includes(search.toLowerCase()) ||
      sim.image.toLowerCase().includes(search.toLowerCase())
  );

  const sortedSimulators = filteredSimulators.sort((a, b) => {
    const key = sortConfig.key;
    const aValue = a[key].toString().toLowerCase();
    const bValue = b[key].toString().toLowerCase();
    return aValue < bValue
      ? sortConfig.direction === 'asc'
        ? -1
        : 1
      : sortConfig.direction === 'asc'
        ? 1
        : -1;
  });

  const handleSort = (key: keyof Simulator) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelection = (simId: number) => {
    setSimulators((prevSimulators) =>
      prevSimulators.map((sim) =>
        sim.id === simId ? { ...sim, isSelected: !sim.isSelected } : sim
      )
    );
  };

  const handleDelete = () => {
    // Uncomment and implement the delete functionality when backend is ready
    // const selectedSimIds = simulators.filter(sim => sim.isSelected).map(sim => sim.id);
    // axios.delete('http://127.0.0.1:5000/api/simulator', { data: { ids: selectedSimIds } })
    //   .then(() => setSimulators(simulators.filter(sim => !sim.isSelected)))
    //   .catch(error => console.error('Error deleting simulators:', error));
  };

  const isAnySimSelected = simulators.some((sim) => sim.isSelected);

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
          Simulator
        </Typography>

        <Grid container spacing={2} alignItems="center" sx={{ marginBottom: 2 }}>
          {/* Search Field */}
          <Grid item xs={8}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search Simulators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>

          {/* Buttons */}
          <Grid item xs={4} textAlign="right">
            <Tooltip title="Create new simulator">
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/new-simulator')}
                sx={{
                  marginLeft: 1,
                  marginTop: '-8px',
                }}
              >
                Create
              </Button>
            </Tooltip>
            <Tooltip title="Refresh simulators">
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchSimulators}
                sx={{
                  marginLeft: 1,
                  marginTop: '-8px',
                }}
              >
                Refresh
              </Button>
            </Tooltip>
            <Tooltip title="Delete selected simulators">
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                disabled={!isAnySimSelected}
                onClick={handleDelete}
                sx={{
                  marginLeft: 1,
                  marginTop: '-8px',
                }}
              >
                Delete
              </Button>
            </Tooltip>
          </Grid>
        </Grid>

        {/* Table */}
        <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                {['name', 'sequence', 'image'].map((key) => (
                  <TableCell key={key} onClick={() => handleSort(key as keyof Simulator)} sx={{ cursor: 'pointer' }}>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}{' '}
                      {sortConfig.key === key && (
                        <IconButton
                          size="small"
                          sx={{ padding: 0, marginLeft: 0.5 }}
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
              {sortedSimulators.map((sim) => (
                <TableRow
                  key={sim.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f1f1f1',
                      cursor: 'pointer',
                    },
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={sim.isSelected}
                      onChange={() => handleSelection(sim.id)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>{sim.name}</TableCell>
                  <TableCell>{sim.sequence}</TableCell>
                  <TableCell>{sim.image}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </div>
  );
};

export default SimulatorPage;
