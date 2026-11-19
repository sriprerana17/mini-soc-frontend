export const COLORS = {
  cyan: '#00f5ff',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#a855f7',
  magenta: '#ec4899',
  pink: '#f43f5e',
  emerald: '#10b981',
  green: '#10b981',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#f43f5e',
  slate: '#64748b',
};

export const SEVERITY_COLORS = {
  Critical: COLORS.pink,
  High: COLORS.orange,
  Medium: COLORS.amber,
  Low: COLORS.emerald,
};

export const tooltipStyle = {
  contentStyle: {
    background: '#0c1324',
    border: '1px solid #1c2a4a',
    borderRadius: 10,
    fontSize: 12,
    color: '#f8fafc',
    boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 245, 255, 0.1)',
  },
  labelStyle: { color: '#94a3b8', fontWeight: 600 },
  itemStyle: { color: '#f8fafc' },
  cursor: { fill: 'rgba(0, 245, 255, 0.05)' },
};

export const axisProps = {
  stroke: '#475569',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

export const gridProps = {
  stroke: '#1c2a4a',
  strokeDasharray: '3 3',
  vertical: false,
};
