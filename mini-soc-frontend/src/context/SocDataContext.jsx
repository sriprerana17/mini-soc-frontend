// Loads logs, alerts and analytics once and shares them with every page.
// Alert status changes and notes are kept here so the list page and the
// details page always show the same information.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getLogs, getAlerts, getAnalytics, updateAlertStatus, addAlertNote } from '../services/api';

const SocDataContext = createContext(null);

export function SocDataProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getLogs(), getAlerts(), getAnalytics()])
      .then(([l, a, d]) => {
        setLogs(l);
        setAlerts(a);
        setAnalytics(d);
      })
      .catch(() => setError('Could not load data. Check that the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  const setAlertStatus = useCallback((id, status) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    updateAlertStatus(id, status).catch(() => setError('Could not save the alert status.'));
  }, []);

  const addNote = useCallback((id, text, author) => {
    const note = { author, time: new Date().toISOString(), text };
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, notes: [...a.notes, note] } : a)));
    addAlertNote(id, note).catch(() => setError('Could not save the note.'));
  }, []);

  const value = { logs, alerts, analytics, loading, error, setAlertStatus, addNote };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading MiniSOC data...
      </div>
    );
  }
  return <SocDataContext.Provider value={value}>{children}</SocDataContext.Provider>;
}

export function useSocData() {
  const ctx = useContext(SocDataContext);
  if (!ctx) throw new Error('useSocData must be used inside SocDataProvider');
  return ctx;
}
