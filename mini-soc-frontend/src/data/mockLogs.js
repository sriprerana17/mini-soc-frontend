// MOCK DATA - sample security logs for the frontend demo.
// Replace with real API responses later (see src/services/api.js).
// These are generated with a fixed seed so the data is the same on every reload.

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rand = makeRng(42);
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

export const ATTACKER_IPS = ['185.220.101.45', '45.155.205.233', '91.240.118.172', '103.76.228.14'];
const INTERNAL_IPS = ['192.168.1.15', '192.168.1.22', '10.0.0.8', '10.0.0.31', '172.16.4.9'];
const SERVERS = ['10.0.0.5', '10.0.0.12', '10.0.1.20', '10.0.2.8'];
const USERS = ['admin', 'jsmith', 'akumar', 'mlee', 'svc_backup', 'root', 'dbadmin'];

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const syslogTime = (d) =>
  `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, ' ')} ` +
  `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

// Each template describes one kind of event.
const TEMPLATES = [
  {
    weight: 30, eventType: 'Successful Login', status: 'Success', severity: 'Low', ips: INTERNAL_IPS,
    describe: (l) => `User ${l.username} authenticated successfully from ${l.sourceIp}.`,
    raw: (l, t, p) => `${t} srv-auth01 sshd[${p}]: Accepted publickey for ${l.username} from ${l.sourceIp} port ${int(40000, 60000)} ssh2`,
  },
  {
    weight: 22, eventType: 'Failed Login', status: 'Failed', severity: 'Medium', ips: [...INTERNAL_IPS, ...ATTACKER_IPS],
    describe: (l) => `Failed password attempt for ${l.username} from ${l.sourceIp}.`,
    raw: (l, t, p) => `${t} srv-auth01 sshd[${p}]: Failed password for ${l.username} from ${l.sourceIp} port ${int(40000, 60000)} ssh2`,
  },
  {
    weight: 12, eventType: 'Brute Force Attempt', status: 'Failed', severity: 'High', ips: ATTACKER_IPS,
    describe: (l) => `Multiple failed login attempts for ${l.username} from ${l.sourceIp} within a short window.`,
    raw: (l, t, p) => `${t} srv-auth01 sshd[${p}]: PAM ${int(5, 12)} more authentication failures; user=${l.username} rhost=${l.sourceIp}`,
  },
  {
    weight: 10, eventType: 'Port Scan', status: 'Blocked', severity: 'High', ips: ATTACKER_IPS,
    describe: (l) => `Sequential connection attempts to ${int(15, 60)} ports on ${l.destinationIp} from ${l.sourceIp}.`,
    raw: (l, t) => `${t} fw-edge01 kernel: [UFW BLOCK] IN=eth0 SRC=${l.sourceIp} DST=${l.destinationIp} PROTO=TCP DPT=${pick([22, 23, 80, 443, 3306, 3389, 8080])} SYN`,
  },
  {
    weight: 6, eventType: 'Unusual Login Time', status: 'Success', severity: 'Medium', ips: INTERNAL_IPS,
    describe: (l) => `User ${l.username} logged in outside of normal working hours (03:00 UTC range).`,
    raw: (l, t, p) => `${t} srv-vpn01 openvpn[${p}]: ${l.username}/${l.sourceIp} authenticated; session established`,
  },
  {
    weight: 3, eventType: 'Privilege Escalation', status: 'Blocked', severity: 'Critical', ips: INTERNAL_IPS,
    describe: (l) => `User ${l.username} attempted to run a command as root and was denied.`,
    raw: (l, t) => `${t} srv-app02 sudo: ${l.username} : command not allowed ; USER=root ; COMMAND=/bin/bash`,
  },
  {
    weight: 10, eventType: 'Firewall Block', status: 'Blocked', severity: 'Low', ips: ATTACKER_IPS,
    describe: (l) => `Inbound connection from ${l.sourceIp} blocked by firewall policy.`,
    raw: (l, t) => `${t} fw-edge01 kernel: [FW DROP] SRC=${l.sourceIp} DST=${l.destinationIp} PROTO=UDP DPT=${pick([53, 123, 161, 1900])}`,
  },
  {
    weight: 7, eventType: 'File Access', status: 'Success', severity: 'Low', ips: INTERNAL_IPS,
    describe: (l) => `User ${l.username} accessed /srv/shared/finance/report.xlsx.`,
    raw: (l, t) => `${t} srv-file01 smbd[2210]: ${l.username}@${l.sourceIp} opened file finance/report.xlsx (read)`,
  },
];

const weighted = TEMPLATES.flatMap((t) => Array(t.weight).fill(t));

const BASE_TIME = Date.UTC(2026, 10, 8, 9, 30, 0); // 8 Nov 2026 09:30 UTC

export const mockLogs = Array.from({ length: 80 }, (_, i) => {
  const t = pick(weighted);
  const when = new Date(BASE_TIME - i * 37 * 60 * 1000 - int(0, 59) * 1000);
  if (t.eventType === 'Unusual Login Time') when.setUTCHours(3);

  const log = {
    id: `EVT-${String(5000 - i)}`,
    timestamp: when.toISOString(),
    sourceIp: pick(t.ips),
    destinationIp: pick(SERVERS),
    username: pick(USERS),
    eventType: t.eventType,
    status: t.status,
    severity: t.severity,
  };
  log.description = t.describe(log);
  log.rawLog = t.raw(log, syslogTime(when), int(1000, 9999));
  return log;
});

export const EVENT_TYPES = TEMPLATES.map((t) => t.eventType);
export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
