// src/pages/calculator/MRCalculatorPage.tsx

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
import MRCalcImage from "../../assets/mr_calc_model.png";

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
  const [showResCalc, setShowResCalc] = useState(false);
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

    if (inputs.diameterMM === "" || isNaN(inputs.diameterMM)) {
      newErrors.diameterMM = "Please enter a diameter value.";
    } else if (inputs.diameterMM < 10 || inputs.diameterMM > 30) {
      newErrors.diameterMM = "Diameter must be between 10–30 mm.";
    }

    if (inputs.frequencyMHz === "" || isNaN(inputs.frequencyMHz)) {
      newErrors.frequencyMHz = "Please enter a resonance frequency.";
    } else if (inputs.frequencyMHz < 20 || inputs.frequencyMHz > 100) {
      newErrors.frequencyMHz = "Resonance Frequency must be between 20–100 MHz.";
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
      <Typography paragraph>
        Welcome! This calculator helps you design heteronuclear MR coils for
        small-animal imaging.
      </Typography>

      {/* “How to use calculator” section above all controls */}
      <Box mt={1} width="100%">
        <Typography variant="h5" gutterBottom fontWeight={700}>
          How to use calculator
        </Typography>
        <Typography paragraph align="left">
          1. <strong>Choose the inductor radius</strong> based on the size and
          depth of the structure you want to image. (Note: penetration depth is
          roughly equal to one inductor radius). <br />
          2. <strong>Determine coaxial cable length</strong> by considering
          experimental layout. Keep in mind that Equation [4] (see theory
          section) becomes inaccurate for lengths over 25 cm in the frequency
          range covered here. <br />
          3. <strong>Calculate the tuning capacitors</strong>. If
          the output calls for very small or negative capacitance values, reduce
          coil inductance by decreasing the number of turns, shortening the
          coaxial cable, or both. <br />
          4. <strong>Choose # of turns for inductor</strong>; lower frequencies
          and imaging of protruding structures (e.g. flank tumor) typically
          require more turns.
          <br />
          <br />
          <strong>Note:</strong> Due to variability in exact MRI field strength,
          we recommend using a tuning capacitor which is 5–10 pF lower than the
          calculated capacitance, and supplementing with a variable screw
          tuning capacitor (see components list). Similarly, a 50 pF range
          variable screw matching capacitor works as a matching component in
          all cases.
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, width: "100%", mt: 2 }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Button
              variant="outlined"
              onClick={() => setShowResCalc(!showResCalc)}
            >
              {showResCalc ? (
                <strong>Hide Resonance Calculator</strong>
              ) : (
                <strong>Click Here for Resonance Frequency Calculator</strong>
              )}
            </Button>

            <Collapse in={showResCalc}>
              <Box display="flex" flexDirection="column" gap={2} mt={2}>
                <FormControl fullWidth>
                  <InputLabel id="nucleus-select-label">Nucleus</InputLabel>
                  <Select
                    labelId="nucleus-select-label"
                    label="Nucleus"
                    value={inputs.nucleusGamma}
                    onChange={handleNucleusChange}
                    sx={{ textAlign: "left" }}
                  >
                    <MenuItem value={42.576}>¹H (42.576 MHz/T)</MenuItem>
                    <MenuItem value={6.53593}>²D (6.53593 MHz/T)</MenuItem>
                    <MenuItem value={-32.434}>³He (−32.434 MHz/T)</MenuItem>
                    <MenuItem value={10.705}>¹³C (10.705 MHz/T)</MenuItem>
                    <MenuItem value={3.0766}>¹⁴N (3.0766 MHz/T)</MenuItem>
                    <MenuItem value={-4.3156}>¹⁵N (−4.3156 MHz/T)</MenuItem>
                    <MenuItem value={-5.7716}>¹⁷O (−5.7716 MHz/T)</MenuItem>
                    <MenuItem value={40.0593}>¹⁹F (40.0593 MHz/T)</MenuItem>
                    <MenuItem value={17.235}>³¹P (17.235 MHz/T)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Magnetic Field Strength (T)"
                  name="fieldStrength"
                  value={inputs.fieldStrength}
                  onChange={handleChange}
                  fullWidth
                  type="number"
                  inputProps={{ step: "any" }}
                />

                <Typography variant="body1" sx={{ mt: 1 }}>
                  {inputs.nucleusGamma && inputs.fieldStrength
                    ? `Resonance frequency: ${Math.abs(
                        inputs.nucleusGamma as number * parseFloat(inputs.fieldStrength as any)
                      ).toFixed(3)} MHz`
                    : "Resonance frequency: —"}
                </Typography>
              </Box>
            </Collapse>

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

            <Button
              onClick={() => setShowOptional(!showOptional)}
              variant="outlined"
            >
              {showOptional ? (
                <strong>Hide Optional Inputs</strong>
              ) : (
                <strong>Show Optional Inputs</strong>
              )}
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
              <strong>CALCULATE</strong>
            </Button>
          </Box>
        </form>

        {results.length > 0 && (
          <Box mt={2}>
            <Typography variant="h6" sx={{ mt: 0 }}>
              Capacitors required for your coil:
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", py: 1 }}>
                    # Turns (Inductor)
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", py: 1 }}>
                    Inductance (nH)
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", py: 1 }}>
                    Tuning Capacitance (pF)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row) => (
                  <TableRow key={row.n}>
                    <TableCell sx={{ py: 0.5 }}>{row.n}</TableCell>
                    <TableCell sx={{ py: 0.5 }}>{row.L_nH}</TableCell>
                    <TableCell sx={{ py: 0.5 }}>{row.CT_pF}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <Box
        component="img"
        src={MRCalcImage}
        alt="MR Coil Illustration"
        sx={{
          width: "100%",
          maxWidth: "1200px",
          height: "auto",
          mt: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      />

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
          href="/MRI_mouse_bed_3dmodels.zip"
          download
        >
          Download Mouse Bed Files
        </Button>
      </Box>

      {/* MR coil theory and onward stay in CalculatorInfo */}
      <Box mt={4} width="100%">
        <CalculatorInfo />
      </Box>
    </Container>
  );
};

export default MRCalculatorPage;
