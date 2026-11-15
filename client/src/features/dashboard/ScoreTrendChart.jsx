import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from './chartColors.js';

/** `data`: [{ label, score }] in chronological order. `maxScore` sets the y-axis ceiling. */
export default function ScoreTrendChart({ data, maxScore = 100 }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, maxScore]}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value} / ${maxScore}`, 'Score']}
            contentStyle={{ borderRadius: 6, border: '1px solid #dde1e8', fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={CHART.primary}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART.primary }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
