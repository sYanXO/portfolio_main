import { useEffect, useState, useRef } from 'react';

const GITHUB_USERNAME = 'sYanXO';

// Teal-based color scale matching --accent: #2dd4bf on --bg: #0d1117
const LEVEL_COLORS = [
  '#161b22', // 0 contributions — near-bg subtle
  '#0d3d38', // 1–3
  '#0e6b5e', // 4–7
  '#1a9e8c', // 8–12
  '#2dd4bf', // 13+ — full accent
];

function getLevelColor(count) {
  if (count === 0) return LEVEL_COLORS[0];
  if (count <= 3)  return LEVEL_COLORS[1];
  if (count <= 7)  return LEVEL_COLORS[2];
  if (count <= 12) return LEVEL_COLORS[3];
  return LEVEL_COLORS[4];
}

const CELL = 11;
const GAP  = 3;
const STEP = CELL + GAP;

function parseContributions(flat) {
  // flat: array of { date, count } sorted chronologically
  const weeks = [];
  let week = [];
  flat.forEach((day, i) => {
    if (i === 0) {
      // Pad start so week aligns to correct day-of-week (0=Sun)
      const dow = new Date(day.date + 'T00:00:00').getDay();
      for (let p = 0; p < dow; p++) week.push(null);
    }
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstValid = week.find(d => d !== null);
    if (!firstValid) return;
    const d = new Date(firstValid.date + 'T00:00:00');
    const m = d.getMonth();
    if (m !== lastMonth) {
      labels.push({ x: wi * STEP, label: d.toLocaleString('default', { month: 'short' }) });
      lastMonth = m;
    }
  });
  return labels;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GithubHeatmap() {
  const [weeks, setWeeks]        = useState([]);
  const [total, setTotal]        = useState(null);
  const [monthLabels, setMonths] = useState([]);
  const [tooltip, setTooltip]    = useState(null);
  const [error, setError]        = useState(false);
  const svgRef                   = useRef(null);

  useEffect(() => {
    fetch('/api/github-contributions')
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
      .then(data => {
        const w = parseContributions(data.contributions);
        setWeeks(w);
        setTotal(data.total);
        setMonths(getMonthLabels(w));
      })
      .catch(() => setError(true));
  }, []);

  const svgWidth = weeks.length * STEP;
  const LEFT_PAD = 28;
  const TOP_PAD  = 18;

  function handleMouseEnter(e, day) {
    if (!day || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date: day.date,
      count: day.count,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  return (
    <div className="gh-heatmap-wrapper">
      <div className="gh-heatmap-header">
        <span className="gh-heatmap-label">github activity</span>
        {total !== null && (
          <a
            className="gh-heatmap-total"
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {total.toLocaleString()} contributions this year ↗
          </a>
        )}
      </div>

      {error && (
        <p className="gh-heatmap-error">couldn't load contribution data.</p>
      )}

      {!error && weeks.length === 0 && (
        <div className="gh-heatmap-loading">
          <div className="gh-heatmap-skeleton" />
        </div>
      )}

      {!error && weeks.length > 0 && (
        <div className="gh-heatmap-scroll">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <svg
              ref={svgRef}
              width={LEFT_PAD + svgWidth}
              height={TOP_PAD + 7 * STEP}
              style={{ display: 'block' }}
            >
              {/* Month labels */}
              {monthLabels.map(({ x, label }, i) => (
                <text
                  key={i}
                  x={LEFT_PAD + x}
                  y={11}
                  fontSize={9}
                  fill="#7d8590"
                  fontFamily="'Geist Mono', monospace"
                >
                  {label}
                </text>
              ))}

              {/* Day-of-week labels — Mon, Wed, Fri only */}
              {[1, 3, 5].map(dow => (
                <text
                  key={dow}
                  x={0}
                  y={TOP_PAD + dow * STEP + CELL - 2}
                  fontSize={9}
                  fill="#7d8590"
                  fontFamily="'Geist Mono', monospace"
                >
                  {DAY_LABELS[dow].slice(0, 3)}
                </text>
              ))}

              {/* Contribution cells */}
              {weeks.map((week, wi) =>
                week.map((day, di) => (
                  <rect
                    key={`${wi}-${di}`}
                    x={LEFT_PAD + wi * STEP}
                    y={TOP_PAD + di * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    ry={2}
                    fill={day ? getLevelColor(day.count) : 'transparent'}
                    onMouseEnter={day ? e => handleMouseEnter(e, day) : undefined}
                    onMouseLeave={day ? handleMouseLeave : undefined}
                    className={day ? 'gh-cell' : undefined}
                  />
                ))
              )}
            </svg>

            {/* Hover tooltip */}
            {tooltip && (
              <div
                className="gh-tooltip"
                style={{ left: tooltip.x + 12, top: tooltip.y - 38 }}
              >
                <strong>
                  {tooltip.count} contribution{tooltip.count !== 1 ? 's' : ''}
                </strong>
                <span>
                  {new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Color legend */}
          <div className="gh-legend">
            <span>less</span>
            {LEVEL_COLORS.map((c, i) => (
              <div key={i} className="gh-legend-cell" style={{ background: c }} />
            ))}
            <span>more</span>
          </div>
        </div>
      )}
    </div>
  );
}
