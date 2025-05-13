import React from "react";
import styles from "./ResultsTable.module.css";

type Result = {
  n: number;
  L_nH: string;
  CT_pF: string;
  CM_pF: string;
};

const ResultsTable: React.FC<{ results: Result[] }> = ({ results }) => {
  return (
    <div>
      <h3 className={styles.title}>Capacitors required for your coil:</h3>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>Number of turns for inductor</th>
            <th className={styles.th}>Tuning capacitance (pF)</th>
            <th className={styles.th}>Matching capacitance (pF)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr key={row.n}>
              <td className={styles.td}>{row.n}</td>
              <td className={styles.td}>{row.CT_pF}</td>
              <td className={styles.td}>{row.CM_pF}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;
