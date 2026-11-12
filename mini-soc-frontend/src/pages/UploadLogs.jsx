import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, UploadCloud, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { getUploadHistory, uploadLogFile } from '../services/api';
import { downloadCsv, fmtDateTime } from '../utils/format';

const REQUIRED_COLUMNS = ['timestamp', 'source_ip', 'event_type', 'username', 'status', 'severity'];
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

    // The progress bar is simulated because no backend is connected yet.
    let progress = 0;
    timerRef.current = setInterval(async () => {
      progress += 20;
      setCurrent((c) => (c ? { ...c, progress } : c));
      if (progress >= 100) {
        clearInterval(timerRef.current);
        try {
          await uploadLogFile(file);
          addHistory(file.name, result.rows, 'Processed');
          setMessage({ type: 'success', text: `${file.name} passed validation: ${result.rows} log rows found. (Demo mode: the file was checked in your browser and not stored.)` });
        } catch {
          addHistory(file.name, 0, 'Rejected');
          setMessage({ type: 'error', text: 'The upload failed. Check your connection and try again.' });
        }
        setCurrent(null);
      }
    }, 250);
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
      REQUIRED_COLUMNS.map((c) => ({ key: c, label: c })));

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
          </div>

          {current && (
            <div className="mt-5" aria-live="polite">
              <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                <span className="truncate pr-3">{current.name} ({(current.size / 1024).toFixed(1)} KB)</span>
                <span className="tabular-nums">{current.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${current.progress}%` }} /></div>
            </div>
          )}

          {message && (
            <div role="alert" className={`mt-5 flex items-start gap-3 rounded-md border p-3 text-sm ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
              <p className="flex-1">{message.text}</p>
              <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={16} /></button>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h3 className="card-title">Supported format</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>File type: .csv</li>
            <li>Maximum size: {MAX_SIZE_MB} MB</li>
            <li>First row must be a header row</li>
          </ul>
          <p className="label mt-4">Required columns</p>
          <div className="flex flex-wrap gap-1.5">
            {REQUIRED_COLUMNS.map((c) => <code key={c} className="rounded bg-raised px-2 py-1 font-mono text-xs text-cyan-200">{c}</code>)}
          </div>
          <button type="button" className="btn-ghost mt-5 w-full" onClick={downloadSample}><Download size={16} /> Download sample CSV</button>
        </section>

        <section className="card lg:col-span-3">
          <h3 className="card-title p-5 pb-2">Upload history</h3>
          <DataTable columns={columns} rows={history} pageSize={5} emptyMessage="No files uploaded yet." />
        </section>
      </div>
    </div>
  );
}
