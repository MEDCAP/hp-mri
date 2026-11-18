import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Measures the element the plot fills.
 *
 * Plotly's own resize handling only watches the window, so changing the panel
 * grid would leave a plot at its old size.
 */
export const usePlotSize = (): {
  containerRef: RefObject<HTMLDivElement>;
  width: number;
  height: number;
} => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return { containerRef, width: size.width, height: size.height };
};
