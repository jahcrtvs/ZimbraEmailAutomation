import { useEffect, useRef, useState } from "react";

// public/boot.js adds .js before first paint, and only when motion is allowed.
// Without it (no script, or reduced motion) every piece renders in its finished state.
export const armed = () => typeof document !== "undefined" && document.documentElement.classList.contains("js");

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function useInView(threshold = 0.35) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

// Timeouts that are cleared when the component goes away.
export function useLater() {
  const ids = useRef([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return (fn, ms) => ids.current.push(setTimeout(fn, ms));
}
