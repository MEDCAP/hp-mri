import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// import { Link, useNavigate } from 'react-router-dom';
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
import { ArrowUpward, ArrowDownward, CloudDownload, Delete, UploadFile } from '@mui/icons-material';
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
  // const navigate = useNavigate();

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
      file.owner.toLowerCase().includes(search.toLowerCase()) ||
      file.sequence.toLowerCase().includes(search.toLowerCase())
  );

  const sortedSimulators = filteredSimulators.sort((a, b) => {
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

  const goToDetails = (simulator: Simulator) => {
    simulator.isSelected = true;
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
            <Tooltip title="Delete selected simulators">
              <Button
                variant="contained"
                color="error"
                sx={{ marginTop: '-8px' }}
                startIcon={<Delete />}
                disabled={!isAnyFileSelected}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </Tooltip>
          </Grid>
        </Grid>

        <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                {['name', 'date', 'owner', 'sequence', 'image'].map((key) => (
                  <TableCell key={key} onClick={() => handleSort(key as keyof Simulator)} sx={{ cursor: 'pointer' }}>
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
              {sortedSimulators.map((file) => (
                <TableRow
                  key={file.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f1f1f1',
                      cursor: 'pointer',
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
    </div>
  );
};

export default SimulatorPage;
