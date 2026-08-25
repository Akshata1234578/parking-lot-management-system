import { useEffect, useEffectEvent, useState } from 'react'
import './App.css'

const initialSlots = { bike: { total: 5, available: 5 }, car: { total: 5, available: 5 }, truck: { total: 2, available: 2 } }

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('parking-token'))
  const [login, setLogin] = useState({ username: 'admin', password: '' })
  const [slots, setSlots] = useState(initialSlots)
  const [active, setActive] = useState([])
  const [history, setHistory] = useState([])
  const [parkForm, setParkForm] = useState({ vehicleNumber: '', vehicleType: 'CAR' })
  const [exitForm, setExitForm] = useState({ ticketId: '', vehicleNumber: '' })
  const [result, setResult] = useState(null)
  const [notice, setNotice] = useState(null)

  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Request failed')
    return data
  }

  async function loadData() {
    const [slotData, activeData, historyData] = await Promise.all([api('/api/parking/slots'), api('/api/parking/active'), api('/api/parking/history')])
    setSlots(slotData.slots || initialSlots)
    setActive(activeData.records || [])
    setHistory(historyData.records || [])
  }

  const refreshOnLogin = useEffectEvent(() => loadData().catch((error) => setNotice({ type: 'error', text: error.message })))
  useEffect(() => { if (token) queueMicrotask(refreshOnLogin) }, [token])

  async function submitLogin(event) {
    event.preventDefault()
    try { const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(login) }); localStorage.setItem('parking-token', data.token); setToken(data.token); setNotice(null) } catch (error) { setNotice({ type: 'error', text: error.message }) }
  }

  async function submitPark(event) {
    event.preventDefault()
    try { const data = await api('/api/parking/park', { method: 'POST', body: JSON.stringify(parkForm) }); setResult({ type: 'park', ticket: data.ticket }); setNotice({ type: 'success', text: `Ticket ${data.ticket.ticket_id} assigned to ${data.ticket.slot_number}` }); setParkForm({ ...parkForm, vehicleNumber: '' }); await loadData() } catch (error) { setNotice({ type: 'error', text: error.message }) }
  }

  async function submitExit(event) {
    event.preventDefault()
    try { const data = await api('/api/parking/exit', { method: 'POST', body: JSON.stringify(exitForm) }); setResult({ type: 'exit', ticket: data.ticket }); setNotice({ type: 'success', text: `Exited ${data.ticket.vehicle_number} for ₹${data.ticket.fare}` }); setExitForm({ ticketId: '', vehicleNumber: '' }); await loadData() } catch (error) { setNotice({ type: 'error', text: error.message }) }
  }

  const formatTime = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  if (!token) return <main className="login-shell"><div className="login-box"><p className="eyebrow">PARKSIDE / LOT 01</p><h1>Control room access</h1><p className="muted">Sign in to manage arrivals, exits, and capacity.</p><form onSubmit={submitLogin}><label>Username<input required value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} /></label><label>Password<input required type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></label><button className="primary">Sign in <span>→</span></button></form>{notice && <div className="notice error">{notice.text}</div>}<p className="login-hint">Development account: admin / change-me-now</p></div></main>

  return <main className="shell">
    <header className="topbar"><div><p className="eyebrow">OPERATIONS / LOT 01</p><h1>Parkside control room</h1></div><button className="logout" onClick={() => { localStorage.removeItem('parking-token'); setToken(null) }}>Sign out</button></header>
    <section className="intro"><div><p className="eyebrow">TODAY'S CAPACITY</p><h2>Keep the lot moving.</h2><p className="muted">One place to track arrivals, departures, and every available bay.</p></div><div className="clock">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div></section>
    <section className="capacity-grid">{[['bike', 'Bike', 'B'], ['car', 'Car', 'C'], ['truck', 'Truck', 'T']].map(([key, label, mark]) => <article className={`capacity ${key}`} key={key}><span className="slot-mark">{mark}</span><div><p className="label">{label} bays</p><strong>{slots[key]?.available ?? 0}</strong><span className="of"> / {slots[key]?.total ?? 0} available</span></div><div className="meter"><span style={{ width: `${((slots[key]?.available ?? 0) / (slots[key]?.total || 1)) * 100}%` }} /></div></article>)}</section>
    {notice && <div className={`notice ${notice.type}`}>{notice.text}<button onClick={() => setNotice(null)} aria-label="Dismiss">×</button></div>}
    {result && <section className="result"><div><p className="eyebrow">LATEST {result.type === 'park' ? 'ARRIVAL' : 'EXIT'}</p><h3>{result.type === 'park' ? 'Ticket issued' : 'Exit completed'}</h3></div><dl><div><dt>Ticket</dt><dd>{result.ticket.ticket_id}</dd></div><div><dt>Vehicle</dt><dd>{result.ticket.vehicle_number}</dd></div><div><dt>Bay</dt><dd>{result.ticket.slot_number}</dd></div><div><dt>{result.type === 'park' ? 'Entry time' : 'Fare'}</dt><dd>{result.type === 'park' ? formatTime(result.ticket.entry_time) : `₹${result.ticket.fare}`}</dd></div>{result.type === 'exit' && <><div><dt>Exit time</dt><dd>{formatTime(result.ticket.exit_time)}</dd></div><div><dt>Duration</dt><dd>{result.ticket.duration_minutes} min</dd></div></>}</dl></section>}
    <section className="workspace"><div className="panel forms"><div className="panel-head"><div><p className="eyebrow">INBOUND</p><h3>Park a vehicle</h3></div><span className="number">01</span></div><form onSubmit={submitPark}><label>Vehicle number<input required value={parkForm.vehicleNumber} onChange={(e) => setParkForm({ ...parkForm, vehicleNumber: e.target.value })} placeholder="DL 01 AB 1234" /></label><label>Vehicle type<select value={parkForm.vehicleType} onChange={(e) => setParkForm({ ...parkForm, vehicleType: e.target.value })}><option>CAR</option><option>BIKE</option><option>TRUCK</option></select></label><button className="primary">Assign bay <span>→</span></button></form></div><div className="panel forms exit"><div className="panel-head"><div><p className="eyebrow">OUTBOUND</p><h3>Record an exit</h3></div><span className="number">02</span></div><form onSubmit={submitExit}><label>Ticket ID<input value={exitForm.ticketId} onChange={(e) => setExitForm({ ...exitForm, ticketId: e.target.value })} placeholder="T-..." /></label><div className="or">or use vehicle number</div><label>Vehicle number<input value={exitForm.vehicleNumber} onChange={(e) => setExitForm({ ...exitForm, vehicleNumber: e.target.value })} placeholder="DL 01 AB 1234" /></label><button className="secondary">Complete exit <span>→</span></button></form></div></section>
    <section className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">LIVE MANIFEST</p><h3>Active vehicles <small>{active.length}</small></h3></div><button className="refresh" onClick={() => loadData()}>↻ Refresh</button></div><div className="table-wrap"><table><thead><tr><th>Ticket</th><th>Vehicle</th><th>Type</th><th>Bay</th><th>Entry time</th><th>Action</th></tr></thead><tbody>{active.length ? active.map((row) => <tr key={row.ticket_id}><td className="ticket">{row.ticket_id}</td><td>{row.vehicle_number}</td><td><span className="tag">{row.vehicle_type}</span></td><td className="bay">{row.slot_number}</td><td>{formatTime(row.entry_time)}</td><td><button className="table-action" onClick={() => setExitForm({ ticketId: row.ticket_id, vehicleNumber: '' })}>Exit</button></td></tr>) : <tr><td colSpan="6" className="empty">No vehicles currently parked.</td></tr>}</tbody></table></div></section>
    <section className="panel table-panel history"><div className="panel-head"><div><p className="eyebrow">RECORDS</p><h3>Recent history</h3></div></div><div className="table-wrap"><table><thead><tr><th>Ticket</th><th>Vehicle</th><th>Bay</th><th>Duration</th><th>Fare</th></tr></thead><tbody>{history.map((row) => <tr key={row.ticket_id}><td className="ticket">{row.ticket_id}</td><td>{row.vehicle_number}</td><td className="bay">{row.slot_number}</td><td>{row.duration_minutes} min</td><td className="fare">₹{row.fare}</td></tr>)}</tbody></table></div></section>
    <footer><span>PARKSIDE / MANAGEMENT CONSOLE</span><span>PostgreSQL source of truth</span></footer>
  </main>
}

export default App
