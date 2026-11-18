import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, UploadCloud, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { getUploadHistory, uploadLogFile } from '../services/api';
import { downloadCsv, fmtDateTime } from '../utils/format';

const REQUIRED_COLUMNS = ['source_ip', 'event_type'];
const SAMPLE_COLUMNS = ['timestamp', 'source_ip', 'event_type', 'username', 'status', 'severity'];
const MAX_SIZE_MB = 5;

// Basic validation: file type, size, and the header row of the CSV.
async function validateCsv(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) return { error: 'Only .csv files are supported. Export your logs as CSV and try again.' };
  if (file.size === 0) return { error: 'The file is empty.' };
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return { error: `The file is larger than ${MAX_SIZE_MB} MB. Split it into smaller files.` };

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) return { error: `Missing required columns: ${missing.join(', ')}.` };
  if (lines.length < 2) return { error: 'The file has a header row but no log rows.' };
  return { rows: lines.length - 1 };
}

export default function UploadLogs() {
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const { refreshData } = useSocData();
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null); // { name, size, progress }
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  useEffect(() => {
    getUploadHistory().then(setHistory);
    return () => clearInterval(timerRef.current);
  }, []);

  const addHistory = (fileName, rows, status) =>
    setHistory((h) => [{ id: `UP-${Date.now()}`, fileName, rows, uploadedAt: new Date().toISOString(), status }, ...h]);

  const handleFile = async (file) => {
    if (!file) return;
    clearInterval(timerRef.current);
    setMessage(null);
    setCurrent({ name: file.name, size: file.size, progress: 0 });

    const result = await validateCsv(file);
    if (result.error) {
      setCurrent(null);
      setMessage({ type: 'error', text: result.error });
      addHistory(file.name, 0, 'Rejected');
      return;
    }

    let progress = 0;
    timerRef.current = setInterval(async () => {
      progress += 25;
      setCurrent((c) => (c ? { ...c, progress } : c));
      if (progress >= 100) {
        clearInterval(timerRef.current);
        try {
          const res = await uploadLogFile(file);
          addHistory(file.name, result.rows, 'Processed');
          getUploadHistory().then(setHistory);
          setMessage({
            type: 'success',
            text: `${file.name} uploaded successfully! ${result.rows} logs stored in database${res?.new_alerts?.length ? ` (${res.new_alerts.length} alert(s) generated)` : ''}.`,
          });
          if (refreshData) {
            refreshData();
          }
        } catch {
          addHistory(file.name, 0, 'Rejected');
          setMessage({ type: 'error', text: 'The upload failed. Check your connection to the backend and try again.' });
        }
        setCurrent(null);
      }
    }, 200);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onBrowse = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = ''; // allows choosing the same file again
  };

  const downloadSample = () =>
    downloadCsv('sample_logs.csv',
      [
        { timestamp: '2026-11-08T09:30:12Z', source_ip: '45.155.205.233', event_type: 'Port Scan', username: 'unknown', status: 'Blocked', severity: 'High' },
        { timestamp: '2026-11-08T09:12:40Z', source_ip: '192.168.1.15', event_type: 'Successful Login', username: 'jsmith', status: 'Success', severity: 'Low' },
        { timestamp: '2026-11-08T08:55:03Z', source_ip: '185.220.101.45', event_type: 'Failed Login', username: 'admin', status: 'Failed', severity: 'Medium' },
      ],
      SAMPLE_COLUMNS.map((c) => ({ key: c, label: c })));

  const columns = [
    { key: 'fileName', label: 'File name', render: (u) => <span className="flex items-center gap-2 text-slate-100"><FileText size={15} className="text-slate-500" />{u.fileName}</span> },
    { key: 'rows', label: 'Rows', className: 'tabular-nums' },
    { key: 'uploadedAt', label: 'Uploaded', render: (u) => <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(u.uploadedAt)}</span> },
    { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Upload logs" description="Add security logs from a CSV file. The file is checked before it is accepted." />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? 'border-cyan-400 bg-cyan-500/5' : 'border-line'}`}
          >
            <UploadCloud size={36} className="text-cyan-300" />
            <p className="mt-3 text-sm text-slate-100">Drag and drop a CSV file here</p>
            <p className="mt-1 text-xs text-slate-500">or</p>
            <button type="button" className="btn-primary mt-3" onClick={() => inputRef.current?.click()} disabled={!!current}>Browse files</button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onBrowse} />
            <p className="mt-3 text-xs text-slate-500">Max size: {MAX_SIZE_MB} MB. Required columns: {REQUIRED_COLUMNS.join(', ')}</p>
          </div>

          {current && (
            <div className="mt-4 rounded-md border border-line bg-raised p-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Uploading {current.name}</span>
                <span>{current.progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${current.progress}%` }} />
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
              <span className="flex-1">{message.text}</span>
              <button type="button" onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-100"><X size={14} /></button>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h3 className="card-title">CSV format reference</h3>
          <p className="mt-1 text-xs text-slate-400">Files must include these header names:</p>
          <ul className="mt-3 space-y-1.5 font-mono text-xs text-slate-300">
            {REQUIRED_COLUMNS.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">Optional columns: {SAMPLE_COLUMNS.filter(c => !REQUIRED_COLUMNS.includes(c)).join(', ')}</p>
          <button type="button" className="btn-ghost mt-4 w-full justify-center" onClick={downloadSample}>
            <Download size={15} /> Download sample CSV
          </button>
        </section>

        <section className="card lg:col-span-3">
          <h3 className="card-title p-5 pb-2">Upload history</h3>
          <DataTable columns={columns} rows={history} emptyMessage="No log files have been uploaded yet." />
        </section>
      </div>
    </div>
  );
}
