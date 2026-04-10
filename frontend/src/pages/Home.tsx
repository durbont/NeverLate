// Home page for NeverLate — shown after a user logs in.
// Displays a "New Commute" button at the top and a searchable list of the user's
// saved commutes below. Commutes can be reordered by dragging the handle on the
// left, and deleted via a confirmation modal that names the commute being deleted.

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCommutes, createCommute, updateCommute, deleteCommute, reorderCommutes, Commute } from '../api/commutes'
import { logout } from '../api/auth'
import { getLineById } from '../data/subway-data'
import NewCommuteModal from '../components/NewCommuteModal'
import EditCommuteModal from '../components/EditCommuteModal'
import CommuteDetail from '../components/CommuteDetail'

export default function Home() {
  const navigate = useNavigate()
  const email = localStorage.getItem('email') ?? ''

  const [commutes, setCommutes] = useState<Commute[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewTarget, setViewTarget] = useState<Commute | null>(null)
  const [editTarget, setEditTarget] = useState<Commute | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Commute | null>(null)

  // Drag-and-drop state
  const draggingId = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  useEffect(() => {
    getCommutes()
      .then(setCommutes)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreateCommute(data: {
    name: string
    startAddress: string
    endAddress: string
    stops: { lineId: string; stopId: string; stopName: string; direction: string }[]
  }) {
    const commute = await createCommute(data)
    setCommutes(prev => [commute, ...prev])
    setShowModal(false)
  }

  async function handleUpdateCommute(data: {
    name: string
    startAddress: string
    endAddress: string
    stops: { lineId: string; stopId: string; stopName: string; direction: string }[]
  }) {
    if (!editTarget) return
    const updated = await updateCommute(editTarget.id, data)
    setCommutes(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditTarget(null)
  }

  async function handleDelete(id: number) {
    await deleteCommute(id)
    setCommutes(prev => prev.filter(c => c.id !== id))
    setDeleteTarget(null)
  }

  function handleDragStart(id: number) {
    draggingId.current = id
  }

  function handleDragOver(e: React.DragEvent, id: number) {
    e.preventDefault()
    setDragOverId(id)
  }

  function handleDrop(targetId: number) {
    const fromId = draggingId.current
    if (fromId === null || fromId === targetId) {
      draggingId.current = null
      setDragOverId(null)
      return
    }

    setCommutes(prev => {
      const next = [...prev]
      const fromIndex = next.findIndex(c => c.id === fromId)
      const toIndex = next.findIndex(c => c.id === targetId)
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      reorderCommutes(next.map(c => c.id))
      return next
    })

    draggingId.current = null
    setDragOverId(null)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const filtered = commutes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.startAddress?.toLowerCase().includes(search.toLowerCase()) ||
    c.endAddress?.toLowerCase().includes(search.toLowerCase())
  )

  // When searching, disable drag (ordering while filtered would be confusing)
  const isDraggable = search.trim() === ''

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>NeverLate</h1>
        <div style={styles.headerRight}>
          <span style={styles.emailLabel}>{email}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>Log out</button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <h2 style={styles.pageTitle}>My Commutes</h2>
          <button onClick={() => setShowModal(true)} style={styles.newButton}>
            + New Commute
          </button>
        </div>

        {/* Search */}
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commutes..."
            style={styles.searchInput}
          />
        </div>

        {/* List */}
        {loading ? (
          <p style={styles.emptyText}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={styles.emptyText}>
            {search ? 'No commutes match your search.' : 'No commutes yet — create one to get started.'}
          </p>
        ) : (
          <div style={styles.list}>
            {filtered.map(commute => {
              const isOver = dragOverId === commute.id
              return (
                <div
                  key={commute.id}
                  draggable={isDraggable}
                  onDragStart={() => handleDragStart(commute.id)}
                  onDragOver={e => handleDragOver(e, commute.id)}
                  onDrop={() => handleDrop(commute.id)}
                  onDragEnd={() => { draggingId.current = null; setDragOverId(null) }}
                  onClick={() => setViewTarget(commute)}
                  style={{
                    ...styles.commuteCard,
                    ...(isOver ? styles.commuteCardOver : {}),
                    opacity: draggingId.current === commute.id ? 0.4 : 1,
                    cursor: 'pointer',
                  }}
                >
                  {/* Drag handle */}
                  {isDraggable && (
                    <span style={styles.dragHandle} title="Drag to reorder">⠿</span>
                  )}

                  {/* Main content */}
                  <div style={styles.cardMain}>
                    <span style={styles.commuteName}>{commute.name}</span>
                    {(commute.startAddress || commute.endAddress) && (
                      <span style={styles.commuteRoute}>
                        {commute.startAddress ?? '—'} → {commute.endAddress ?? '—'}
                      </span>
                    )}
                    {commute.stops.length > 0 && (
                      <div style={styles.stopBadges}>
                        {/* Group stops by stopName+direction so co-located trains share a row */}
                        {Object.values(
                          commute.stops.reduce((groups, stop) => {
                            const key = `${stop.stopName}-${stop.direction}`
                            if (!groups[key]) groups[key] = { stop, lineIds: [] }
                            groups[key].lineIds.push(stop.lineId)
                            return groups
                          }, {} as Record<string, { stop: typeof commute.stops[0], lineIds: string[] }>)
                        ).map(({ stop, lineIds }, i) => {
                          const primaryLine = getLineById(lineIds[0])
                          const dirLabel = stop.direction === 'N'
                            ? (primaryLine?.labelN ?? primaryLine?.terminalN ?? '')
                            : (primaryLine?.labelS ?? primaryLine?.terminalS ?? '')
                          return (
                            <div key={i} style={styles.stopBadge}>
                              <div style={styles.lineDots}>
                                {lineIds.map(lineId => {
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
                              <span style={styles.stopBadgeText}>
                                {stop.stopName}
                                {dirLabel && <span style={styles.dirLabel}> · {dirLabel}</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right side: date + actions */}
                  <div style={styles.cardRight}>
                    <span style={styles.commuteDate}>
                      {new Date(commute.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setEditTarget(commute) }}
                      style={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(commute) }}
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {viewTarget && (
        <CommuteDetail
          commute={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {showModal && (
        <NewCommuteModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateCommute}
        />
      )}

      {editTarget && (
        <EditCommuteModal
          commute={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdateCommute}
        />
      )}

      {deleteTarget && (
        <div style={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div style={styles.deleteModal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.deleteModalTitle}>Delete Commute</h3>
            <p style={styles.deleteModalBody}>
              Are you sure you want to delete{' '}
              <strong>"{deleteTarget.name}"</strong>?
              This cannot be undone.
            </p>
            <div style={styles.deleteModalActions}>
              <button onClick={() => setDeleteTarget(null)} style={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteTarget.id)} style={styles.confirmDeleteButton}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  emailLabel: {
    fontSize: '0.875rem',
    color: '#718096',
  },
  logoutButton: {
    padding: '0.375rem 0.875rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#4a5568',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  content: {
    maxWidth: '760px',
    margin: '2rem auto',
    padding: '0 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    margin: 0,
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  newButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3182ce',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.875rem',
    fontSize: '0.9rem',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.625rem 0.875rem 0.625rem 2.375rem',
    fontSize: '0.9375rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    outline: 'none',
    color: '#1a202c',
    boxSizing: 'border-box' as const,
  },
  emptyText: {
    margin: 0,
    color: '#718096',
    fontSize: '0.9375rem',
    textAlign: 'center',
    paddingTop: '2rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  commuteCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    transition: 'border-color 0.15s',
  },
  commuteCardOver: {
    borderColor: '#3182ce',
    boxShadow: '0 0 0 2px #bee3f8',
  },
  dragHandle: {
    fontSize: '1.1rem',
    color: '#cbd5e0',
    cursor: 'grab',
    flexShrink: 0,
    paddingTop: '0.125rem',
    userSelect: 'none' as const,
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    minWidth: 0,
    flex: 1,
  },
  commuteName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a202c',
  },
  commuteRoute: {
    fontSize: '0.875rem',
    color: '#718096',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  stopBadges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    marginTop: '0.25rem',
  },
  stopBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  lineDots: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0,
  },
  lineDot: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6875rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  stopBadgeText: {
    fontSize: '0.8125rem',
    color: '#4a5568',
  },
  dirLabel: {
    color: '#718096',
  },
  cardRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.5rem',
    flexShrink: 0,
  },
  commuteDate: {
    fontSize: '0.8125rem',
    color: '#a0aec0',
  },
  editButton: {
    padding: '0.3rem 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#3182ce',
    backgroundColor: 'transparent',
    border: '1px solid #bee3f8',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.3rem 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#e53e3e',
    backgroundColor: 'transparent',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem',
  },
  deleteModalTitle: {
    margin: '0 0 0.75rem',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#1a202c',
  },
  deleteModalBody: {
    margin: '0 0 1.5rem',
    fontSize: '0.9375rem',
    color: '#4a5568',
    lineHeight: 1.5,
  },
  deleteModalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
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
  confirmDeleteButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#e53e3e',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}
