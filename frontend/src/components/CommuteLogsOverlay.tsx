// Full-screen overlay showing the recorded trip history for a single commute.
// Loads 10 logs at a time, most recent first. Each row shows date, start time,
// end time, and duration.

import { useEffect, useState } from 'react'
import { fetchCommuteLogs, deleteCommuteLog, CommuteLog } from '../api/logs'
import './CommuteLogsOverlay.css'

interface Props {
  commuteId: number
  commuteName: string
  onClose: () => void
  onLogDeleted?: () => void
}

function formatDate(epochSec: number): string {
  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatTime(epochSec: number): string {
  return new Date(epochSec * 1000).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function CommuteLogsOverlay({ commuteId, commuteName, onClose, onLogDeleted }: Props) {
  const [logs, setLogs] = useState<CommuteLog[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchCommuteLogs(commuteId, 0)
      .then(res => {
        setLogs(res.logs)
        setPage(0)
        setHasMore(res.hasMore)
        setError(false)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [commuteId])

  async function confirmDelete() {
    if (confirmId === null) return
    setDeletingId(confirmId)
    setConfirmId(null)
    try {
      await deleteCommuteLog(commuteId, confirmId)
      setLogs(prev => prev.filter(l => l.id !== confirmId))
      onLogDeleted?.()
    } catch {
      // keep log in list if delete failed
    } finally {
      setDeletingId(null)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const res = await fetchCommuteLogs(commuteId, page + 1)
      setLogs(prev => [...prev, ...res.logs])
      setPage(page + 1)
      setHasMore(res.hasMore)
    } catch {
      // keep existing logs
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div style={styles.overlay}>
      {/* Header */}
      <div style={styles.header} className="nl-logs-header">
        <button onClick={onClose} style={styles.backButton}>← Back</button>
        <span style={styles.headerTitle}>Trip History</span>
        <div style={{ width: '80px' }} />
      </div>

      {/* Content */}
      <div className="nl-logs-content">
        <h1 className="nl-logs-title">{commuteName}</h1>

        <p style={styles.disclaimer}>
          Deleting trips should be rare and only done if you forgot to stop the timer upon arrival.
          Exceptional circumstances and inconveniences are important data points — they provide more
          insightful information about your commute.
        </p>

        {loading ? (
          <p style={styles.statusText}>Loading...</p>
        ) : error ? (
          <p style={styles.statusText}>Could not load trip history.</p>
        ) : logs.length === 0 ? (
          <p style={styles.statusText}>No trips recorded yet. Start a commute to begin tracking.</p>
        ) : (
          <>
            <div style={styles.logList}>
              {logs.map((log, i) => (
                <div
                  key={log.id}
                  className="nl-log-row"
                  style={{ borderBottom: i === logs.length - 1 ? 'none' : '1px solid #f7fafc' }}
                >
                  <div className="nl-log-date">{formatDate(log.startedAt)}</div>
                  <div className="nl-log-times">
                    <span style={styles.logTime}>{formatTime(log.startedAt)}</span>
                    <span style={styles.logArrow}>→</span>
                    <span style={styles.logTime}>{formatTime(log.endedAt)}</span>
                  </div>
                  <div style={styles.logDuration}>{formatDuration(log.durationSeconds)}</div>
                  <button
                    onClick={() => setConfirmId(log.id)}
                    disabled={deletingId === log.id}
                    style={styles.deleteButton}
                    title="Delete this trip"
                  >
                    {deletingId === log.id ? '…' : '✕'}
                  </button>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={styles.loadMoreButton}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
      {confirmId !== null && (
        <div style={styles.modalOverlay} onClick={() => setConfirmId(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Delete this trip?</h3>
            <p style={styles.modalBody}>
              This trip record will be permanently removed and will no longer count toward your stats.
              This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setConfirmId(null)} style={styles.modalCancel}>Cancel</button>
              <button onClick={confirmDelete} style={styles.modalConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#f0f4f8',
    zIndex: 300,
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
  disclaimer: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#718096',
    lineHeight: 1.6,
    padding: '0.875rem 1.25rem',
    backgroundColor: '#fffaf0',
    border: '1px solid #fbd38d',
    borderRadius: '10px',
  },
  statusText: {
    margin: 0,
    fontSize: '0.9375rem',
    color: '#a0aec0',
    fontStyle: 'italic',
    paddingTop: '1rem',
  },
  logList: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  logTime: {
    fontSize: '0.875rem',
    color: '#4a5568',
  },
  logArrow: {
    fontSize: '0.75rem',
    color: '#cbd5e0',
  },
  logDuration: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1a202c',
    flexShrink: 0,
    minWidth: '60px',
    textAlign: 'right' as const,
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 400,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
  },
  modalTitle: {
    margin: '0 0 0.75rem',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  modalBody: {
    margin: '0 0 1.5rem',
    fontSize: '0.9375rem',
    color: '#4a5568',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
  },
  modalCancel: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#4a5568',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  modalConfirm: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#e53e3e',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#fc8181',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.25rem 0.375rem',
    flexShrink: 0,
    lineHeight: 1,
  },
  loadMoreButton: {
    alignSelf: 'center',
    padding: '0.5rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#3182ce',
    backgroundColor: 'transparent',
    border: '1px solid #bee3f8',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}
