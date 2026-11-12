// MOCK DATA - 30 days of daily statistics for charts and the analytics page.

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = makeRng(7);

export const dailyStats = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 9, 10 + i)).toISOString().slice(0, 10); // 10 Oct -> 8 Nov
  const spike = i > 22 ? 1 : 0; // a busier final week
  const events = Math.round(900 + rand() * 500 + spike * 250);
  const loginFailed = Math.round(events * (0.07 + rand() * 0.06 + spike * 0.05));
  const loginSuccess = Math.round(events * (0.3 + rand() * 0.1));
  return {
    date,
    events,
    loginSuccess,
    loginFailed,
    critical: Math.round(rand() * 3 + spike),
    high: Math.round(2 + rand() * 4 + spike * 2),
    medium: Math.round(3 + rand() * 5),
    low: Math.round(4 + rand() * 6),
    bruteForce: Math.round(2 + rand() * 6 + spike * 3),
    portScan: Math.round(1 + rand() * 5 + spike * 2),
    privEsc: Math.round(rand() * 2),
    unusualLogin: Math.round(rand() * 4),
    outbound: Math.round(rand() * 3),
  };
});

export const ATTACK_TYPE_KEYS = [
  { key: 'bruteForce', label: 'Brute Force' },
  { key: 'portScan', label: 'Port Scan' },
  { key: 'unusualLogin', label: 'Unusual Login Time' },
  { key: 'outbound', label: 'Suspicious Outbound' },
  { key: 'privEsc', label: 'Privilege Escalation' },
];
