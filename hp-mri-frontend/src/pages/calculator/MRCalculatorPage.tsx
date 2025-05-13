import React, { useEffect, useState } from "react";
import { Box, Typography, Container, TextField, Button, Paper, Collapse, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { calculateResults } from "./utils/calculate";
import CalculatorInfo from "./components/CalculatorInfo";

const MRCalculatorPage: React.FC = () => {
    useEffect(() => {
        document.title = "HP-MRI MR Calculator";
    }, []);

    const [inputs, setInputs] = useState({
        diameterMM: "",
        frequencyMHz: "",
        coaxLengthMM: "",
        qFactor: 60,
        parasiticCap: 9.9,
        coaxCapacitance: 102,
        coaxInductance: 312,
    } as any);

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showOptional, setShowOptional] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInputs({ ...inputs, [name]: value === "" ? "" : parseFloat(value) });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};

        if (inputs.frequencyMHz === "" || isNaN(inputs.frequencyMHz)) {
            newErrors.frequencyMHz = "Please enter a frequency value.";
        } else if (inputs.frequencyMHz < 20 || inputs.frequencyMHz > 100) {
            newErrors.frequencyMHz = "Frequency must be between 20–100 MHz.";
        }

        if (inputs.diameterMM === "" || isNaN(inputs.diameterMM)) {
            newErrors.diameterMM = "Please enter a diameter value.";
        } else if (inputs.diameterMM < 10 || inputs.diameterMM > 30) {
            newErrors.diameterMM = "Diameter must be between 10–30 mm.";
        }

        if (inputs.coaxLengthMM === "" || isNaN(inputs.coaxLengthMM)) {
            newErrors.coaxLengthMM = "Please enter a coax length value.";
        } else if (inputs.coaxLengthMM < 0 || inputs.coaxLengthMM > 200) {
            newErrors.coaxLengthMM = "Coax length must be between 0–200 mm.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            const output = calculateResults(inputs);
            setResults(output);
        }
    };

    return (
        <Container maxWidth="md" sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                MR Coil Component Calculator
            </Typography>

            <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
                <form onSubmit={handleSubmit}>
                    <Box display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Resonance frequency (MHz) [20–100]"
                            name="frequencyMHz"
                            value={inputs.frequencyMHz}
                            onChange={handleChange}
                            error={!!errors.frequencyMHz}
                            helperText={errors.frequencyMHz}
                            fullWidth
                            type="number"
                        />
                        <TextField
                            label="Inductor diameter (mm) [10–30]"
                            name="diameterMM"
                            value={inputs.diameterMM}
                            onChange={handleChange}
                            error={!!errors.diameterMM}
                            helperText={errors.diameterMM}
                            fullWidth
                            type="number"
                        />
                        <TextField
                            label="Coax cable length (mm) [0–200]"
                            name="coaxLengthMM"
                            value={inputs.coaxLengthMM}
                            onChange={handleChange}
                            error={!!errors.coaxLengthMM}
                            helperText={errors.coaxLengthMM}
                            fullWidth
                            type="number"
                        />

                        <Button onClick={() => setShowOptional(!showOptional)} variant="outlined">
                            {showOptional ? "Hide Optional Inputs" : "Show Optional Inputs"}
                        </Button>

                        <Collapse in={showOptional}>
                            <Box display="flex" flexDirection="column" gap={2} mt={2}>
                                <TextField
                                    label="Coaxial cable inductance per meter (nH)"
                                    name="coaxInductance"
                                    value={inputs.coaxInductance}
                                    onChange={handleChange}
                                    fullWidth
                                    type="number"
                                />
                                <TextField
                                    label="Coaxial cable capacitance per meter (pF)"
                                    name="coaxCapacitance"
                                    value={inputs.coaxCapacitance}
                                    onChange={handleChange}
                                    fullWidth
                                    type="number"
                                />
                                <TextField
                                    label="PCB parasitic capacitance (nH)"
                                    name="parasiticCap"
                                    value={inputs.parasiticCap}
                                    onChange={handleChange}
                                    fullWidth
                                    type="number"
                                />
                                <TextField
                                    label="Q factor of coil"
                                    name="qFactor"
                                    value={inputs.qFactor}
                                    onChange={handleChange}
                                    fullWidth
                                    type="number"
                                />
                            </Box>
                        </Collapse>

                        <Button type="submit" variant="contained" color="primary">
                            Calculate tuning and matching capacitance values
                        </Button>
                    </Box>
                </form>

                {results.length > 0 && (
                    <Box mt={4}>
                        <Typography variant="h6" gutterBottom>
                            Coil inductance values
                        </Typography>
                        <ul>
                            {results.map((r) => (
                                <li key={r.n}>n = {r.n} turn(s): {r.L_nH} nH</li>
                            ))}
                        </ul>

                        <Typography variant="h6" sx={{ mt: 4 }}>Capacitors required for your coil:</Typography>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Number of turns</TableCell>
                                    <TableCell>Tuning capacitance (pF)</TableCell>
                                    <TableCell>Matching capacitance (pF)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {results.map((row) => (
                                    <TableRow key={row.n}>
                                        <TableCell>{row.n}</TableCell>
                                        <TableCell>{row.CT_pF}</TableCell>
                                        <TableCell>{row.CM_pF}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>

            <Box mt={4} width="100%">
                <CalculatorInfo />
            </Box>
        </Container>
    );
};

export default MRCalculatorPage;

// import { useEffect } from 'react';
// import React from "react";
// import InputForm from "./components/InputForm";
// import styles from "./MRCalculator.module.css";

// const MRCalculatorPage: React.FC = () => {
//     useEffect(() => {
//         document.title = "HP-MRI MR Calculator"; // Dynamically updates the tab title
//     }, []);

//     return (
//         <div className={styles.container}>
//             <h1 className={styles.title}>MR Coil Component Calculator</h1>
//             <InputForm />
//         </div>
//     );
// };

// export default MRCalculatorPage;
