import React, { useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Box, 
  Button 
} from '@mui/material';

const ReconstructionToolsPage: React.FC = () => {
    useEffect(() => {
        document.title = "HP-MRI Reconstruction Code";
    }, []);

    const reconstructionTools = [
        {
            name: "Dynamic HP ¹²⁹Xe image processing",
            path: "/dynamic, python",
            description: "Reconstruction and analysis of HXe images acquired continuously on Siemens or MRD scanner",
            inputs: "Siemens .dat file or MR Solutions .mrd file, custom .traj file (n x 3 k-space points)",
            outputs: "nbins x MS x MS x MS dynamic image dataset in .mat format",
            entryPoint: "main.py"
        },
        {
            name: "MRD2+ universal raw data format",
            path: "/mrd-fork, yardl/python",
            description: "Specification of MRD2 universal raw data format with additional datatypes to describe pulses and gradient intensities",
            inputs: "yardl files (/mrd-fork/model)",
            outputs: "compiled python, C and matlab schema descriptions and streaming functions",
            entryPoint: "yardl generate in /mrd-fork/model"
        },
        {
            name: "MRD2+ file converter",
            path: "/mrdconverter/dynamic, /mrdconverter/MRDspectra",
            description: "Code to convert Siemens .dat and MR Solutions .mrd files to MRD2+",
            inputs: "filename(s) to be converted (mrdconverter.py -f <filename>)",
            outputs: "<filename>.mrd2",
            entryPoint: "mrdconverter.py"
        },
        {
            name: "MR Solutions file reader",
            path: "/MRS reader/MRSdata.py",
            description: "Code to read header and raw data information from MR Solutions raw data file",
            inputs: "filename to be read (MRSdata.py -f <filename>)",
            outputs: "class MRSdata",
            entryPoint: "MRSdata.py"
        },
        {
            name: "Magnetic Resonance Spectroscopic Imaging data processing tools",
            path: "/MRSI/CSI_recon_bruker, /MRSI/espirecon",
            description: "Code to read, FFT and display the results of CSI and EPSI on Varian and Bruker systems",
            inputs: "filename(s) to be analyzed (-f <filename>)",
            outputs: "<filename>.mat, GUI interface",
            entryPoint: "EPSIrecon.py, csi_recon_101623.py"
        }
    ];

    return (
        <Container
            maxWidth="lg"
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 4,
                paddingBottom: 4,
            }}
        >
            <Typography
                variant="h4"
                color="primary"
                gutterBottom
                sx={{ fontWeight: 600 }}
            >
                MRI Reconstruction Code
            </Typography>
            <Typography component="p" align="center" sx={{ maxWidth: 800 }}>
                Download comprehensive Python tools for MRI data reconstruction and analysis. 
                These tools support various scanner formats and provide advanced processing capabilities 
                for dynamic imaging, spectroscopic imaging, and raw data format conversion.
            </Typography>

            <Paper elevation={3} sx={{ p: 4, width: "100%", mt: 2 }}>
                <Typography variant="h5" gutterBottom fontWeight={700} sx={{ mb: 3 }}>
                    Available Reconstruction Tools
                </Typography>
                
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: "bold", py: 2, backgroundColor: "#f5f5f5" }}>
                                Tool Name & Path
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold", py: 2, backgroundColor: "#f5f5f5" }}>
                                Description
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold", py: 2, backgroundColor: "#f5f5f5" }}>
                                Inputs
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold", py: 2, backgroundColor: "#f5f5f5" }}>
                                Outputs
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold", py: 2, backgroundColor: "#f5f5f5" }}>
                                Entry Point
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reconstructionTools.map((tool, index) => (
                            <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                                <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {tool.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {tool.path}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2, verticalAlign: 'top', maxWidth: 250 }}>
                                    <Typography variant="body2">
                                        {tool.description}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2, verticalAlign: 'top', maxWidth: 200 }}>
                                    <Typography variant="body2">
                                        {tool.inputs}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2, verticalAlign: 'top', maxWidth: 200 }}>
                                    <Typography variant="body2">
                                        {tool.outputs}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {tool.entryPoint}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Box
                mt={4}
                display="flex"
                justifyContent="center"
                gap={4}
                flexWrap="wrap"
            >
                <Button
                    variant="contained"
                    color="primary"
                    href="/mri_reconstruction_tools.zip"
                    download
                    size="large"
                    sx={{ px: 4, py: 1.5 }}
                >
                    Download MRI Reconstruction Tools zip file
                </Button>
            </Box>

            <Box mt={4} width="100%">
                <Typography variant="h6" gutterBottom fontWeight={600}>
                    System Requirements
                </Typography>
                <Typography component="p">
                    • Python 3.8 or higher<br />
                    • NumPy, SciPy, Matplotlib<br />
                    • Additional dependencies listed in requirements.txt for each tool<br />
                    • MATLAB (optional, for .mat file outputs)
                </Typography>
            </Box>
        </Container>
    );
};

export default ReconstructionToolsPage;
