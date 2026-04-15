// Full-screen overlay showing the details of a single commute.
// Displays live MTA train arrivals per stop, polled every 30 seconds.
// Data is obtained from MTA via our own server and is not guaranteed to be
// accurate, complete, or timely. A staleness warning is shown if the MTA
// feed timestamp is more than 60 seconds behind real time (per MTA T&C).

import { useEffect, useState, useRef } from 'react'
import { Commute } from '../api/commutes'
import { getLineById } from '../data/subway-data'
import { fetchArrivals, Arrival, ArrivalsResponse } from '../api/arrivals'
import { fetchCommuteStats, CommuteStats } from '../api/logs'
import CommuteLogsOverlay from './CommuteLogsOverlay'
import './CommuteDetail.css'

interface Props {
  commute: Commute
  onClose: () => void
  isActive: boolean
  elapsed: number
  timerDisabled: boolean
  onStart: () => void
  onStop: () => Promise<void>
  formatElapsed: (seconds: number) => string
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function CommuteDetail({ commute, onClose, isActive, elapsed, timerDisabled, onStart, onStop, formatElapsed }: Props) {
  const [showLogs, setShowLogs] = useState(false)
  const [stats, setStats] = useState<CommuteStats | null>(null)

  function refreshStats() {
    fetchCommuteStats(commute.id).then(setStats).catch(() => {})
  }

  useEffect(() => {
    refreshStats()
  }, [commute.id])

  async function handleStop() {
    await onStop()
    refreshStats()
  }

  return (
    <div style={styles.overlay}>
      {/* Header */}
      <div style={styles.header} className="nl-detail-header">
        <button onClick={onClose} style={styles.backButton}>← Back</button>
        <span style={styles.headerTitle}>Commute Details</span>
        <div style={{ width: '80px' }} />
      </div>

      {/* Content */}
      <div className="nl-detail-content">
        <h1 className="nl-detail-name">{commute.name}</h1>

        {/* Route */}
        {(commute.startAddress || commute.endAddress) && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Route</span>
            <div style={styles.routeCard}>
              <span style={styles.routeAddress}>{commute.startAddress ?? '—'}</span>
              <span style={styles.routeArrow}>→</span>
              <span style={styles.routeAddress}>{commute.endAddress ?? '—'}</span>
            </div>
          </div>
        )}

        {/* Record */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Record</span>
          <div
            className="nl-timer-card"
            style={isActive ? { backgroundColor: '#ebf8ff', borderColor: '#bee3f8' } : undefined}
          >
            {isActive && (
              <span className="nl-timer-elapsed">{formatElapsed(elapsed)}</span>
            )}
            <div className="nl-timer-card-right">
              {isActive ? (
                <button onClick={handleStop} className="nl-timer-stop-btn">⏹ Stop & Save</button>
              ) : (
                <button
                  onClick={onStart}
                  disabled={timerDisabled}
                  className="nl-timer-start-btn"
                  style={{
                    opacity: timerDisabled ? 0.4 : 1,
                    cursor: timerDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  ▶ Start Commute
                </button>
              )}
              <button onClick={() => setShowLogs(true)} className="nl-view-history-btn">
                View History
              </button>
              {timerDisabled && (
                <span style={styles.timerDisabledNote}>Another commute is running</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Stats</span>
          {!stats || stats.count === 0 ? (
            <div style={styles.placeholderBox}>
              <span style={styles.placeholderText}>Record a trip to see stats</span>
            </div>
          ) : (
            <div style={styles.statsCard}>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Trips recorded</span>
                <span style={styles.statValue}>{stats.count}</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Average</span>
                <span style={styles.statValue}>{formatDuration(stats.meanSeconds!)}</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statRow}>
                <span style={styles.statLabel}>p75 <span className="nl-stat-hint">(75% of trips finish within)</span></span>
                <span style={styles.statValue}>{formatDuration(stats.p75Seconds!)}</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statRow}>
                <span style={styles.statLabel}>p90 <span className="nl-stat-hint">(90% of trips finish within)</span></span>
                <span style={styles.statValue}>{formatDuration(stats.p90Seconds!)}</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Six sigma <span className="nl-stat-hint">(worst-case estimate)</span></span>
                <span style={styles.statValue}>{formatDuration(stats.sixSigmaSeconds!)}</span>
              </div>
            </div>
          )}
        </div>

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

        {/* MTA attribution — required by T&C */}
        <p style={styles.attribution}>
          Real-time arrival data obtained from MTA and served via our own server.
          Not guaranteed to be accurate, complete, or timely.
        </p>
      </div>

      {showLogs && (
        <CommuteLogsOverlay
          commuteId={commute.id}
          commuteName={commute.name}
          onClose={() => setShowLogs(false)}
          onLogDeleted={refreshStats}
        />
      )}
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
    padding: '0.75rem 1.25rem',
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '0.5rem',
  },
  routeAddress: {
    fontSize: '0.9375rem',
    color: '#1a202c',
  },
  routeArrow: {
    fontSize: '1.75rem',
    color: '#48bb78',
    fontWeight: 900,
    flexShrink: 0,
    lineHeight: 1,
    position: 'relative' as const,
    top: '-2px',
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
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
  },
  statDivider: {
    height: '1px',
    backgroundColor: '#f7fafc',
    margin: '0 1.25rem',
  },
  statLabel: {
    fontSize: '0.9375rem',
    color: '#4a5568',
  },
  statValue: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1a202c',
    flexShrink: 0,
    marginLeft: '1rem',
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
  timerDisabledNote: {
    fontSize: '0.75rem',
    color: '#a0aec0',
  },
  attribution: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#a0aec0',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
}
