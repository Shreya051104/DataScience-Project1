import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowRight,
  LogOut,
  Pill,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

function getErrorMessage(error) {
  return error.response?.data?.error || 'Unable to connect to the server. Please try again.';
}

function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });
      onAuthenticated(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="brand-mark"><Pill size={23} /></div>
        <p className="eyebrow">PHARMAOPTIMA</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-copy">
          Sign in to securely manage your medicine inventory and patient records.
        </p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {mode === 'register' && <small>Use at least 8 characters.</small>}
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={submitting}>
            {submitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'New to PharmaOptima?' : 'Already have an account?'}
          <button
            className="text-button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            type="button"
          >
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        <p className="secure-note"><ShieldCheck size={15} /> Passwords are securely encrypted.</p>
      </section>
    </main>
  );
}

function EntryDialog({ type, onClose, onSave, csrfToken }) {
  const isMedicine = type === 'medicine';
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      const { data } = await api.post(
        isMedicine ? '/medicines' : '/patients',
        payload,
        { headers: { 'X-CSRF-Token': csrfToken } },
      );
      onSave(data);
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">NEW RECORD</p>
            <h2 id="dialog-title">Add {isMedicine ? 'medicine' : 'patient'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="form-stack" onSubmit={submit}>
          {isMedicine ? (
            <>
              <label>Medicine name<input name="name" required maxLength="120" /></label>
              <div className="form-row">
                <label>Batch number<input name="batch_number" required maxLength="80" /></label>
                <label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label>
              </div>
              <div className="form-row">
                <label>Expiry date<input name="expiry_date" type="date" required /></label>
                <label>Category<input name="category" maxLength="80" /></label>
              </div>
            </>
          ) : (
            <>
              <label>Patient name<input name="name" required maxLength="120" /></label>
              <div className="form-row">
                <label>Age<input name="age" type="number" min="0" max="120" step="1" /></label>
                <label>Contact<input name="contact" type="tel" maxLength="80" /></label>
              </div>
              <label>Condition or notes<textarea name="condition" rows="3" maxLength="500" /></label>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save record'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [today, setToday] = useState('');
  const [pageError, setPageError] = useState('');
  const [data, setData] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [regionFilter, setRegionFilter] = useState('All');
  const [therapeuticFilter, setTherapeuticFilter] = useState('All');
  const [entryType, setEntryType] = useState('');

  const loadDashboard = useCallback(async () => {
    const [drugResponse, medicineResponse, patientResponse] = await Promise.all([
      api.get('/drugs'),
      api.get('/medicines'),
      api.get('/patients'),
    ]);
    setData(drugResponse.data);
    setMedicines(medicineResponse.data);
    setPatients(patientResponse.data);
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then(async ({ data: authData }) => {
        if (!active) return;
        setUser(authData.email);
        setCsrfToken(authData.csrfToken);
        await loadDashboard();
      })
      .catch((error) => {
        if (error.response?.status !== 401 && active) setPageError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, [loadDashboard]);

  useEffect(() => {
    let timeoutId;
    const refreshToday = () => {
      const currentDate = new Date();
      const localDate = [
        currentDate.getFullYear(),
        String(currentDate.getMonth() + 1).padStart(2, '0'),
        String(currentDate.getDate()).padStart(2, '0'),
      ].join('-');
      setToday(localDate);
      const nextMidnight = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + 1,
      );
      timeoutId = window.setTimeout(refreshToday, nextMidnight.getTime() - currentDate.getTime());
    };
    refreshToday();
    return () => window.clearTimeout(timeoutId);
  }, []);

  const expiringMedicines = medicines
    .map((medicine) => ({
      ...medicine,
      daysLeft: today
        ? Math.round(
          (Date.parse(`${medicine.expiry_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`))
          / 86400000,
        )
        : Infinity,
    }))
    .filter((medicine) => medicine.daysLeft <= 90)
    .sort((first, second) => first.daysLeft - second.daysLeft);

  const filteredData = data.filter((item) => {
    const matchesRegion = regionFilter === 'All' || item.region === regionFilter;
    const matchesArea = therapeuticFilter === 'All' || item.therapeutic_area === therapeuticFilter;
    return matchesRegion && matchesArea;
  });

  const totalRevenue = filteredData.reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0);
  const avgMarketShare = filteredData.length
    ? (filteredData.reduce((sum, item) => sum + (Number(item.market_share) || 0), 0) / filteredData.length).toFixed(1)
    : '0.0';
  const totalMarketing = filteredData.reduce((sum, item) => sum + (Number(item.marketing_spend) || 0), 0);
  const totalAlerts = filteredData.reduce((sum, item) => sum + (Number(item.adverse_events) || 0), 0);

  function handleAuthenticated(authData) {
    setUser(authData.email);
    setCsrfToken(authData.csrfToken);
    setPageError('');
    loadDashboard().catch((error) => setPageError(getErrorMessage(error)));
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout', {}, { headers: { 'X-CSRF-Token': csrfToken } });
      setUser(null);
      setData([]);
      setMedicines([]);
      setPatients([]);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  if (authLoading) {
    return <main className="loading-screen"><div className="loading-dot" />Checking your session…</main>;
  }

  if (!user) {
    return (
      <>
        {pageError && <div className="connection-banner" role="alert">{pageError}</div>}
        <LoginPage onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Pill size={21} /></div>
          <div>
            <h1>PharmaOptima</h1>
            <p>Pharmaceutical intelligence</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="user-email">{user}</span>
          <button className="button button-secondary logout-button" onClick={handleLogout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="dashboard">
        {pageError && <div className="connection-banner" role="alert">{pageError}</div>}
        <section className="page-heading">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h2>Good to see you</h2>
            <p className="muted">Monitor performance, inventory expiry, and patient records.</p>
          </div>
          <div className="heading-actions">
            <button className="button button-secondary" onClick={() => setEntryType('patient')}>
              <Users size={17} /> Add patient
            </button>
            <button className="button button-primary" onClick={() => setEntryType('medicine')}>
              <Plus size={17} /> Add medicine
            </button>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-label">Total revenue</span>
            <strong>${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            <span className="stat-caption">Across filtered dataset</span>
          </article>
          <article className="stat-card">
            <span className="stat-label">Average market share</span>
            <strong>{avgMarketShare}%</strong>
            <span className="stat-caption">Across filtered dataset</span>
          </article>
          <article className="stat-card">
            <span className="stat-label">Marketing spend</span>
            <strong>${totalMarketing.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            <span className="stat-caption">Across filtered dataset</span>
          </article>
          <article className="stat-card">
            <span className="stat-label">Adverse events</span>
            <strong>{totalAlerts.toLocaleString()}</strong>
            <span className="stat-caption">Reported in filtered dataset</span>
          </article>
        </section>

        <section className="section-card expiry-section">
          <div className="section-heading">
            <div className="section-title">
              <span className={`section-icon ${expiringMedicines.length ? 'warning-icon' : 'success-icon'}`}>
                <AlertTriangle size={18} />
              </span>
              <div>
                <h3>Expiry alerts</h3>
                <p className="muted">Medicines expiring within 90 days or already expired</p>
              </div>
            </div>
            <span className={`count-pill ${expiringMedicines.length ? 'count-warning' : 'count-ok'}`}>
              {expiringMedicines.length} {expiringMedicines.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
          {expiringMedicines.length ? (
            <div className="alert-list">
              {expiringMedicines.map((medicine) => (
                <article className="alert-row" key={medicine.id}>
                  <div className="medicine-icon"><Pill size={17} /></div>
                  <div className="alert-details">
                    <strong>{medicine.name}</strong>
                    <span>Batch {medicine.batch_number} · {medicine.quantity} units · Expires {medicine.expiry_date}</span>
                  </div>
                  <span className={`expiry-status ${medicine.daysLeft < 0 ? 'expired' : 'expiring'}`}>
                    {medicine.daysLeft < 0
                      ? `Expired ${Math.abs(medicine.daysLeft)} days ago`
                      : medicine.daysLeft === 0 ? 'Expires today' : `${medicine.daysLeft} days left`}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ShieldCheck size={21} />
              <span>No medicines are nearing expiry.</span>
            </div>
          )}
        </section>

        <section className="charts-grid">
          <article className="section-card chart-card">
            <div className="chart-heading">
              <div><h3>Revenue by drug</h3><p className="muted">Sample of up to 10 records</p></div>
              <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} aria-label="Filter by region">
                <option value="All">All regions</option>
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="APAC">APAC</option>
                <option value="LATAM">LATAM</option>
              </select>
            </div>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf4" />
                  <XAxis dataKey="drug_name" stroke="#8993a4" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8993a4" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="total_revenue" fill="#4779f5" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="section-card chart-card">
            <div className="chart-heading">
              <div><h3>Market share</h3><p className="muted">Share percentage by drug</p></div>
              <select value={therapeuticFilter} onChange={(event) => setTherapeuticFilter(event.target.value)} aria-label="Filter by therapeutic area">
                <option value="All">All areas</option>
                {['Oncology', 'Cardiology', 'Diabetes', 'Pulmonology', 'Neurology', 'Rheumatology'].map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf4" />
                  <XAxis dataKey="drug_name" stroke="#8993a4" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8993a4" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="market_share" stroke="#19a985" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="section-card inventory-section">
          <div className="section-heading">
            <div><h3>Medicine inventory</h3><p className="muted">{medicines.length} records · {expiringMedicines.length} expiry alerts</p></div>
            <button className="button button-secondary compact-button" onClick={() => setEntryType('medicine')}>
              <Plus size={16} /> Add medicine
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Medicine</th><th>Batch</th><th>Category</th><th>Quantity</th><th>Expiry date</th><th>Status</th></tr></thead>
              <tbody>
                {medicines.length ? medicines.map((medicine) => {
                  const alert = expiringMedicines.some((item) => item.id === medicine.id);
                  return (
                    <tr key={medicine.id}>
                      <td className="primary-cell">{medicine.name}</td>
                      <td>{medicine.batch_number}</td>
                      <td>{medicine.category || '—'}</td>
                      <td>{medicine.quantity.toLocaleString()}</td>
                      <td>{medicine.expiry_date}</td>
                      <td><span className={`table-status ${alert ? 'status-warning' : 'status-ok'}`}>{alert ? 'Check expiry' : 'In date'}</span></td>
                    </tr>
                  );
                }) : <tr><td colSpan="6" className="table-empty">No medicine records yet. Add a medicine to start tracking stock.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-card inventory-section patient-section">
          <div className="section-heading">
            <div><h3>Patient records</h3><p className="muted">{patients.length} records</p></div>
            <button className="button button-secondary compact-button" onClick={() => setEntryType('patient')}>
              <Plus size={16} /> Add patient
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Patient</th><th>Age</th><th>Contact</th><th>Condition or notes</th></tr></thead>
              <tbody>
                {patients.length ? patients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="primary-cell">{patient.name}</td>
                    <td>{patient.age ?? '—'}</td>
                    <td>{patient.contact || '—'}</td>
                    <td>{patient.condition || '—'}</td>
                  </tr>
                )) : <tr><td colSpan="4" className="table-empty">No patient records yet. Add a patient to get started.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-card inventory-section analytics-section">
          <div className="section-heading">
            <div><h3>Drug analytics dataset</h3><p className="muted">Showing {filteredData.length} filtered records</p></div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Drug ID</th><th>Drug name</th><th>Therapeutic area</th><th>Region</th><th>Revenue</th><th>Market share</th></tr></thead>
              <tbody>
                {filteredData.slice(0, 100).map((row, index) => (
                  <tr key={`${row.drug_id}-${index}`}>
                    <td>{row.drug_id}</td><td className="primary-cell">{row.drug_name}</td>
                    <td>{row.therapeutic_area}</td><td>{row.region}</td>
                    <td>${Number(row.total_revenue || 0).toLocaleString()}</td><td>{row.market_share}%</td>
                  </tr>
                ))}
                {!filteredData.length && <tr><td colSpan="6" className="table-empty">No analytics records match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          {filteredData.length > 100 && <p className="table-footnote">Showing first 100 of {filteredData.length} records.</p>}
        </section>
      </main>
      {entryType && (
        <EntryDialog
          type={entryType}
          csrfToken={csrfToken}
          onClose={() => setEntryType('')}
          onSave={(record) => {
            if (entryType === 'medicine') setMedicines((current) => [...current, record]);
            else setPatients((current) => [record, ...current]);
          }}
        />
      )}
    </div>
  );
}

export default App;
