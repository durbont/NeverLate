// Modal for editing an existing commute in NeverLate.
// Pre-populates all fields from the existing commute.
// Each stop entry monitors one subway line — trains at the same station
// are automatically grouped in the commute detail view.

import { useState, FormEvent } from 'react'
import { subwayLines, getLineById } from '../data/subway-data'
import { Commute } from '../api/commutes'
import './CommuteModal.css'

interface StopEntry {
  lineId: string
  stopId: string
  stopName: string
  direction: string
}

interface Props {
  commute: Commute
  onClose: () => void
  onSubmit: (data: {
    name: string
    startAddress: string
    endAddress: string
    stops: StopEntry[]
  }) => Promise<void>
}

export default function EditCommuteModal({ commute, onClose, onSubmit }: Props) {
  const [name, setName] = useState(commute.name)
  const [startAddress, setStartAddress] = useState(commute.startAddress ?? '')
  const [endAddress, setEndAddress] = useState(commute.endAddress ?? '')
  const [stops, setStops] = useState<StopEntry[]>(
    commute.stops.map(s => ({
      lineId: s.lineId,
      stopId: s.stopId,
      stopName: s.stopName,
      direction: s.direction,
    }))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addStop() {
    setStops([...stops, { lineId: '', stopId: '', stopName: '', direction: 'N' }])
  }

  function removeStop(index: number) {
    setStops(stops.filter((_, i) => i !== index))
  }

  function selectLine(index: number, lineId: string) {
    const updated = [...stops]
    const isSame = updated[index].lineId === lineId
    if (isSame) {
      updated[index] = { ...updated[index], lineId: '', stopId: '', stopName: '' }
    } else {
      const line = getLineById(lineId)
      updated[index] = {
        ...updated[index],
        lineId,
        stopId: line?.stops[0].id ?? '',
        stopName: line?.stops[0].name ?? '',
      }
    }
    setStops(updated)
  }

  function updateStop(index: number, stopId: string) {
    const line = getLineById(stops[index].lineId)
    const stop = line?.stops.find(s => s.id === stopId)
    if (!stop) return
    const updated = [...stops]
    updated[index] = { ...updated[index], stopId, stopName: stop.name }
    setStops(updated)
  }

  function updateDirection(index: number, direction: string) {
    const updated = [...stops]
    updated[index] = { ...updated[index], direction }
    setStops(updated)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ name, startAddress, endAddress, stops })
    } catch {
      setError('Failed to save changes. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Edit Commute</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Commute Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Home to Office"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Start Address</label>
              <input
                type="text"
                value={startAddress}
                onChange={e => setStartAddress(e.target.value)}
                placeholder="e.g. 123 Atlantic Ave, Brooklyn"
                style={styles.input}
              />
            </div>
            <div style={styles.rowArrow}>→</div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>End Address</label>
              <input
                type="text"
                value={endAddress}
                onChange={e => setEndAddress(e.target.value)}
                placeholder="e.g. 350 5th Ave, Manhattan"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.stopsSection}>
            <div style={styles.stopsHeader}>
              <span style={styles.label}>
                MTA Trains <span style={styles.optional}>(optional)</span>
              </span>
              <button type="button" onClick={addStop} style={styles.addStopButton}>
                + Add Train
              </button>
            </div>

            {stops.length === 0 && (
              <p style={styles.noStopsText}>
                Add trains to see live arrivals. Trains at the same station will be grouped automatically. If multiple lines run through your stop (e.g. 4, 5, and 6 at Union Sq), add each line separately.
              </p>
            )}

            {stops.map((stop, i) => {
              const lineData = stop.lineId ? getLineById(stop.lineId) : null
              return (
                <div key={i} style={styles.stopCard}>
                  <div style={styles.lineToggleSection}>
                    <div style={styles.lineToggleHeader}>
                      <span style={styles.smallLabel}>Select a line:</span>
                      <button type="button" onClick={() => removeStop(i)} style={styles.removeButton}>✕</button>
                    </div>
                    <div style={styles.lineToggleGrid}>
                      {subwayLines.map(line => {
                        const selected = stop.lineId === line.id
                        return (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => selectLine(i, line.id)}
                            title={`${line.id} train`}
                            style={{
                              ...styles.lineToggle,
                              backgroundColor: selected ? line.color : '#edf2f7',
                              color: selected ? line.textColor : '#a0aec0',
                              outline: selected ? `2px solid ${line.color}` : 'none',
                              outlineOffset: '2px',
                            }}
                          >
                            {line.id}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {lineData && (
                    <div className="nl-stop-row">
                      <div className="nl-stop-field-stop">
                        <label style={styles.smallLabel}>Stop</label>
                        <select
                          value={stop.stopId}
                          onChange={e => updateStop(i, e.target.value)}
                          style={styles.select}
                        >
                          {lineData.stops.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="nl-stop-field-dir">
                        <label style={styles.smallLabel}>Direction</label>
                        <div style={styles.directionToggle} className="nl-direction-toggle">
                          <button
                            type="button"
                            onClick={() => updateDirection(i, 'N')}
                            style={{
                              ...styles.directionButton,
                              backgroundColor: stop.direction === 'N' ? '#3182ce' : '#edf2f7',
                              color: stop.direction === 'N' ? '#fff' : '#4a5568',
                              fontWeight: stop.direction === 'N' ? 600 : 400,
                            }}
                          >
                            {lineData.labelN}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDirection(i, 'S')}
                            style={{
                              ...styles.directionButton,
                              backgroundColor: stop.direction === 'S' ? '#3182ce' : '#edf2f7',
                              color: stop.direction === 'S' ? '#fff' : '#4a5568',
                              fontWeight: stop.direction === 'S' ? 600 : 400,
                            }}
                          >
                            {lineData.labelS}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {stops.length > 0 && (
              <button type="button" onClick={addStop} style={styles.addStopButton}>
                + Add Train
              </button>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>Cancel</button>
            <button type="submit" disabled={submitting} style={styles.submitButton}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem 1.75rem 0',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: '#a0aec0',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  form: {
    padding: '1.25rem 1.75rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.75rem',
  },
  rowArrow: {
    paddingBottom: '0.6rem',
    color: '#a0aec0',
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#4a5568',
  },
  optional: {
    fontWeight: 400,
    color: '#a0aec0',
    fontSize: '0.8125rem',
    marginLeft: '0.25rem',
  },
  input: {
    padding: '0.625rem 0.875rem',
    fontSize: '0.9375rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    color: '#1a202c',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  stopsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  stopsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addStopButton: {
    padding: '0.375rem 0.875rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#3182ce',
    backgroundColor: '#ebf8ff',
    border: '1px solid #bee3f8',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  noStopsText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  stopCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
    padding: '1rem',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  lineToggleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  lineToggleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineToggleGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  lineToggle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s, color 0.15s',
    flexShrink: 0,
    padding: 0,
    cursor: 'pointer',
    border: 'none',
  },
  stopRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.625rem',
  },
  stopField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  smallLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#718096',
  },
  select: {
    padding: '0.5rem 0.625rem',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1a202c',
    cursor: 'pointer',
  },
  directionToggle: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  directionButton: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.8125rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: '#fc8181',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.25rem',
    flexShrink: 0,
  },
  error: {
    margin: 0,
    padding: '0.75rem',
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '8px',
    color: '#c53030',
    fontSize: '0.875rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    paddingTop: '0.25rem',
  },
  cancelButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#4a5568',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#3182ce',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}
