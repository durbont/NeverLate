// Modal for creating a new commute in NeverLate.
// Collects the commute name, start address, end address, and optional MTA stops.
// For each stop, the user picks a "browse line" to find the physical station,
// selects the stop and direction, then toggles which lines to monitor there
// (e.g., the 1, 2, and 3 trains all share a platform and can be tracked together).

import { useState, FormEvent } from 'react'
import { subwayLines, getLineById } from '../data/subway-data'

interface StopEntry {
  browseLine: string    // line used to find the stop — not necessarily monitored
  lineIds: string[]     // all lines the user wants to monitor at this stop
  stopId: string
  stopName: string
  direction: string
}

interface Props {
  onClose: () => void
  onSubmit: (data: {
    name: string
    startAddress: string
    endAddress: string
    stops: StopEntry[]
  }) => Promise<void>
}

export default function NewCommuteModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [stops, setStops] = useState<StopEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addStop() {
    const firstLine = subwayLines[0]
    setStops([...stops, {
      browseLine: firstLine.id,
      lineIds: [firstLine.id],
      stopId: firstLine.stops[0].id,
      stopName: firstLine.stops[0].name,
      direction: 'N',
    }])
  }

  function removeStop(index: number) {
    setStops(stops.filter((_, i) => i !== index))
  }

  function updateBrowseLine(index: number, lineId: string) {
    const line = getLineById(lineId)
    if (!line) return
    const updated = [...stops]
    updated[index] = {
      ...updated[index],
      browseLine: lineId,
      stopId: line.stops[0].id,
      stopName: line.stops[0].name,
      // Keep lineIds but swap the old browseLine for the new one
      lineIds: [
        lineId,
        ...updated[index].lineIds.filter(id => id !== updated[index].browseLine),
      ],
    }
    setStops(updated)
  }

  function updateStop(index: number, stopId: string) {
    const line = getLineById(stops[index].browseLine)
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

  function toggleLine(index: number, lineId: string) {
    const updated = [...stops]
    const current = updated[index].lineIds
    // The browse line must always remain selected
    if (lineId === updated[index].browseLine) return
    updated[index] = {
      ...updated[index],
      lineIds: current.includes(lineId)
        ? current.filter(id => id !== lineId)
        : [...current, lineId],
    }
    setStops(updated)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ name, startAddress, endAddress, stops })
    } catch {
      setError('Failed to create commute. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>New Commute</h2>
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
                MTA Stops <span style={styles.optional}>(optional)</span>
              </span>
              <button type="button" onClick={addStop} style={styles.addStopButton}>
                + Add Stop
              </button>
            </div>

            {stops.length === 0 && (
              <p style={styles.noStopsText}>
                Add stops to see live train arrivals. You can monitor multiple lines at the same stop.
              </p>
            )}

            {stops.map((stop, i) => {
              const browseLineData = getLineById(stop.browseLine)
              return (
                <div key={i} style={styles.stopCard}>
                  {/* Row 1: browse line, stop, direction */}
                  <div style={styles.stopRow}>
                    <div style={styles.stopField}>
                      <label style={styles.smallLabel}>Browse by line</label>
                      <select
                        value={stop.browseLine}
                        onChange={e => updateBrowseLine(i, e.target.value)}
                        style={styles.select}
                      >
                        {subwayLines.map(line => (
                          <option key={line.id} value={line.id}>{line.id} train</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ ...styles.stopField, flex: 2 }}>
                      <label style={styles.smallLabel}>Stop</label>
                      <select
                        value={stop.stopId}
                        onChange={e => updateStop(i, e.target.value)}
                        style={styles.select}
                      >
                        {browseLineData?.stops.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.stopField}>
                      <label style={styles.smallLabel}>Direction</label>
                      <select
                        value={stop.direction}
                        onChange={e => updateDirection(i, e.target.value)}
                        style={styles.select}
                      >
                        <option value="N">{browseLineData?.terminalN ?? 'Terminal N'}</option>
                        <option value="S">{browseLineData?.terminalS ?? 'Terminal S'}</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      style={styles.removeButton}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Row 2: line toggles */}
                  <div style={styles.lineToggleSection}>
                    <span style={styles.smallLabel}>Monitor these lines at this stop:</span>
                    <div style={styles.lineToggleGrid}>
                      {subwayLines.map(line => {
                        const selected = stop.lineIds.includes(line.id)
                        const isBrowse = line.id === stop.browseLine
                        return (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => toggleLine(i, line.id)}
                            title={isBrowse ? `${line.id} train (required)` : `Toggle ${line.id} train`}
                            style={{
                              ...styles.lineToggle,
                              backgroundColor: selected ? line.color : '#edf2f7',
                              color: selected ? line.textColor : '#a0aec0',
                              border: isBrowse ? `2px solid ${line.color}` : '2px solid transparent',
                              cursor: isBrowse ? 'default' : 'pointer',
                            }}
                          >
                            {line.id}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={styles.submitButton}>
              {submitting ? 'Creating...' : 'Create Commute'}
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
  removeButton: {
    background: 'none',
    border: 'none',
    color: '#fc8181',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.25rem',
    marginBottom: '2px',
    flexShrink: 0,
  },
  lineToggleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
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
