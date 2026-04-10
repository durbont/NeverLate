// Full-screen overlay showing the details of a single commute.
// Displays live MTA train arrivals per stop, polled every 30 seconds.
// Data is obtained from MTA via our own server and is not guaranteed to be
// accurate, complete, or timely. A staleness warning is shown if the MTA
// feed timestamp is more than 60 seconds behind real time (per MTA T&C).

import { useEffect, useState, useRef } from 'react'
import { Commute } from '../api/commutes'
import { getLineById } from '../data/subway-data'
import { fetchArrivals, Arrival, ArrivalsResponse } from '../api/arrivals'

interface Props {
  commute: Commute
  onClose: () => void
}

export default function CommuteDetail({ commute, onClose }: Props) {
  return (
    <div style={styles.overlay}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onClose} style={styles.backButton}>← Back</button>
        <span style={styles.headerTitle}>Commute Details</span>
        <div style={{ width: '80px' }} />
      </div>

      {/* Content */}
      <div style={styles.content}>
        <h1 style={styles.commuteName}>{commute.name}</h1>

        {/* Route */}
        {(commute.startAddress || commute.endAddress) && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Route</span>
            <div style={styles.routeCard}>
              <div style={styles.routeStop}>
                <span style={styles.routeDotGray} />
                <span style={styles.routeAddress}>{commute.startAddress ?? '—'}</span>
              </div>
              <div style={styles.routeLine} />
              <div style={styles.routeStop}>
                <span style={styles.routeDotBlue} />
                <span style={styles.routeAddress}>{commute.endAddress ?? '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live arrivals — grouped by stopName+direction so co-located trains share a card */}
        {commute.stops.length > 0 && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Live Arrivals</span>
            {Object.values(
              commute.stops.reduce((groups, stop) => {
                const key = `${stop.stopName}-${stop.direction}`
                if (!groups[key]) groups[key] = { stopName: stop.stopName, direction: stop.direction, entries: [] }
                groups[key].entries.push({ stopId: stop.stopId, lineId: stop.lineId })
                return groups
              }, {} as Record<string, { stopName: string; direction: string; entries: { stopId: string; lineId: string }[] }>)
            ).map((group, i) => (
              <StopArrivalsSection key={i} group={group} />
            ))}
          </div>
        )}

        {/* Stats — placeholder */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Stats</span>
          <div style={styles.placeholderBox}>
            <span style={styles.placeholderText}>Trip stats coming soon</span>
          </div>
        </div>

        {/* Start/Stop — placeholder */}
        <div style={styles.section}>
          <button style={styles.startButton} disabled>Start Commute</button>
        </div>

        {/* MTA attribution — required by T&C */}
        <p style={styles.attribution}>
          Real-time arrival data obtained from MTA and served via our own server.
          Not guaranteed to be accurate, complete, or timely.
        </p>
      </div>
    </div>
  )
}

// ─── Per-stop arrivals component ────────────────────────────────────────────

interface StopGroup {
  stopName: string
  direction: string
  entries: { stopId: string; lineId: string }[]
}

const COLLAPSED_COUNT = 3

function StopArrivalsSection({ group }: { group: StopGroup }) {
  const [arrivals, setArrivals] = useState<ArrivalsResponse['arrivals']>([])
  const [feedTimestamp, setFeedTimestamp] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)


  async function load() {
    try {
      // Fetch arrivals for each unique stopId in the group, then merge and sort
      const results = await Promise.all(
        group.entries.map(e => fetchArrivals(e.stopId, group.direction, [e.lineId]))
      )
      const merged = results.flatMap(r => r.arrivals)
      merged.sort((a, b) => a.arrivalTime - b.arrivalTime)
      setArrivals(merged)
      setFeedTimestamp(results[0]?.feedTimestamp ?? null)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [group.stopName, group.direction, group.entries.map(e => e.stopId + e.lineId).join(',')])

  // T&C: warn if MTA feed is more than 60 seconds behind real time
  const nowSec = Math.floor(Date.now() / 1000)
  const isStale = feedTimestamp !== null && (nowSec - feedTimestamp) > 60

  return (
    <div style={styles.stopCard}>
      {/* Stop header: line badges + name + directional label */}
      <div style={styles.stopCardHeader}>
        <div style={styles.lineDots}>
          {group.entries.map(({ lineId }) => {
            const line = getLineById(lineId)
            return (
              <span key={lineId} style={{
                ...styles.lineDot,
                backgroundColor: line?.color ?? '#aaa',
                color: line?.textColor ?? '#fff',
              }}>
                {lineId}
              </span>
            )
          })}
        </div>
        <div style={styles.stopMeta}>
          <span style={styles.stopName}>{group.stopName}</span>
          {(() => {
            const firstLine = getLineById(group.entries[0]?.lineId)
            const dirLabel = group.direction === 'N' ? firstLine?.labelN : firstLine?.labelS
            return dirLabel ? <span style={styles.stopDir}>{dirLabel}</span> : null
          })()}
        </div>
      </div>

      {/* Staleness warning */}
      {isStale && (
        <div style={styles.staleWarning}>
          MTA feed may be delayed — arrival times may not reflect real time.
        </div>
      )}

      {/* Arrivals */}
      {loading ? (
        <p style={styles.statusText}>Loading arrivals...</p>
      ) : error ? (
        <p style={styles.statusText}>Could not load arrivals. Will retry shortly.</p>
      ) : arrivals.length === 0 ? (
        <p style={styles.statusText}>No upcoming trains found in the next 90 minutes.</p>
      ) : (
        <>
          <div style={styles.arrivalList}>
            {(expanded ? arrivals : arrivals.slice(0, COLLAPSED_COUNT)).map((arrival, i) => (
              <ArrivalRow key={i} arrival={arrival} direction={group.direction} />
            ))}
          </div>
          {arrivals.length > COLLAPSED_COUNT && (
            <button onClick={() => setExpanded(e => !e)} style={styles.expandButton}>
              {expanded ? 'Show less' : `+${arrivals.length - COLLAPSED_COUNT} more`}
            </button>
          )}
        </>
      )}

      {/* Last updated */}
      {feedTimestamp !== null && (
        <p style={styles.lastUpdated}>
          Updated {formatTimeAgo(nowSec)} · refreshes every 30s
        </p>
      )}
    </div>
  )
}

function ArrivalRow({ arrival, direction }: { arrival: Arrival; direction: string }) {
  const line = getLineById(arrival.lineId)
  const label = arrival.minutesAway < 1 ? 'Due' : `${arrival.minutesAway} min`
  const destination = direction === 'N' ? (line?.terminalN ?? '') : (line?.terminalS ?? '')

  return (
    <div style={styles.arrivalRow}>
      <span style={{
        ...styles.arrivalLineDot,
        backgroundColor: line?.color ?? '#aaa',
        color: line?.textColor ?? '#fff',
      }}>
        {arrival.lineId}
      </span>
      <span style={styles.arrivalDestination}>{destination}</span>
      <span style={styles.arrivalTime}>{label}</span>
    </div>
  )
}

function formatTimeAgo(epochSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - epochSec
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  return `${Math.floor(diff / 60)}m ago`
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#f0f4f8',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflowY: 'auto',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#3182ce',
    cursor: 'pointer',
    padding: '0.25rem 0',
    width: '80px',
    textAlign: 'left' as const,
  },
  headerTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a202c',
  },
  content: {
    maxWidth: '680px',
    width: '100%',
    margin: '2rem auto',
    padding: '0 1.5rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  commuteName: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#a0aec0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  routeCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  routeStop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  routeDotGray: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#a0aec0',
    flexShrink: 0,
  },
  routeDotBlue: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#3182ce',
    flexShrink: 0,
  },
  routeLine: {
    width: '2px',
    height: '16px',
    backgroundColor: '#e2e8f0',
    marginLeft: '4px',
  },
  routeAddress: {
    fontSize: '0.9375rem',
    color: '#1a202c',
  },
  stopCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  stopCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
  },
  lineDots: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0,
  },
  lineDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  stopMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  stopName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1a202c',
  },
  stopDir: {
    fontSize: '0.8125rem',
    color: '#718096',
  },
  staleWarning: {
    fontSize: '0.8125rem',
    color: '#c05621',
    backgroundColor: '#fffaf0',
    border: '1px solid #fbd38d',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
  },
  arrivalList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  arrivalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f7fafc',
  },
  arrivalLineDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  arrivalDestination: {
    flex: 1,
    fontSize: '0.875rem',
    color: '#4a5568',
  },
  arrivalTime: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a202c',
    flexShrink: 0,
  },
  statusText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  expandButton: {
    background: 'none',
    border: 'none',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#3182ce',
    cursor: 'pointer',
    padding: '0.25rem 0',
    textAlign: 'left' as const,
  },
  lastUpdated: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#cbd5e0',
  },
  placeholderBox: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px dashed #cbd5e0',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: '0.9375rem',
    color: '#a0aec0',
  },
  startButton: {
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#48bb78',
    border: 'none',
    borderRadius: '10px',
    cursor: 'not-allowed',
    opacity: 0.5,
    width: '100%',
  },
  attribution: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#a0aec0',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
}
