import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from './chartColors.js';

const ROW_HEIGHT = 30;

/** Bars are coloured by band: below 50 is weak, 50 to 69 is middling, 70 and above is strong. */
export function accuracyColor(accuracy) {
  if (accuracy < 50) return CHART.weak;
  if (accuracy < 70) return CHART.mid;
  return CHART.good;
}

/** `data`: [{ subject, accuracy }] with accuracy 0 to 100. */
export default function SubjectAccuracyChart({ data }) {
  return (
    <div style={{ height: data.length * ROW_HEIGHT + 32 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="subject"
            width={170}
            tick={{ fill: '#374050', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f6f7f9' }}
            formatter={(value) => [`${value}%`, 'Accuracy']}
            contentStyle={{ borderRadius: 6, border: '1px solid #dde1e8', fontSize: 13 }}
          />
          <Bar dataKey="accuracy" radius={[0, 3, 3, 0]} barSize={14}>
            {data.map((d) => (
              <Cell key={d.subject} fill={accuracyColor(d.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
