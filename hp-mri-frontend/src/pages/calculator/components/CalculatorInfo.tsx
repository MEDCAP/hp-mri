import React from "react";
import { Box, Typography, Paper } from "@mui/material";

const CalculatorInfo: React.FC = () => {
    return (
        <Box mt={4}>
            <Paper elevation={3} sx={{ p: 4, bgcolor: "#f9fafb", color: "#111827" }}>
                <Typography variant="h5" gutterBottom fontWeight={700}>
                    How to use calculator
                </Typography>
                <Typography paragraph>
                    We suggest the following procedure for efficient coil design: first, the inductor radius is chosen based on the size and depth of the structure to be imaged, noting that penetration depth is approximately one inductor radius. Next, the number of turns is selected; lower frequencies and a protruding structure, such as a flank tumor, favor a larger number of turns. Equation [8] can be used to calculate the coil inductance. Third, the coaxial cable length is selected based on practical animal and PCB positioning considerations, noting that the approximations of Eq. [4] become inaccurate at lengths over 25 cm in the frequency range discussed here. Finally, tuning and matching components are selected using application of Eqs. [6] and [7]. If application of the equations leads to requirements of negative or very small values for capacitance, coil inductance must be minimized by reducing the number of <i>inductor</i> turns, the coaxial cable length, or both.
                </Typography>

                <Typography variant="h5" gutterBottom fontWeight={700}>
                    MR coil theory
                </Typography>
                <Typography paragraph>
                    The coaxial cable is modeled using its (parallel) capacitance, <i>c</i>, and (series) inductance <i>l</i> per unit length. The former is generally specified by the manufacturer, and the latter is implied by the characteristic impedance <i>Z<sub>0</sub> = √(l/c)</i> of the cable or can be measured as we have done herein.
                </Typography>
                <Typography paragraph>
                    Along the cable, impedance changes as:
                </Typography>
                <Box component="pre" sx={{ bgcolor: "#fff", p: 2, borderLeft: "3px solid #3b82f6", fontFamily: "monospace", overflowX: "auto" }}>
                    Z<sub>x+dx</sub> = 1 / (1 / Z<sub>x</sub> + jωl·dx + jωc·dx) [1]
                </Box>

                <Typography paragraph>
                    By using separation of variables, abbreviating (<i>ωXZ<sub>0</sub>c</i>), and integrating along the cable length <i>x</i> = 0 to X and impedance <i>Z</i> = <i>jωL + R</i> to Z₁, we obtain:
                </Typography>
                <Box component="pre" sx={{ ...equationBox }}>
                    dZ / (l - cZ²) = jω·dx [2]
                </Box>
                <Box component="pre" sx={{ ...equationBox }}>
                    Z₁ = (R + j(wL + Z₀β)) / (1 + β(jR - ωL) / Z₀) [3]
                </Box>

                <Typography paragraph>
                    Combining this with the effective parallel tuning capacitance <i>C = C<sub>T</sub> + C<sub>P</sub></i>, representing the combined effect of the tuning capacitor and a parallel parasitic component originating on the circuit board, we derive the impedance of the matched tank circuit:
                </Typography>
                <Box component="pre" sx={{ ...equationBox }}>
                    Z = (R + j(ωL + βZ₀)) / (1 - ω²LC - βω(CZ₀ + L/Z₀) - jR(ωC + β/Z₀)) + 1 / (jωC<sub>M</sub>) [4]
                </Box>

                <Typography paragraph>
                    In most use cases, the coaxial cable will be significantly shorter than the RF wavelength; this corresponds to <i>β ≪ 1</i>, allowing us to approximate the tangent function by its argument <i>β ≈ ωXZ₀c</i>. It is also common for the characteristic impedance of the coaxial cable to match that of the power amplifier and preamplifier (often <i>Z₀ = 50 Ω</i>) and that the Q factor of the whole coil <i>Q ≫ 1</i>, corresponding to <i>R / Z₀ ≪ 1</i>. To find the appropriate tuning condition, which maximizes both transmitted power and received signal, we choose a <i>C<sub>T</sub></i> and <i>C<sub>M</sub></i> such that <i>Z = Z₀</i>. Keeping terms to lowest order in <i>R / Z₀</i> and <i>β</i>, and reframing in terms of Q factor using <i>R = ωL / Q</i>, we find that:
                </Typography>
                <Box component="pre" sx={{ ...equationBox }}>
                    ω² = (1 - √(ωL / (QZ₀))) / (LC + X(Lc + lC)) [5]
                </Box>

                <Typography paragraph>
                    This approximation is typically sufficient for prediction accuracy exceeding the precision of commercially available reactive circuit elements. Reframing this to yield the required tuning capacitance, we find:
                </Typography>
                <Box component="pre" sx={{ ...equationBox }}>
                    C<sub>T</sub> = (1 - ω²XcL - ωL / (2QZ₀)) / (ω²(L + Xl)) - C<sub>P</sub> [6]
                </Box>

                <Typography paragraph>
                    A similar calculation, setting the imaginary part of Eq. [4] to zero yields:
                </Typography>
                <Box component="pre" sx={{ ...equationBox }}>
                    C<sub>M</sub> = √(ωL / (QZ₀)) / (ω²Q(L + Xl) + ωZ₀) [7]
                </Box>

                <Typography paragraph>
                    <i>C<sub>M</sub></i> should be adjusted as necessary for any parasitic series contribution from the circuit board. In practice, since losses and slight variations are of less importance outside of the tank circuit, and since the required value is affected by capacitive coupling to the imaging subject, a single variable capacitor covering the expected range (e.g., 0 to twice the predicted <i>C<sub>M</sub></i>) generally provides satisfactory performance.
                </Typography>

                <Typography variant="h5" gutterBottom fontWeight={700}>
                    Coil inductance calculation
                </Typography>
                <Typography paragraph>
                    Coil inductance can be calculated using this heuristic equation:
                </Typography>
                <Box component="pre" sx={{ ...equationBox }}>
                    L = L₀ + kD ln(D)nᵖ [8]
                </Box>
                <Typography paragraph>
                    Here, D is the inductor diameter in mm and n is the number of turns. We found that L₀ = 0.762 nH, k = 0.448 nH and p = 1.418 summarize all of our coils well (mean deviation of 2.0%) as per Figure 4 in the main text. This is for a frequency range of 25 to 85 MHz, inductor diameter of 15–25 mm and 20-AWG wire.
                </Typography>
            </Paper>
        </Box>
    );
};

const equationBox = {
    bgcolor: "#fff",
    p: 2,
    borderLeft: "3px solid #3b82f6",
    fontFamily: "monospace",
    fontSize: "0.95rem",
    my: 2,
    overflowX: "auto"
};

export default CalculatorInfo;
