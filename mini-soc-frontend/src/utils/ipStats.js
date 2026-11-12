// Builds the IP Activity table from logs + alerts.
const alertWeight = { Critical: 25, High: 15, Medium: 8, Low: 3 };

export function buildIpStats(logs, alerts) {
  const map = new Map();
  logs.forEach((l) => {
    if (!map.has(l.sourceIp)) {
      map.set(l.sourceIp, { ip: l.sourceIp, events: 0, failedLogins: 0, portScans: 0, alerts: 0, alertScore: 0, lastSeen: l.timestamp });
    }
    const s = map.get(l.sourceIp);
    s.events += 1;
    if (l.eventType === 'Failed Login' || l.eventType === 'Brute Force Attempt') s.failedLogins += 1;
    if (l.eventType === 'Port Scan') s.portScans += 1;
    if (l.timestamp > s.lastSeen) s.lastSeen = l.timestamp;
  });

  alerts.forEach((a) => {
    const s = map.get(a.sourceIp);
    if (!s) return;
    s.alerts += 1;
    if (a.status !== 'Resolved' && a.status !== 'False Positive') s.alertScore += alertWeight[a.severity] || 0;
  });

  return Array.from(map.values()).map((s) => {
    const riskScore = Math.min(100, s.failedLogins * 5 + s.portScans * 7 + s.alertScore);
    const status = riskScore >= 70 ? 'High Risk' : riskScore >= 40 ? 'Suspicious' : 'Normal';
    return { ...s, riskScore, status };
  });
}
