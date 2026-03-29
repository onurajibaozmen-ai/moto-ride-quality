type Tone = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple';

const toneClasses: Record<Tone, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-slate-100 text-slate-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({
  label,
  tone = 'gray',
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge label="N/A" tone="gray" />;
  if (score >= 90) return <Badge label={score.toString()} tone="green" />;
  if (score >= 75) return <Badge label={score.toString()} tone="yellow" />;
  return <Badge label={score.toString()} tone="red" />;
}

export function RideStatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <Badge label={status} tone="green" />;
  if (status === 'COMPLETED') return <Badge label={status} tone="blue" />;
  if (status === 'CANCELLED') return <Badge label={status} tone="red" />;
  return <Badge label={status} tone="gray" />;
}

export function EventTypeBadge({ type }: { type: string }) {
  if (type === 'harsh_brake') return <Badge label={type} tone="red" />;
  if (type === 'harsh_accel') return <Badge label={type} tone="yellow" />;
  if (type === 'speeding') return <Badge label={type} tone="purple" />;
  return <Badge label={type} tone="gray" />;
}