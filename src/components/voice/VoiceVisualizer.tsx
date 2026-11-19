export function VoiceVisualizer({ level }: { level: number }) {
  const bars = [0.4, 0.7, 1, 0.7, 0.4].map((w) => Math.min(1, level * 8 * w + 0.12));
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-primary"
          style={{ height: `${Math.round(h * 40)}px` }}
        />
      ))}
    </div>
  );
}
