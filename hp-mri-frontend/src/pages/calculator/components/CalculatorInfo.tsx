// src/pages/calculator/components/CalculatorInfo.tsx

import React from "react";
import { Box, Typography, Paper, Link } from "@mui/material";

const CalculatorInfo: React.FC = () => {
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 4, bgcolor: "#f9fafb", color: "#111827" }}>
        {/* Full list of components */}
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Full list of components
        </Typography>
        <Typography paragraph align="left">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              textAlign: "left",
            }}
          >
            <Link
              href="https://www.mcmaster.com/catalog/131/4337/8873K17"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "blue" }}
            >
              20 AWG Copper Wire (McMaster-Carr 8873K17)
            </Link>
            <Link
              href="https://www.pasternack.com/non-magnetic-formable-pe-141fl-nm-bulk-copper-jacket-pe-141fl-nm-bulk-p.aspx"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "blue" }}
            >
              Coaxial cable (PE-141FL-NM, Pasternack)
            </Link>
            <Link
              href="https://www.digikey.com/en/products/detail/knowles-voltronics/AJ25HV/7261406"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "blue" }}
            >
              Variable capacitor 1–23 pF (AJ25HV, Knowles Voltronics)
            </Link>
            <Link
              href="https://www.digikey.com/en/products/detail/knowles-voltronics/AP55HV/6362733"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "blue" }}
            >
              Variable capacitor 1.5–55 pF (AP55HV, Knowles Voltronics)
            </Link>
            <Link
              href="https://www.digikey.com/en/products/filter/ceramic-capacitors/60?s=N4IgjCBcoMxaBjKAzAhgGwM4FMA0IB7KAbRAA4AGCAXXwAcAXKEAZQYCcBLAOwHMQAvvjAAWeCCSQ0WPIRIgATDADsMEcpD4AbGRhkxtEI2ZsufQcICcZS%2BMnSc%2BIpFIUQ1ISAC0AVjsoMRzkXRXcBTwV5BFQ6VAROBgJ2MKA"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: "blue" }}
            >
              Fixed ceramic capacitors, assorted
            </Link>
          </Box>
        </Typography>

        {/* MR coil theory onward */}
        <Typography variant="h5" gutterBottom fontWeight={700}>
          MR coil theory
        </Typography>
        <Typography paragraph align="left">
          The coaxial cable is modeled using its (parallel) capacitance,&nbsp;
          <i>c</i>, and (series) inductance <i>l</i> per unit length. The former
          is generally specified by the manufacturer, and the latter is implied
          by the characteristic impedance <i>Z₀ = √(l/c)</i> of the cable or
          can be measured as we have done herein.
        </Typography>
        <Typography paragraph align="left">
          Along the cable, impedance changes as:
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: "#fff",
            p: 2,
            borderLeft: "3px solid #3b82f6",
            fontFamily: "monospace",
            overflowX: "auto",
            textAlign: "left",
          }}
        >
          Z<sub>x+dx</sub> = 1 / (1 / Z<sub>x</sub> + jωl·dx + jωc·dx) [1]
        </Box>

        <Typography paragraph align="left">
          By using separation of variables, abbreviating (<i>β = ωXZ₀c</i>), and
          integrating along the cable length <i>x</i> = 0 to X and impedance{" "}
          <i>Z</i> = <i>jωL + R</i> to Z₁, we obtain:
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: "#fff",
            p: 2,
            borderLeft: "3px solid #3b82f6",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            my: 2,
            overflowX: "auto",
            textAlign: "left",
          }}
        >
          dZ / (l – cZ²) = jω·dx [2]
        </Box>
        <Box
          component="pre"
          sx={{
            bgcolor: "#fff",
            p: 2,
            borderLeft: "3px solid #3b82f6",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            my: 2,
            overflowX: "auto",
            textAlign: "left",
          }}
        >
          Z₁ = (R + j(ωL + Z₀β)) / (1 + β(jR – ωL) / Z₀) [3]
        </Box>

        <Typography paragraph align="left">
          Combining this with the effective parallel tuning capacitance{" "}
          <i>C = C<sub>T</sub> + C<sub>P</sub></i>, representing the combined
          effect of the tuning capacitor and a parallel parasitic component
          originating on the circuit board, we derive the impedance of the
          matched tank circuit:
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: "#fff",
            p: 2,
            borderLeft: "3px solid #3b82f6",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            my: 2,
            overflowX: "auto",
            textAlign: "left",
          }}
        >
          Z = (R + j(ωL + βZ₀)) / (1 – ω²LC – βω(CZ₀ + L/Z₀) – jR(ωC + β/Z₀)) + 1/(jωC<sub>M</sub>) [4]
        </Box>

        <Typography paragraph align="left">
          In most use cases, the coaxial cable will be significantly shorter
          than the RF wavelength; this corresponds to <i>β ≪ 1</i>, allowing us
          to approximate the tangent function by its argument{" "}
          <i>β ≈ ωXZ₀c</i>. It is also common for the characteristic impedance of
          the coaxial cable to match that of the power amplifier and
          preamplifier (often <i>Z₀ = 50 Ω</i>) and that the Q factor of the
          whole coil <i>Q ≫ 1</i>, corresponding to <i>R/Z₀ ≪ 1</i>. To find
          the appropriate tuning condition, which maximizes both transmitted
          power and received signal, we choose a <i>C<sub>T</sub></i> and{" "}
          <i>C<sub>M</sub></i> such that <i>Z = Z₀</i>. Keeping terms to lowest
          order in <i>R/Z₀</i> and <i>β</i>, and reframing in terms of Q factor
          using <i>R = ωL/Q</i>, we find that:
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: "#fff",
            p: 2,
            borderLeft: "3px solid #3b82f6",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            my: 2,
            overflowX: "auto",
            textAlign: "left",
          }}
        >
          ω² = (1 – √(ωL / (QZ₀))) / (LC + X(Lc + lC)) [5]
        </Box>

        <Typography paragraph align="left">
          This approximation is typically sufficient for prediction accuracy
          exceeding the precision of commercially available reactive circuit
          elements. Reframing this to yield the required tuning capacitance, we
          find:
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: "#fff",
            p: 2,
            borderLeft: "3px solid #3b82f6",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            my: 2,
            overflowX: "auto",
            textAlign: "left",
          }}
        >
          C<sub>T</sub> = (1 – ω²XcL – ωL/(2QZ₀)) / (ω²(L + Xl)) – C<sub>P</sub> [6]
        </Box>

        <Typography paragraph align="left">
          A similar calculation, setting the imaginary part of Eq. 4 to zero can be used to approximate the value for C<sub>M</sub>. However, for Q≫1 and β≪1, this value differs from C = C<sub>T</sub> + C<sub>P</sub> by a few percent.
          In practice, since losses
          and slight variations are of less importance outside of the tank
          circuit, and since the required value is affected by capacitive
          coupling to the imaging subject, a single variable capacitor covering
          the expected range (for example, 0 to twice the predicted{" "}
          <i>C<sub>M</sub></i>) generally provides satisfactory performance.
        </Typography>

        <Typography variant="h5" gutterBottom fontWeight={700}>
          Coil inductance calculation
        </Typography>
        <Typography paragraph align="left">
          Coil inductance can be calculated using this heuristic equation:
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: "#fff",
            p: 2,
            borderLeft: "3px solid #3b82f6",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            my: 2,
            overflowX: "auto",
            textAlign: "left",
          }}
        >
          L = L₀ + k D ln(D) nᵖ [7]
        </Box>
        <Typography paragraph align="left">
          Here, D is the inductor diameter in mm and n is the number of turns.
          We found that L₀ = 0.762 nH, k = 0.448 nH, and p = 1.418 summarize all
          of our coils well (mean deviation of 2.0%) as per Figure 4 in the main
          text. This is for a frequency range of 25 to 85 MHz, inductor diameter
          of 15–25 mm, and 20-AWG wire.
        </Typography>
      </Paper>
    </Box>
  );
};

export default CalculatorInfo;
