interface Props {
  title: string;
  values: number[]; // radiant-minus-dire advantage, one point per minute
}

const WIDTH = 800;
const HEIGHT = 220;
const PAD = 32;

export function AdvantageChart({ title, values }: Props) {
  if (values.length < 2) {
    return (
      <div className="chart-empty">
        <h3>{title}</h3>
        <p>Not enough data to draw a graph for this match.</p>
      </div>
    );
  }

  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  const midY = PAD + innerH / 2;

  const xFor = (i: number) => PAD + (i / (values.length - 1)) * innerW;
  const yFor = (v: number) => midY - (v / maxAbs) * (innerH / 2);

  const linePoints = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
  const areaPoints = [`${xFor(0)},${midY}`, ...values.map((v, i) => `${xFor(i)},${yFor(v)}`), `${xFor(values.length - 1)},${midY}`].join(" ");

  const clipId = `clip-${title.replace(/\s+/g, "-")}`;

  return (
    <div className="chart">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img" aria-label={title}>
        <defs>
          <clipPath id={`${clipId}-pos`}>
            <rect x={0} y={0} width={WIDTH} height={midY} />
          </clipPath>
          <clipPath id={`${clipId}-neg`}>
            <rect x={0} y={midY} width={WIDTH} height={HEIGHT - midY} />
          </clipPath>
        </defs>

        <line x1={PAD} y1={midY} x2={WIDTH - PAD} y2={midY} className="chart-axis" />

        <polygon points={areaPoints} className="chart-area chart-area-radiant" clipPath={`url(#${clipId}-pos)`} />
        <polygon points={areaPoints} className="chart-area chart-area-dire" clipPath={`url(#${clipId}-neg)`} />

        <polyline points={linePoints} className="chart-line" />
      </svg>
      <div className="chart-legend">
        <span className="legend-radiant">Radiant advantage</span>
        <span className="legend-dire">Dire advantage</span>
      </div>
    </div>
  );
}
