// src/utils/calculate.ts
type InputParams = {
    diameterMM: number;
    frequencyMHz: number;
    coaxLengthMM: number;
    qFactor: number;
    parasiticCap: number;
    coaxCapacitance?: number; // pF
    coaxInductance?: number; // nH/m
};

export function calculateResults({
    diameterMM,
    frequencyMHz,
    coaxLengthMM,
    qFactor,
    parasiticCap,
    coaxCapacitance = 102, // default pF/m
    coaxInductance = 312,  // default nH/m
}: InputParams) {
    const turns = [1, 2, 3];

    // Constants
    const L0 = 0.762; // nH
    const k = 0.448;
    const p = 1.418;
    const D = diameterMM;

    const f = frequencyMHz * 1e6; // Hz
    const w = 2 * Math.PI * f;
    const X = coaxLengthMM / 1000; // meters
    const c = coaxCapacitance * 1e-12; // F/m
    const l = coaxInductance * 1e-9; // H/m
    const Cp = parasiticCap * 1e-12; // F

    const Z0 = Math.sqrt(l / c);

    return turns.map((n) => {
        const L_nH = L0 + k * D * Math.log(D) * Math.pow(n, p); // Equation [8]
        const L = L_nH * 1e-9; // H

        // Equation [6]
        const CT = (
            (1 - (Math.pow(w, 2) * X * c * L) - (w * L) / (2 * qFactor * Z0)) /
            (Math.pow(w, 2) * (L + X * l)) -
            Cp
        );

        // Equation [7]
        const CM = (
            Math.sqrt((w * L) / (qFactor * Z0)) /
            (Math.pow(w, 2) * qFactor * (L + X * l) + w * Z0)
        );

        return {
            n,
            L_nH: L_nH.toFixed(2),
            CT_pF: (CT * 1e12).toFixed(2),
            CM_pF: (CM * 1e12).toFixed(2),
        };
    });
}
