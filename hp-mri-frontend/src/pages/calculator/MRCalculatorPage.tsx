import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Container,
    TextField,
    Button,
    Paper,
    Collapse,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
} from "@mui/material";
import { calculateResults } from "./utils/calculate";
import CalculatorInfo from "./components/CalculatorInfo";
import MRCalcImage from "../../images/mr_calc_image.png";

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
        nucleusGamma: 10.705,
        fieldStrength: "",
    } as any);

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showOptional, setShowOptional] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInputs((prev: any) => ({
            ...prev,
            [name]: value === "" ? "" : parseFloat(value),
        }));
    };

    const handleNucleusChange = (e: SelectChangeEvent<number>) => {
        const gammaValue = e.target.value as number;
        setInputs((prev: any) => ({
            ...prev,
            nucleusGamma: gammaValue,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};

        // Validate only the "frequencyMHz", "diameterMM", and "coaxLengthMM" as before
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

    let computedFreqMHz: number | null = null;
    if (
        inputs.nucleusGamma !== "" &&
        !isNaN(inputs.nucleusGamma) &&
        inputs.fieldStrength !== "" &&
        !isNaN(inputs.fieldStrength)
    ) {
        computedFreqMHz = (inputs.nucleusGamma as number) * (inputs.fieldStrength as number);
    }

    return (
        <Container
            maxWidth="md"
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Typography
                variant="h4"
                color="primary"
                gutterBottom
                sx={{ fontWeight: 600 }}
            >
                MR Coil Component Calculator
            </Typography>

            <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
                <form onSubmit={handleSubmit}>
                    <Box display="flex" flexDirection="column" gap={2}>

                        {/* Existing “Resonance frequency (MHz)” field */}
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
                        <FormControl fullWidth>
                            <InputLabel id="nucleus-select-label">Nucleus</InputLabel>
                            <Select
                                labelId="nucleus-select-label"
                                label="Nucleus"
                                value={inputs.nucleusGamma}
                                onChange={handleNucleusChange}
                                sx={{ textAlign: "left" }}
                            >
                                {/* Each MenuItem’s value is the γ/2π [MHz·T⁻¹] */}
                                <MenuItem value={42.576}>¹H (42.576 MHz/T)</MenuItem>
                                <MenuItem value={6.53593}>²D (6.53593 MHz/T)</MenuItem>
                                <MenuItem value={-32.434}>³He (-32.434 MHz/T)</MenuItem>
                                <MenuItem value={10.705}>¹³C (10.705 MHz/T)</MenuItem>
                                <MenuItem value={3.0766}>¹⁴N (3.0766 MHz/T)</MenuItem>
                                <MenuItem value={-4.3156}>¹⁵N (-4.3156 MHz/T)</MenuItem>
                                <MenuItem value={-5.7716}>¹⁷O (-5.7716 MHz/T)</MenuItem>
                                <MenuItem value={40.0593}>¹⁹F (40.0593 MHz/T)</MenuItem>
                                <MenuItem value={17.235}>³¹P (17.235 MHz/T)</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Field strength (T)"
                            name="fieldStrength"
                            value={inputs.fieldStrength}
                            onChange={handleChange}
                            placeholder="Enter Tesla"
                            fullWidth
                            type="number"
                            InputProps={{ inputProps: { step: "0.01", min: "0" } }}
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

                        <Button
                            onClick={() => setShowOptional(!showOptional)}
                            variant="outlined"
                        >
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
                        {computedFreqMHz !== null && (
                            <Typography variant="subtitle1" color="secondary" gutterBottom>
                                Computed resonance: {" "}
                                <strong>{computedFreqMHz.toFixed(2)} MHz</strong>
                            </Typography>
                        )}

                        <Typography variant="h6" sx={{ mt: 0 }}>
                            Capacitors required for your coil:
                        </Typography>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        Number of turns
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        Tuning capacitance (pF)
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        Matching capacitance (pF)
                                    </TableCell>
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

                        <Typography variant="h6" sx={{ mt: 4 }}>
                            Coil inductance values
                        </Typography>
                        <Box>
                            {results.map((r) => (
                                <Typography key={r.n}>
                                    n = {r.n} turn(s): {r.L_nH} nH
                                </Typography>
                            ))}
                        </Box>
                    </Box>
                )}
            </Paper>

            <Box
                mt={4}
                display="flex"
                justifyContent="center"
                gap={4}
                flexWrap="wrap"
            >
                <Button
                    variant="outlined"
                    color="primary"
                    href="/coil_inductor_3dmodels.zip"
                    download
                >
                    Download Coil Inductor 3D models
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    href="/PCB_gerber_files.zip"
                    download
                >
                    Download PCB Gerber Files
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    href="/PCB_gerber_files.zip"
                    download
                >
                    Download Mouse Bed Files
                </Button>
            </Box>

            <Box
                component="img"
                src={MRCalcImage}
                alt="MR Coil Illustration"
                sx={{
                    width: "100%", // makes it responsive
                    maxWidth: "800px",
                    height: "auto",
                    mt: 3,
                    borderRadius: 2,
                    boxShadow: 3,
                }}
            />

            <Box mt={4} width="100%">
                <CalculatorInfo />
            </Box>
        </Container>
    );
};

export default MRCalculatorPage;


// import React, { useEffect, useState } from "react";
// import { Box, Typography, Container, TextField, Button, Paper, Collapse, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
// import { calculateResults } from "./utils/calculate";
// import CalculatorInfo from "./components/CalculatorInfo";
// import MRCalcImage from "../../images/mr_calc_image.png";

// const MRCalculatorPage: React.FC = () => {
//     useEffect(() => {
//         document.title = "HP-MRI MR Calculator";
//     }, []);

//     const [inputs, setInputs] = useState({
//         diameterMM: "",
//         frequencyMHz: "",
//         coaxLengthMM: "",
//         qFactor: 60,
//         parasiticCap: 9.9,
//         coaxCapacitance: 102,
//         coaxInductance: 312,
//     } as any);

//     const [errors, setErrors] = useState<{ [key: string]: string }>({});
//     const [showOptional, setShowOptional] = useState(false);
//     const [results, setResults] = useState<any[]>([]);

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const { name, value } = e.target;
//         setInputs({ ...inputs, [name]: value === "" ? "" : parseFloat(value) });
//     };

//     const handleSubmit = (e: React.FormEvent) => {
//         e.preventDefault();
//         const newErrors: { [key: string]: string } = {};

//         if (inputs.frequencyMHz === "" || isNaN(inputs.frequencyMHz)) {
//             newErrors.frequencyMHz = "Please enter a frequency value.";
//         } else if (inputs.frequencyMHz < 20 || inputs.frequencyMHz > 100) {
//             newErrors.frequencyMHz = "Frequency must be between 20–100 MHz.";
//         }

//         if (inputs.diameterMM === "" || isNaN(inputs.diameterMM)) {
//             newErrors.diameterMM = "Please enter a diameter value.";
//         } else if (inputs.diameterMM < 10 || inputs.diameterMM > 30) {
//             newErrors.diameterMM = "Diameter must be between 10–30 mm.";
//         }

//         if (inputs.coaxLengthMM === "" || isNaN(inputs.coaxLengthMM)) {
//             newErrors.coaxLengthMM = "Please enter a coax length value.";
//         } else if (inputs.coaxLengthMM < 0 || inputs.coaxLengthMM > 200) {
//             newErrors.coaxLengthMM = "Coax length must be between 0–200 mm.";
//         }

//         setErrors(newErrors);

//         if (Object.keys(newErrors).length === 0) {
//             const output = calculateResults(inputs);
//             setResults(output);
//         }
//     };

//     return (
//         <Container maxWidth="md" sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
//             <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
//                 MR Coil Component Calculator
//             </Typography>

//             <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
//                 <form onSubmit={handleSubmit}>
//                     <Box display="flex" flexDirection="column" gap={2}>
//                         <TextField
//                             label="Resonance frequency (MHz) [20–100]"
//                             name="frequencyMHz"
//                             value={inputs.frequencyMHz}
//                             onChange={handleChange}
//                             error={!!errors.frequencyMHz}
//                             helperText={errors.frequencyMHz}
//                             fullWidth
//                             type="number"
//                         />
//                         <TextField
//                             label="Inductor diameter (mm) [10–30]"
//                             name="diameterMM"
//                             value={inputs.diameterMM}
//                             onChange={handleChange}
//                             error={!!errors.diameterMM}
//                             helperText={errors.diameterMM}
//                             fullWidth
//                             type="number"
//                         />
//                         <TextField
//                             label="Coax cable length (mm) [0–200]"
//                             name="coaxLengthMM"
//                             value={inputs.coaxLengthMM}
//                             onChange={handleChange}
//                             error={!!errors.coaxLengthMM}
//                             helperText={errors.coaxLengthMM}
//                             fullWidth
//                             type="number"
//                         />

//                         <Button onClick={() => setShowOptional(!showOptional)} variant="outlined">
//                             {showOptional ? "Hide Optional Inputs" : "Show Optional Inputs"}
//                         </Button>

//                         <Collapse in={showOptional}>
//                             <Box display="flex" flexDirection="column" gap={2} mt={2}>
//                                 <TextField
//                                     label="Coaxial cable inductance per meter (nH)"
//                                     name="coaxInductance"
//                                     value={inputs.coaxInductance}
//                                     onChange={handleChange}
//                                     fullWidth
//                                     type="number"
//                                 />
//                                 <TextField
//                                     label="Coaxial cable capacitance per meter (pF)"
//                                     name="coaxCapacitance"
//                                     value={inputs.coaxCapacitance}
//                                     onChange={handleChange}
//                                     fullWidth
//                                     type="number"
//                                 />
//                                 <TextField
//                                     label="PCB parasitic capacitance (nH)"
//                                     name="parasiticCap"
//                                     value={inputs.parasiticCap}
//                                     onChange={handleChange}
//                                     fullWidth
//                                     type="number"
//                                 />
//                                 <TextField
//                                     label="Q factor of coil"
//                                     name="qFactor"
//                                     value={inputs.qFactor}
//                                     onChange={handleChange}
//                                     fullWidth
//                                     type="number"
//                                 />
//                             </Box>
//                         </Collapse>

//                         <Button type="submit" variant="contained" color="primary">
//                             Calculate tuning and matching capacitance values
//                         </Button>
//                     </Box>
//                 </form>

//                 {results.length > 0 && (
//                     <Box mt={4}>
//                         <Typography variant="h6" sx={{ mt: 0 }}>Capacitors required for your coil:</Typography>
//                         <Table>
//                             <TableHead>
//                                 <TableRow>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>Number of turns</TableCell>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>Tuning capacitance (pF)</TableCell>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>Matching capacitance (pF)</TableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {results.map((row) => (
//                                     <TableRow key={row.n}>
//                                         <TableCell>{row.n}</TableCell>
//                                         <TableCell>{row.CT_pF}</TableCell>
//                                         <TableCell>{row.CM_pF}</TableCell>
//                                     </TableRow>
//                                 ))}
//                             </TableBody>
//                         </Table>

//                         <Typography variant="h6" sx={{ mt: 4 }}>
//                             Coil inductance values
//                         </Typography>
//                         <Box>
//                             {results.map((r) => (
//                                 <Typography key={r.n}>
//                                     n = {r.n} turn(s): {r.L_nH} nH
//                                 </Typography>
//                             ))}
//                         </Box>
//                     </Box>
//                 )}
//             </Paper>

//             <Box mt={4} display="flex" justifyContent="center" gap={4} flexWrap="wrap">
//                 <Button
//                     variant="outlined"
//                     color="primary"
//                     href="/coil_inductor_3dmodels.zip"
//                     download
//                 >
//                     Download Coil Inductor 3D models
//                 </Button>
//                 <Button
//                     variant="outlined"
//                     color="secondary"
//                     href="/PCB_gerber_files.zip"
//                     download
//                 >
//                     Download PCB Gerber Files
//                 </Button>
//             </Box>

//             <Box
//                 component="img"
//                 src={MRCalcImage}
//                 alt="MR Coil Illustration"
//                 sx={{
//                     width: "100%",   // makes it responsive
//                     maxWidth: "800px",
//                     height: "auto",
//                     mt: 3,
//                     borderRadius: 2,
//                     boxShadow: 3
//                 }}
//             />

//             <Box mt={4} width="100%">
//                 <CalculatorInfo />
//             </Box>

//         </Container>
//     );
// };

// export default MRCalculatorPage;

