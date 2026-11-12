// MOCK DATA - sample alerts for the frontend demo.
// These are NOT real detected threats. They are examples used to build the UI.
import { mockLogs } from './mockLogs';

const definitions = [
  { id: 'ALT-1001', name: 'Brute Force Login Attempt', sourceIp: '185.220.101.45', severity: 'Critical', riskScore: 94, status: 'Open',
    rule: 'RULE-001: More than 10 failed logins from one IP within 10 minutes',
    types: ['Brute Force Attempt', 'Failed Login'],
    explanation: 'The same source IP produced many failed authentication events in a short period. This pattern is typical of password guessing against SSH accounts.' },
  { id: 'ALT-1002', name: 'Port Scan Detected', sourceIp: '45.155.205.233', severity: 'High', riskScore: 81, status: 'Investigating',
    rule: 'RULE-002: Connection attempts to more than 15 ports from one IP',
    types: ['Port Scan'],
    explanation: 'One external IP tried many different ports on internal hosts and was blocked by the firewall. Scans like this are often used to find open services.',
    notes: [{ author: 'Priya (Analyst)', time: '2026-11-08T08:10:00.000Z', text: 'Checking whether this IP appears in other firewall logs from last week.' }] },
  { id: 'ALT-1003', name: 'Multiple Failed Logins', sourceIp: '91.240.118.172', severity: 'High', riskScore: 77, status: 'Open',
    rule: 'RULE-001: More than 10 failed logins from one IP within 10 minutes',
    types: ['Failed Login', 'Brute Force Attempt'],
    explanation: 'Repeated failed logins were seen from an IP that is not part of the internal network.' },
  { id: 'ALT-1004', name: 'Suspicious IP Activity', sourceIp: '103.76.228.14', severity: 'Medium', riskScore: 62, status: 'Open',
    rule: 'RULE-005: External IP with events across several event types',
    types: ['Firewall Block', 'Failed Login', 'Port Scan'],
    explanation: 'This external IP triggered several different event types in one day, which is unusual for normal traffic.' },
  { id: 'ALT-1005', name: 'Unusual Login Time', sourceIp: '192.168.1.22', severity: 'Medium', riskScore: 55, status: 'Open',
    rule: 'RULE-004: Successful login outside 06:00-20:00 UTC',
    types: ['Unusual Login Time'],
    explanation: 'A successful login happened in the early morning, outside the normal working hours set in the detection rules.' },
  { id: 'ALT-1006', name: 'Privilege Escalation Attempt', sourceIp: '10.0.0.31', severity: 'Critical', riskScore: 90, status: 'Open',
    rule: 'RULE-006: Denied sudo or root command by a standard user',
    types: ['Privilege Escalation'],
    explanation: 'A standard user tried to open a root shell and was denied. This could be a mistake or an attempt to gain higher access.' },
  { id: 'ALT-1007', name: 'Port Scan Detected', sourceIp: '185.220.101.45', severity: 'High', riskScore: 79, status: 'Resolved',
    rule: 'RULE-002: Connection attempts to more than 15 ports from one IP',
    types: ['Port Scan'],
    explanation: 'Many blocked connection attempts to different ports were recorded from this IP.' },
  { id: 'ALT-1008', name: 'Repeated Firewall Blocks', sourceIp: '91.240.118.172', severity: 'Low', riskScore: 30, status: 'False Positive',
    rule: 'RULE-007: More than 5 firewall drops from one IP in one hour',
    types: ['Firewall Block'],
    explanation: 'The firewall dropped repeated UDP packets from one IP. Reviewed and judged to be background internet noise.' },
  { id: 'ALT-1009', name: 'Unusual Login Time', sourceIp: '10.0.0.8', severity: 'Medium', riskScore: 48, status: 'Resolved',
    rule: 'RULE-004: Successful login outside 06:00-20:00 UTC',
    types: ['Unusual Login Time'],
    explanation: 'A successful login was recorded outside normal hours. The user confirmed they were working a night shift.' },
  { id: 'ALT-1010', name: 'Brute Force Login Attempt', sourceIp: '45.155.205.233', severity: 'High', riskScore: 85, status: 'Investigating',
    rule: 'RULE-001: More than 10 failed logins from one IP within 10 minutes',
    types: ['Brute Force Attempt'],
    explanation: 'Many authentication failures for different usernames came from the same external IP.' },
  { id: 'ALT-1011', name: 'Multiple Failed Logins', sourceIp: '192.168.1.15', severity: 'Low', riskScore: 28, status: 'Resolved',
    rule: 'RULE-001: More than 10 failed logins from one IP within 10 minutes',
    types: ['Failed Login'],
    explanation: 'An internal workstation had several failed logins, most likely a mistyped password.' },
  { id: 'ALT-1012', name: 'Suspicious IP Activity', sourceIp: '185.220.101.45', severity: 'Critical', riskScore: 92, status: 'Open',
    rule: 'RULE-005: External IP with events across several event types',
    types: ['Failed Login', 'Brute Force Attempt', 'Port Scan', 'Firewall Block'],
    explanation: 'This IP was involved in logins, scans and firewall blocks. Several kinds of suspicious behaviour from one source raises the risk score.' },
];

// Link every alert to the logs that match its IP and event types.
export const mockAlerts = definitions.map((d) => {
  let related = mockLogs.filter((l) => l.sourceIp === d.sourceIp && d.types.includes(l.eventType));
  if (related.length === 0) related = mockLogs.filter((l) => l.sourceIp === d.sourceIp);
  if (related.length === 0) related = mockLogs.filter((l) => d.types.includes(l.eventType));
  related = related.slice(0, 6);
  const { types, ...rest } = d;
  return {
    notes: [],
    ...rest,
    logIds: related.map((l) => l.id),
    detectedAt: related.length ? related[0].timestamp : '2026-11-08T09:00:00.000Z',
  };
});

export const ALERT_STATUSES = ['Open', 'Investigating', 'Resolved', 'False Positive'];
