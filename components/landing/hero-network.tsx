'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Route = { d: string; start: [number, number]; end: [number, number] };

const LINES = [1, 2, 3];
const CORNER = 10;

/** An orthogonal route: across to `xm`, then up or down, then across, with rounded corners. */
function route([x1, y1]: [number, number], [x2, y2]: [number, number], xm: number): string {
  const dy = y2 - y1;
  if (Math.abs(dy) < 1) return `M${x1} ${y1}H${x2}`;
  const r = Math.min(CORNER, Math.abs(dy) / 2, xm - x1, x2 - xm);
  const s = Math.sign(dy);
  return [
    `M${x1} ${y1}`,
    `H${xm - r}`,
    `Q${xm} ${y1} ${xm} ${y1 + s * r}`,
    `V${y2 - s * r}`,
    `Q${xm} ${y2} ${xm + r} ${y2}`,
    `H${x2}`,
  ].join('');
}

/**
 * Hero linework (large screens): each numbered claim in the hero copy is wired to the footnoted
 * line on the front term sheet that proves it. Positions are measured from the live layout, so
 * the lines stay attached as the page resizes. Decorative only (aria-hidden).
 */
export function HeroNetwork() {
  const overlay = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [routes, setRoutes] = useState<Route[]>([]);

  useEffect(() => {
    const root = overlay.current?.parentElement;
    if (!root) return;

    const measure = () => {
      const box = root.getBoundingClientRect();
      const points = LINES.map((n) => {
        const from = root.querySelector(`[data-net-from="${n}"]`);
        const to = root.querySelector(`[data-front] [data-net-to="${n}"]`);
        const sheet = to?.closest('[data-front]');
        if (!from || !to || !sheet) return null;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const start: [number, number] = [a.right - box.left, a.top + a.height / 2 - box.top];
        const end: [number, number] = [sheet.getBoundingClientRect().left - box.left, b.top + 21 - box.top];
        return { start, end };
      });
      if (points.some((point) => point === null || point.end[0] - point.start[0] < 24)) {
        setRoutes([]);
        return;
      }
      const valid = points as { start: [number, number]; end: [number, number] }[];
      // Lines that climb turn later the lower they start (and vice versa), so no two ever cross.
      const climbing = valid.reduce((sum, p) => sum + (p.end[1] - p.start[1]), 0) < 0;
      setSize([box.width, box.height]);
      setRoutes(
        valid.map(({ start, end }, index) => {
          const order = climbing ? index : valid.length - 1 - index;
          const xm = start[0] + (end[0] - start[0]) * (0.3 + order * 0.2);
          return { d: route(start, end, xm), start, end };
        }),
      );
    };

    measure();
    // Re-measure once the hero entrance has settled and web fonts have swapped in.
    const settle = window.setTimeout(measure, 1250);
    document.fonts?.ready.then(measure).catch(() => {});
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    return () => {
      window.clearTimeout(settle);
      resize.disconnect();
    };
  }, []);

  const [width, height] = size;

  return (
    <div ref={overlay} aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      {routes.length > 0 && (
        <>
          <svg data-reveal="draw" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 overflow-visible" fill="none">
            {routes.map((r, index) => (
              <g key={index} style={{ '--draw-i': index + 4 } as CSSProperties}>
                <path d={r.d} pathLength={1} className="draw-path stroke-accent/45" strokeWidth={1} />
                <circle cx={r.start[0]} cy={r.start[1]} r={2.5} className="draw-node fill-accent" />
                <rect x={r.end[0] - 3} y={r.end[1] - 3} width={6} height={6} rx={1} className="draw-node fill-surface stroke-accent" strokeWidth={1} />
              </g>
            ))}
          </svg>
          {routes.map((r, index) => (
            <span
              key={index}
              className="net-packet absolute top-0 left-0 size-[5px] rounded-full bg-accent"
              style={{ offsetPath: `path("${r.d}")`, '--draw-i': index } as CSSProperties}
            />
          ))}
        </>
      )}
    </div>
  );
}
