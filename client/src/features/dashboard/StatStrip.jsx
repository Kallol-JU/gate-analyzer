/**
 * One bordered strip with hairline dividers instead of four separate cards.
 * The 1px gaps show the container colour, which draws the dividers.
 * `stats`: [{ label, value, hint? }]
 */
export default function StatStrip({ stats }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white px-5 py-4">
          <dt className="text-sm text-ink-500">{stat.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{stat.value}</dd>
          {stat.hint && <p className="mt-0.5 text-xs text-ink-500">{stat.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
