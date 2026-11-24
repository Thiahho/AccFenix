import { cn } from "@/lib/utils";

const CENTER = 100;
/** Irregular spike lengths, repeated around the circle, so the burst reads as printed rather than computed. */
const SPIKES = [98, 86, 95, 80, 99, 84, 91, 78];
const INNER = 62;

function burstPoints(count: number): string {
  const points: string[] = [];
  for (let i = 0; i < count * 2; i++) {
    const radius = i % 2 === 0 ? SPIKES[(i / 2) % SPIKES.length] : INNER;
    const angle = (Math.PI * i) / count - Math.PI / 2;
    points.push(`${(CENTER + radius * Math.cos(angle)).toFixed(2)},${(CENTER + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(" ");
}

type Props = {
  className?: string;
  /** Short true brand phrase, one array item per line. Without it the burst is a plain shape. */
  lines?: string[];
  spikes?: number;
  fill?: string;
  ink?: string;
};

/** Poster starburst stamp. Decorative: any phrase it carries also appears as real text or is not essential. */
export function Starburst({ className, lines = [], spikes = 16, fill = "var(--latte)", ink = "var(--espresso)" }: Props) {
  const size = lines.length > 2 ? 27 : 33;
  const first = CENTER - ((lines.length - 1) * size) / 2 + size * 0.36;
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={cn("block", className)}>
      <polygon points={burstPoints(spikes)} fill={fill} />
      {lines.length > 0 && (
        <text className="poster-hand" fill={ink} fontSize={size} textAnchor="middle">
          {lines.map((line, i) => (
            <tspan key={line} x={CENTER} y={first + i * size}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </svg>
  );
}
