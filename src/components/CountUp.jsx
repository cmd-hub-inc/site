import { useEffect, useRef, useState } from 'react';
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function CountUp({ value = null, duration = 900, format }) {
  const [display, setDisplay] = useState(() => (value == null ? null : Math.floor(value)));
  const fromRef = useRef(value == null ? 0 : Math.floor(value));
  const rafRef = useRef(null);

  useEffect(() => {
    if (value == null) {
      fromRef.current = 0;
      setDisplay(null);
      return;
    }

    const from = fromRef.current || 0;
    const to = Math.floor(value || 0);
    if (from === to) return setDisplay(to);
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const v = Math.round(from + (to - from) * easeOutCubic(t));
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  if (display == null) return <>—</>;
  if (format && typeof format === 'function') return <>{format(display)}</>;
  return <>{new Intl.NumberFormat().format(display)}</>;
}
