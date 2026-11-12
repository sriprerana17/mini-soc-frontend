export const COLORS = {
  cyan: '#22d3ee', blue: '#3b82f6', green: '#34d399',
  red: '#ef4444', orange: '#f97316', amber: '#f59e0b', slate: '#64748b',
};
export const SEVERITY_COLORS = { Critical: COLORS.red, High: COLORS.orange, Medium: COLORS.amber, Low: COLORS.green };

export const tooltipStyle = {
  contentStyle: { background: '#0f1a2e', border: '1px solid #1d2b47', borderRadius: 8, fontSize: 12, color: '#e2e8f0' },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(148,163,184,0.08)' },
};
export const axisProps = { stroke: '#475569', fontSize: 11, tickLine: false, axisLine: false };
export const gridProps = { stroke: '#1d2b47', strokeDasharray: '3 3', vertical: false };
