import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  UploadCloud,
  X,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { getUploadHistory, uploadLogFile } from '../services/api';
import { downloadCsv, fmtDateTime } from '../utils/format';

const MAX_SIZE_MB = 10;

const SOURCE_IP_ALIASES = new Set([
  'sourceip', 'source_ip', 'srcip', 'src_ip', 'src', 'source', 'sourcehost',
  'sourceaddress', 'clientip', 'client_ip', 'remoteip', 'remote_ip', 'ip',
  'ipaddress', 'hostip', 'host_ip', 'originip', 'origin_ip', 'source_ip_address'
]);

const EVENT_TYPE_ALIASES = new Set([
  'eventtype', 'event_type', 'event', 'eventname', 'action', 'activity',
  'type', 'logtype', 'eventdescription', 'category', 'signature', 'event_action'
]);

function normalizeCol(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Client-side quick pre-validation that mirrors backend resilience
async function validateCsvFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { error: 'Only .csv files are supported. Please export your security logs as CSV.' };
  }
  if (file.size === 0) {
    return { error: 'The selected CSV file is completely empty (0 bytes).' };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { error: `File size exceeds ${MAX_SIZE_MB} MB limit. Please split the log export into smaller batches.` };
  }

  const rawText = await file.text();
  const cleanText = rawText.replace(/^\ufeff/, '').trim();
  if (!cleanText) {
    return { error: 'The file contains no readable text or rows.' };
  }

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { error: 'The CSV file must contain a header row and at least one log row.' };
  }

  // Parse header row
  const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const normHeaders = rawHeaders.map(normalizeCol);

  const hasSourceIp = normHeaders.some((h) => SOURCE_IP_ALIASES.has(h));
  const hasEventType = normHeaders.some((h) => EVENT_TYPE_ALIASES.has(h));

  if (!hasSourceIp || !hasEventType) {
    const missing = [];
    if (!hasSourceIp) missing.push('Source IP (e.g. source_ip, IP, src_ip, Client IP)');
    if (!hasEventType) missing.push('Event Type (e.g. event_type, Action, Event, Activity)');
    return { error: `Missing required columns: ${missing.join(' and ')}.` };
  }

  return { totalRows: lines.length - 1 };
}

export default function UploadLogs() {
  const inputRef = useRef(null);
  const { refreshData } = useSocData();
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchHistory = () => {
    getUploadHistory().then(setHistory).catch(() => {});
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setErrorMessage(null);
    setUploadResult(null);
    setCurrentFile({ name: file.name, size: file.size });

    // Validate client side
    const validation = await validateCsvFile(file);
    if (validation.error) {
      setErrorMessage(validation.error);
      setCurrentFile(null);
      return;
    }

    setUploading(true);
    try {
      const res = await uploadLogFile(file);
      setUploadResult({
        fileName: file.name,
        uploadedLogs: res.uploaded_logs ?? 0,
        skippedDuplicates: res.skipped_duplicates ?? 0,
        rejectedRows: res.rejected_rows || [],
        newAlerts: res.new_alerts || [],
        message: res.message,
      });

      fetchHistory();
      if (refreshData) {
        refreshData();
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let text = 'The upload failed. Please verify your connection to the FastAPI backend.';
      if (typeof detail === 'string') {
        text = detail;
      } else if (Array.isArray(detail)) {
        text = detail.map((d) => d.msg || d).join(', ');
      } else if (err.message) {
        text = err.message;
      }
      setErrorMessage(text);
    } finally {
      setUploading(false);
      setCurrentFile(null);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onBrowse = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const downloadSample = () => {
    downloadCsv(
      'sample_security_logs.csv',
      [
        { timestamp: '2026-11-19T09:30:12Z', source_ip: '45.155.205.233', event_type: 'Port Scan', username: 'unknown', status: 'Blocked', severity: 'High', details: 'SYN probe on port 22' },
        { timestamp: '2026-11-19T09:12:40Z', source_ip: '192.168.1.15', event_type: 'Successful Login', username: 'jsmith', status: 'Success', severity: 'Low', details: 'Accepted SSH key from host' },
        { timestamp: '2026-11-19T08:55:03Z', source_ip: '185.220.101.45', event_type: 'Failed Login', username: 'admin', status: 'Failed', severity: 'Medium', details: 'Invalid password attempted' },
        { timestamp: '2026-11-19T08:55:05Z', source_ip: '185.220.101.45', event_type: 'Failed Login', username: 'root', status: 'Failed', severity: 'Medium', details: 'Invalid password attempted' },
        { timestamp: '2026-11-19T08:55:08Z', source_ip: '185.220.101.45', event_type: 'Failed Login', username: 'admin', status: 'Failed', severity: 'Medium', details: 'Invalid password attempted' },
      ],
      [
        { key: 'timestamp', label: 'timestamp' },
        { key: 'source_ip', label: 'source_ip' },
        { key: 'event_type', label: 'event_type' },
        { key: 'username', label: 'username' },
        { key: 'status', label: 'status' },
        { key: 'severity', label: 'severity' },
        { key: 'details', label: 'details' },
      ]
    );
  };

  const columns = [
    {
      key: 'fileName',
      label: 'File Name',
      render: (u) => (
        <span className="flex items-center gap-2 text-slate-100 font-medium">
          <FileText size={15} className="text-twilight-cyan" />
          {u.fileName}
        </span>
      ),
    },
    { key: 'rows', label: 'Imported Rows', className: 'tabular-nums font-mono text-xs' },
    {
      key: 'uploadedAt',
      label: 'Upload Timestamp',
      render: (u) => <span className="whitespace-nowrap text-xs text-slate-400 font-mono">{fmtDateTime(u.uploadedAt)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => <StatusBadge status={u.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Security Logs"
        description="Ingest telemetry from CSV files into SQLite. Supports canonical aliases (Source IP, Action, Timestamp, Details) and automatically triggers detection rules."
      />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dropzone & Upload Panel */}
        <section className="card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="card-title text-base">
              <UploadCloud size={18} className="text-twilight-cyan" />
              CSV Ingestion Engine
            </h2>
            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex items-center gap-1.5 text-xs text-twilight-cyan hover:text-cyan-300 hover:underline"
            >
              <Download size={13} /> Download Sample CSV
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
              dragging
                ? 'border-twilight-cyan bg-twilight-cyan/10 shadow-glow-cyan'
                : 'border-line hover:border-twilight-cyan/40 bg-raised/30'
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-twilight-cyan/20 to-twilight-violet/20 border border-twilight-cyan/30 text-twilight-cyan shadow-glow-cyan">
              <UploadCloud size={28} />
            </div>

            <p className="mt-4 text-sm font-medium text-slate-100">
              Drag & drop your CSV log file here
            </p>
            <p className="mt-1 text-xs text-slate-400">
              or select a file from your local workstation
            </p>

            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Ingesting Logs...
                </>
              ) : (
                'Browse Files'
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onBrowse}
            />

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
              <span className="rounded bg-panel px-2 py-0.5 border border-line">Max: {MAX_SIZE_MB} MB</span>
              <span className="rounded bg-panel px-2 py-0.5 border border-line">Required: Source IP, Event Type</span>
              <span className="rounded bg-panel px-2 py-0.5 border border-line">Optional: Timestamp, Username, Details</span>
            </div>
          </div>

          {/* Active Upload Indicator */}
          {uploading && currentFile && (
            <div className="rounded-lg border border-twilight-cyan/40 bg-twilight-cyan/10 p-4">
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span className="flex items-center gap-2 font-medium">
                  <RefreshCw size={14} className="animate-spin text-twilight-cyan" />
                  Processing {currentFile.name}...
                </span>
                <span className="font-mono text-twilight-cyan">Validating & Ingesting</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-gradient-to-r from-twilight-cyan to-twilight-violet animate-pulse w-full" />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-twilight-pink/40 bg-twilight-pink/15 p-4 text-xs text-rose-200">
              <AlertCircle size={18} className="shrink-0 text-twilight-pink mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">Upload Error</p>
                <p className="mt-1 leading-relaxed">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Dismiss error"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Success Banner & Breakdown */}
          {uploadResult && (
            <div className="space-y-3 rounded-xl border border-twilight-emerald/40 bg-twilight-emerald/10 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 size={18} />
                  <span>{uploadResult.fileName} successfully ingested</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadResult(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase">New Logs</span>
                  <span className="text-base font-bold text-twilight-cyan">{uploadResult.uploadedLogs}</span>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase">Duplicates Skipped</span>
                  <span className="text-base font-bold text-slate-300">{uploadResult.skippedDuplicates}</span>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase">Rejected Rows</span>
                  <span className={`text-base font-bold ${uploadResult.rejectedRows.length > 0 ? 'text-twilight-pink' : 'text-slate-400'}`}>
                    {uploadResult.rejectedRows.length}
                  </span>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase">Alerts Triggered</span>
                  <span className={`text-base font-bold ${uploadResult.newAlerts.length > 0 ? 'text-twilight-violet' : 'text-slate-400'}`}>
                    {uploadResult.newAlerts.length}
                  </span>
                </div>
              </div>

              {/* Rejected rows list */}
              {uploadResult.rejectedRows.length > 0 && (
                <div className="mt-3 rounded-lg border border-twilight-pink/30 bg-panel p-3">
                  <p className="text-xs font-semibold text-twilight-pink flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Rejected Rows Breakdown:
                  </p>
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs text-slate-300">
                    {uploadResult.rejectedRows.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-rose-300">Row {r.row}</span>
                        <span>{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Guidelines / Alias Mapping Card */}
        <section className="card p-6 space-y-4">
          <h2 className="card-title text-base border-b border-line pb-3">
            <FileCheck size={18} className="text-twilight-violet" />
            Column Mapping Reference
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            The SOC ingestion parser automatically maps diverse column names from firewall, proxy, and auth logs:
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="rounded-lg border border-line bg-raised/50 p-2.5">
              <span className="text-twilight-cyan font-semibold block">Source IP (Required)</span>
              <p className="text-[11px] text-slate-400 mt-1">
                source_ip, ip, src_ip, src, client_ip, host_ip, origin_ip
              </p>
            </div>

            <div className="rounded-lg border border-line bg-raised/50 p-2.5">
              <span className="text-twilight-violet font-semibold block">Event Type (Required)</span>
              <p className="text-[11px] text-slate-400 mt-1">
                event_type, action, event, activity, type, signature
              </p>
            </div>

            <div className="rounded-lg border border-line bg-raised/50 p-2.5">
              <span className="text-twilight-emerald font-semibold block">Timestamp (Optional)</span>
              <p className="text-[11px] text-slate-400 mt-1">
                timestamp, time, date, datetime, log_time (ISO or YYYY-MM-DD HH:MM:SS)
              </p>
            </div>

            <div className="rounded-lg border border-line bg-raised/50 p-2.5">
              <span className="text-twilight-amber font-semibold block">Context (Optional)</span>
              <p className="text-[11px] text-slate-400 mt-1">
                username, user, destination_ip, status, details, message
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Upload History Table */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
          <div>
            <h2 className="card-title text-base">Upload Audit History</h2>
            <p className="text-xs text-slate-400">Previous batch ingestion events stored in SQLite</p>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="btn-ghost !py-1.5 !px-3 text-xs"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <DataTable
          columns={columns}
          rows={history}
          pageSize={6}
          defaultSort={{ key: 'uploadedAt', dir: 'desc' }}
        />
      </section>
    </div>
  );
}
