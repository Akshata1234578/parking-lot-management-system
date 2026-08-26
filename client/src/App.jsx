import { useEffect, useState } from 'react'
import './App.css'

const initialSlots = {
  bike: { total: 5, available: 5 },
  car: { total: 5, available: 5 },
  truck: { total: 2, available: 2 },
}

function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem('parking-token')
  )

  const [login, setLogin] = useState({
    username: 'admin',
    password: '',
  })

  const [slots, setSlots] = useState(initialSlots)
  const [active, setActive] = useState([])
  const [history, setHistory] = useState([])

  const [parkForm, setParkForm] = useState({
    vehicleNumber: '',
    vehicleType: 'CAR',
  })

  const [exitForm, setExitForm] = useState({
    ticketId: '',
    vehicleNumber: '',
  })

  const [result, setResult] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  async function loadData() {
    try {
      const [slotData, activeData, historyData] = await Promise.all([
        api('/api/parking/slots'),
        api('/api/parking/active'),
        api('/api/parking/history'),
      ])

      setSlots(slotData.slots || initialSlots)
      setActive(activeData.records || [])
      setHistory(historyData.records || [])
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message,
      })
    }
  }

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  async function submitLogin(event) {
    event.preventDefault()
    setLoading(true)

    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(login),
      })

      localStorage.setItem('parking-token', data.token)
      setToken(data.token)

      setNotice(null)
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  async function submitPark(event) {
    event.preventDefault()
    setLoading(true)

    try {
      const data = await api('/api/parking/park', {
        method: 'POST',
        body: JSON.stringify(parkForm),
      })

      setResult({
        type: 'park',
        ticket: data.ticket,
      })

      setNotice({
        type: 'success',
        text: `Ticket ${data.ticket.ticket_id} assigned to ${data.ticket.slot_number}`,
      })

      setParkForm({
        vehicleNumber: '',
        vehicleType: parkForm.vehicleType,
      })

      await loadData()
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  async function submitExit(event) {
    event.preventDefault()
    setLoading(true)

    try {
      const data = await api('/api/parking/exit', {
        method: 'POST',
        body: JSON.stringify(exitForm),
      })

      setResult({
        type: 'exit',
        ticket: data.ticket,
      })

      setNotice({
        type: 'success',
        text: `Exited ${data.ticket.vehicle_number} for ₹${data.ticket.fare}`,
      })

      setExitForm({
        ticketId: '',
        vehicleNumber: '',
      })

      await loadData()
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('parking-token')
    setToken(null)
    setResult(null)
    setNotice(null)
  }

  function formatTime(value) {
    if (!value) return '—'

    return new Date(value).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  // =========================
  // LOGIN PAGE
  // =========================

  if (!token) {
    return (
      <main className="login-page">
        <div className="login-decoration decoration-one" />
        <div className="login-decoration decoration-two" />

        <div className="login-brand">
          <div className="brand-logo">P</div>

          <div>
            <strong>PARKSIDE</strong>
            <span>CONTROL ROOM</span>
          </div>
        </div>

        <div className="login-content">
          <div className="login-introduction">
            <span className="eyebrow">PARKSIDE / LOT 01</span>

            <h1>
              Parking operations,
              <br />
              <span>made simple.</span>
            </h1>

            <p>
              Manage arrivals, departures, parking capacity and vehicle
              activity from one secure control room.
            </p>

            <div className="login-features">
              <div>
                <span>✓</span>
                Real-time availability
              </div>

              <div>
                <span>✓</span>
                Secure admin access
              </div>

              <div>
                <span>✓</span>
                Complete parking history
              </div>
            </div>
          </div>

          <div className="login-card">
            <div className="login-card-top">
              <span className="eyebrow">CONTROL ROOM</span>
              <h2>Welcome back</h2>
              <p>Sign in to manage parking operations.</p>
            </div>

            <form onSubmit={submitLogin}>
              <label>
                Username
                <input
                  required
                  value={login.username}
                  onChange={(event) =>
                    setLogin({
                      ...login,
                      username: event.target.value,
                    })
                  }
                  placeholder="Enter username"
                />
              </label>

              <label>
                Password
                <input
                  required
                  type="password"
                  value={login.password}
                  onChange={(event) =>
                    setLogin({
                      ...login,
                      password: event.target.value,
                    })
                  }
                  placeholder="Enter password"
                />
              </label>

              <button className="login-button" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
                <span>→</span>
              </button>
            </form>

            {notice && (
              <div className="login-error">
                {notice.text}
              </div>
            )}

            <div className="login-footer">
              <span>Secure parking administration</span>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // =========================
  // ADMIN DASHBOARD
  // =========================

  const totalCapacity =
    (slots.bike?.total || 0) +
    (slots.car?.total || 0) +
    (slots.truck?.total || 0)

  const totalAvailable =
    (slots.bike?.available || 0) +
    (slots.car?.available || 0) +
    (slots.truck?.available || 0)

  const occupied = totalCapacity - totalAvailable

  return (
    <div className="admin-app">

      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">P</div>

          <div>
            <strong>PARKSIDE</strong>
            <span>CONTROL ROOM</span>
          </div>
        </div>

        <nav className="sidebar-nav">

          <button
            className="nav-item active"
            onClick={() => scrollToSection('dashboard')}
          >
            <span className="nav-icon">⌂</span>
            Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() => scrollToSection('operations')}
          >
            <span className="nav-icon">▣</span>
            Parking Operations
          </button>

          <button
            className="nav-item"
            onClick={() => scrollToSection('active')}
          >
            <span className="nav-icon">●</span>
            Active Vehicles
          </button>

          <button
            className="nav-item"
            onClick={() => scrollToSection('history')}
          >
            <span className="nav-icon">↺</span>
            History
          </button>

          <button
            className="nav-item"
            onClick={() => scrollToSection('reports')}
          >
            <span className="nav-icon">▥</span>
            Reports
          </button>

        </nav>

        <div className="system-status">
          <div className="status-title">
            SYSTEM STATUS
          </div>

          <div className="status-online">
            <span />
            All systems operational
          </div>

          <div className="status-row">
            <span>PostgreSQL</span>
            <b>Online</b>
          </div>

          <div className="status-row">
            <span>MongoDB</span>
            <b>Online</b>
          </div>

          <div className="status-row">
            <span>Redis</span>
            <b>Online</b>
          </div>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main-content">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="topbar-left">
            <button className="mobile-menu">☰</button>

            <span className="topbar-title">
              Dashboard
            </span>
          </div>

          <div className="topbar-right">

            <span className="topbar-date">
              {new Date().toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>

            <span className="topbar-divider" />

            <div className="admin-user">
              <div className="admin-avatar">A</div>

              <div>
                <strong>Admin</strong>
                <span>Control Room</span>
              </div>
            </div>

            <button
              className="signout-button"
              onClick={logout}
            >
              Sign out
            </button>

          </div>
        </header>

        {/* DASHBOARD */}

        <div className="dashboard-container">

          {/* HERO */}

          <section
            className="dashboard-hero"
            id="dashboard"
          >

            <div className="hero-content">

              <span className="eyebrow">
                OPERATIONS / LOT 01
              </span>

              <h1>
                Parking Operations
                <br />
                Dashboard
              </h1>

              <p>
                Monitor parking activities, manage vehicles,
                and track real-time availability across all bays.
              </p>

              <div className="hero-actions">

                <button
                  className="primary-button"
                  onClick={() => scrollToSection('operations')}
                >
                  Park a vehicle
                  <span>→</span>
                </button>

                <button
                  className="secondary-button"
                  onClick={() => scrollToSection('history')}
                >
                  View history
                  <span>↗</span>
                </button>

              </div>

            </div>

            <div className="parking-illustration">

              <div className="parking-sign">
                P
              </div>

              <div className="road" />

              <div className="vehicle bike">
                🏍
              </div>

              <div className="vehicle car">
                🚗
              </div>

              <div className="vehicle truck">
                🚚
              </div>

            </div>

          </section>

          {/* SUMMARY */}

          <section className="summary-row">

            <div className="summary-card">
              <div className="summary-icon">▣</div>

              <div>
                <span>Total Capacity</span>
                <strong>{totalCapacity} Bays</strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon occupied-icon">
                ●
              </div>

              <div>
                <span>Occupied</span>
                <strong>{occupied} Bays</strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon available-icon">
                ✓
              </div>

              <div>
                <span>Available</span>
                <strong>{totalAvailable} Bays</strong>
              </div>
            </div>

          </section>

          {/* CAPACITY */}

          <section className="capacity-section">

            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  LIVE CAPACITY
                </span>

                <h2>Parking availability</h2>
              </div>

              <button
                className="refresh-button"
                onClick={loadData}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="capacity-grid">

              <CapacityCard
                type="bike"
                label="Bike Bays"
                data={slots.bike}
                icon="🏍"
              />

              <CapacityCard
                type="car"
                label="Car Bays"
                data={slots.car}
                icon="🚗"
              />

              <CapacityCard
                type="truck"
                label="Truck Bays"
                data={slots.truck}
                icon="🚚"
              />

            </div>
          </section>

          {/* NOTICE */}

          {notice && (
            <div className={`dashboard-notice ${notice.type}`}>
              <span>
                {notice.type === 'success' ? '✓' : '!'}
              </span>

              {notice.text}

              <button
                onClick={() => setNotice(null)}
              >
                ×
              </button>
            </div>
          )}

          {/* RESULT */}

          {result && (
            <section className="result-card">

              <div>
                <span className="eyebrow">
                  LATEST {result.type === 'park' ? 'ARRIVAL' : 'EXIT'}
                </span>

                <h3>
                  {result.type === 'park'
                    ? 'Ticket issued successfully'
                    : 'Exit completed successfully'}
                </h3>
              </div>

              <div className="result-details">

                <div>
                  <span>Ticket</span>
                  <strong>{result.ticket.ticket_id}</strong>
                </div>

                <div>
                  <span>Vehicle</span>
                  <strong>{result.ticket.vehicle_number}</strong>
                </div>

                <div>
                  <span>Bay</span>
                  <strong>{result.ticket.slot_number}</strong>
                </div>

                <div>
                  <span>
                    {result.type === 'park'
                      ? 'Entry time'
                      : 'Fare'}
                  </span>

                  <strong>
                    {result.type === 'park'
                      ? formatTime(result.ticket.entry_time)
                      : `₹${result.ticket.fare}`}
                  </strong>
                </div>

              </div>
            </section>
          )}

          {/* OPERATIONS */}

          <section
            className="operations-section"
            id="operations"
          >

            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  OPERATIONS
                </span>

                <h2>Manage parking</h2>
              </div>
            </div>

            <div className="operations-grid">

              {/* PARK */}

              <div className="operation-card">

                <div className="operation-header">
                  <div>
                    <span className="eyebrow">
                      INBOUND
                    </span>

                    <h3>Park a vehicle</h3>
                  </div>

                  <span className="operation-number">
                    01
                  </span>
                </div>

                <form onSubmit={submitPark}>

                  <label>
                    Vehicle number

                    <input
                      required
                      value={parkForm.vehicleNumber}
                      onChange={(event) =>
                        setParkForm({
                          ...parkForm,
                          vehicleNumber:
                            event.target.value,
                        })
                      }
                      placeholder="KA 01 AB 1234"
                    />
                  </label>

                  <label>
                    Vehicle type

                    <select
                      value={parkForm.vehicleType}
                      onChange={(event) =>
                        setParkForm({
                          ...parkForm,
                          vehicleType:
                            event.target.value,
                        })
                      }
                    >
                      <option>CAR</option>
                      <option>BIKE</option>
                      <option>TRUCK</option>
                    </select>
                  </label>

                  <button
                    className="form-primary-button"
                    disabled={loading}
                  >
                    {loading
                      ? 'Processing...'
                      : 'Assign bay'}

                    <span>→</span>
                  </button>

                </form>

              </div>

              {/* EXIT */}

              <div className="operation-card">

                <div className="operation-header">
                  <div>
                    <span className="eyebrow">
                      OUTBOUND
                    </span>

                    <h3>Record an exit</h3>
                  </div>

                  <span className="operation-number">
                    02
                  </span>
                </div>

                <form onSubmit={submitExit}>

                  <label>
                    Ticket ID

                    <input
                      value={exitForm.ticketId}
                      onChange={(event) =>
                        setExitForm({
                          ...exitForm,
                          ticketId:
                            event.target.value,
                        })
                      }
                      placeholder="T-..."
                    />
                  </label>

                  <div className="or-divider">
                    <span>OR USE VEHICLE NUMBER</span>
                  </div>

                  <label>
                    Vehicle number

                    <input
                      value={exitForm.vehicleNumber}
                      onChange={(event) =>
                        setExitForm({
                          ...exitForm,
                          vehicleNumber:
                            event.target.value,
                        })
                      }
                      placeholder="KA 01 AB 1234"
                    />
                  </label>

                  <button
                    className="form-secondary-button"
                    disabled={loading}
                  >
                    {loading
                      ? 'Processing...'
                      : 'Complete exit'}

                    <span>→</span>
                  </button>

                </form>

              </div>

            </div>
          </section>

          {/* ACTIVE VEHICLES */}

          <section
            className="data-card"
            id="active"
          >

            <div className="data-card-header">

              <div>
                <span className="eyebrow">
                  LIVE MANIFEST
                </span>

                <h2>
                  Active vehicles
                  <small>{active.length}</small>
                </h2>
              </div>

              <button
                className="refresh-button"
                onClick={loadData}
              >
                ↻ Refresh
              </button>

            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Vehicle Number</th>
                    <th>Type</th>
                    <th>Bay</th>
                    <th>Entry Time</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {active.length ? (
                    active.map((row) => (
                      <tr key={row.ticket_id}>

                        <td className="ticket-cell">
                          {row.ticket_id}
                        </td>

                        <td>
                          {row.vehicle_number}
                        </td>

                        <td>
                          <span className="vehicle-tag">
                            {row.vehicle_type}
                          </span>
                        </td>

                        <td className="bay-cell">
                          {row.slot_number}
                        </td>

                        <td>
                          {formatTime(row.entry_time)}
                        </td>

                        <td>
                          <button
                            className="table-exit-button"
                            onClick={() =>
                              setExitForm({
                                ticketId:
                                  row.ticket_id,
                                vehicleNumber: '',
                              })
                            }
                          >
                            Exit
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="empty-table"
                      >
                        <div className="empty-icon">
                          🚗
                        </div>

                        <strong>
                          No vehicles currently parked
                        </strong>

                        <span>
                          Active parking records will appear here.
                        </span>
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* HISTORY */}

          <section
            className="data-card"
            id="history"
          >

            <div className="data-card-header">

              <div>
                <span className="eyebrow">
                  RECENT RECORDS
                </span>

                <h2>
                  Parking history
                  <small>{history.length}</small>
                </h2>
              </div>

            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Vehicle Number</th>
                    <th>Type</th>
                    <th>Bay</th>
                    <th>Duration</th>
                    <th>Fare</th>
                    <th>Exit Time</th>
                  </tr>
                </thead>

                <tbody>

                  {history.length ? (
                    history.map((row) => (
                      <tr key={row.ticket_id}>

                        <td className="ticket-cell">
                          {row.ticket_id}
                        </td>

                        <td>
                          {row.vehicle_number}
                        </td>

                        <td>
                          <span className="vehicle-tag">
                            {row.vehicle_type}
                          </span>
                        </td>

                        <td className="bay-cell">
                          {row.slot_number}
                        </td>

                        <td>
                          {row.duration_minutes} min
                        </td>

                        <td className="fare-cell">
                          ₹{row.fare}
                        </td>

                        <td>
                          {formatTime(row.exit_time)}
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="empty-table"
                      >
                        <div className="empty-icon">
                          ◫
                        </div>

                        <strong>
                          No parking history available
                        </strong>

                        <span>
                          Completed parking transactions will appear here.
                        </span>
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* REPORT PLACEHOLDER */}

          <section id="reports" className="reports-note">
            <div>
              <span className="eyebrow">SYSTEM</span>
              <h2>Parking management console</h2>
              <p>
                PostgreSQL remains the source of truth for parking
                allocation and transaction state.
              </p>
            </div>

            <div className="reports-status">
              <span />
              System operational
            </div>
          </section>

        </div>

        {/* FOOTER */}

        <footer className="admin-footer">

          <div className="footer-brand">

            <div className="brand-logo">P</div>

            <div>
              <strong>PARKSIDE</strong>

              <p>
                Smart parking management system.
                <br />
                Efficient. Secure. Reliable.
              </p>
            </div>

          </div>

          <div className="footer-links">

            <strong>QUICK LINKS</strong>

            <button onClick={() => scrollToSection('dashboard')}>
              Dashboard
            </button>

            <button onClick={() => scrollToSection('operations')}>
              Parking Operations
            </button>

            <button onClick={() => scrollToSection('active')}>
              Active Vehicles
            </button>

            <button onClick={() => scrollToSection('history')}>
              History
            </button>

          </div>

          <div className="footer-system">

            <strong>SYSTEM</strong>

            <span>
              PostgreSQL · MongoDB · Redis
            </span>

            <span>
              Admin Control Room
            </span>

          </div>

          <div className="footer-bottom">
            © 2026 Parkside Parking Management System. All rights reserved.
          </div>

        </footer>

      </main>
    </div>
  )
}


// =========================
// CAPACITY CARD
// =========================

function CapacityCard({ type, label, data, icon }) {
  const total = data?.total || 0
  const available = data?.available || 0

  const percentage =
    total > 0
      ? (available / total) * 100
      : 0

  return (
    <article className={`capacity-card ${type}`}>

      <div className="capacity-icon">
        {icon}
      </div>

      <div className="capacity-info">

        <span>{label}</span>

        <div className="capacity-number">
          <strong>{available}</strong>

          <span>
            / {total}
          </span>
        </div>

        <small>
          available
        </small>

      </div>

      <div className="capacity-bar">
        <span
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

    </article>
  )
}

export default App
