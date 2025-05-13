import React from "react";
import styles from "./CalculatorInfo.module.css";

const CalculatorInfo: React.FC = () => {
    return (
        <div className={styles.infoContainer}>
            <h2 className={styles.heading}>How to use calculator</h2>
            <p>
                We suggest the following procedure for efficient coil design: first, the inductor radius is chosen based on the size and depth of the structure to be imaged, noting that penetration depth is approximately one inductor radius. Next, the number of turns is selected; lower frequencies and a protruding structure, such as a flank tumor, favor a larger number of turns. Equation [8] can be used to calculate the coil inductance. Third, the coaxial cable length is selected based on practical animal and PCB positioning considerations, noting that the approximations of Eq. [4] become inaccurate at lengths over 25 cm in the frequency range discussed here. Finally, tuning and matching components are selected using application of Eqs. [6] and [7]. If application of the equations leads to requirements of negative or very small values for capacitance, coil inductance must be minimized by reducing the number of <i>inductor</i> turns, the coaxial cable length, or both.
            </p>

            <h2 className={styles.heading}>MR coil theory</h2>
            <p>
                The coaxial cable is modeled using its (parallel) capacitance, <i>c</i>, and (series) inductance <i>l</i> per unit length. The former is generally specified by the manufacturer, and the latter is implied by the characteristic impedance <i>Z<sub>0</sub> = √(l/c)</i> of the cable or can be measured as we have done herein.
            </p>
            <p>
                Along the cable, impedance changes as:
            </p>
            <pre className={styles.equation}>
                Z<sub>x+dx</sub> = 1 / (1 / Z<sub>x</sub> + jωl·dx + jωc·dx) [1]
            </pre>
            <p>
                By using separation of variables, abbreviating (<i>ωXZ<sub>0</sub>c</i>), and integrating along the cable length <i>x</i> = 0 to X and impedance <i>Z</i> = <i>jωL + R</i> to Z₁, we obtain:
            </p>
            <pre className={styles.equation}>
                dZ / (l - cZ²) = jω·dx [2]
            </pre>
            <pre className={styles.equation}>
                Z₁ = (R + j(wL + Z₀β)) / (1 + β(jR - ωL) / Z₀) [3]
            </pre>
            <p>
                Combining this with the effective parallel tuning capacitance <i>C = C<sub>T</sub> + C<sub>P</sub></i>, representing the combined effect of the tuning capacitor and a parallel parasitic component originating on the circuit board, we derive the impedance of the matched tank circuit:
            </p>
            <pre className={styles.equation}>
                Z = (R + j(ωL + βZ₀)) / (1 - ω²LC - βω(CZ₀ + L/Z₀) - jR(ωC + β/Z₀)) + 1 / (jωC<sub>M</sub>) [4]
            </pre>
            <p>
                In most use cases, the coaxial cable will be significantly shorter than the RF wavelength; this corresponds to <i>β ≪ 1</i>, allowing us to approximate the tangent function by its argument <i>β ≈ ωXZ₀c</i>. It is also common for the characteristic impedance of the coaxial cable to match that of the power amplifier and preamplifier (often <i>Z₀ = 50 Ω</i>) and that the Q factor of the whole coil <i>Q ≫ 1</i>, corresponding to <i>R / Z₀ ≪ 1</i>. To find the appropriate tuning condition, which maximizes both transmitted power and received signal, we choose a <i>C<sub>T</sub></i> and <i>C<sub>M</sub></i> such that <i>Z = Z₀</i>. Keeping terms to lowest order in <i>R / Z₀</i> and <i>β</i>, and reframing in terms of Q factor using <i>R = ωL / Q</i>, we find that:
            </p>
            <pre className={styles.equation}>
                ω² = (1 - √(ωL / (QZ₀))) / (LC + X(Lc + lC)) [5]
            </pre>

            <p>
                This approximation is typically sufficient for prediction accuracy exceeding the precision of commercially available reactive circuit elements. Reframing this to yield the required tuning capacitance, we find:
            </p>
            <pre className={styles.equation}>
                C<sub>T</sub> = (1 - ω²XcL - ωL / (2QZ₀)) / (ω²(L + Xl)) - C<sub>P</sub> [6]
            </pre>
            <p>
                Here, <i>R</i> has been replaced by the more intuitive <i>ωL / Q</i>, and the square root approximated by the first term of its series expansion. A similar calculation, setting the imaginary part of Eq. [4] to zero yields:
            </p>
            <pre className={styles.equation}>
                C<sub>M</sub> = √(ωL / (QZ₀)) / (ω²Q(L + Xl) + ωZ₀) [7]
            </pre>
            <p>
                <i>C<sub>M</sub></i> should be adjusted as necessary for any parasitic series contribution from the circuit board. In practice, since losses and slight variations are of less importance outside of the tank circuit, and since the required value is affected by capacitive coupling to the imaging subject, a single variable capacitor covering the expected range (e.g., 0 to twice the predicted <i>C<sub>M</sub></i>) generally provides satisfactory performance.
            </p>

            <h2 className={styles.heading}>Coil inductance calculation</h2>
            <p>
                Coil inductance can be calculated using this heuristic equation:
            </p>
            <pre className={styles.equation}>
                L = L₀ + kD ln(D)nᵖ [8]
            </pre>
            <p>
                Here, D is the inductor diameter in mm and n is the number of turns. We found that L₀ = 0.762 nH, k = 0.448 nH and p = 1.418 summarize all of our coils well (mean deviation of 2.0%) as per Figure 4 in the main text. This is for a frequency range of 25 to 85 MHz, inductor diameter of 15–25 mm and 20-AWG wire.
            </p>
        </div>
    );
};

export default CalculatorInfo;
