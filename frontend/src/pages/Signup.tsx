// Signup page for NeverLate.
// Collects email (+ confirm), and password, then creates account.

import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../api/auth'

function extractError(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { data?: { error?: string } } }).response?.data?.error
  ) {
    return (err as { response: { data: { error: string } } }).response.data.error
  }
  return fallback
}

export default function Signup() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (email !== confirmEmail) {
      setError('Email addresses do not match.')
      return
    }

    setLoading(true)
    try {
      await signup(email, password)
      navigate('/login')
    } catch (err) {
      setError(extractError(err, 'Signup failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>NeverLate</h1>
        <h2 style={styles.subtitle}>Create your account</h2>

        <form onSubmit={handleSignup} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="confirmEmail" style={styles.label}>Confirm Email</label>
            <input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              required
              autoComplete="off"
              placeholder="you@example.com"
              style={{
                ...styles.input,
                borderColor: confirmEmail && email !== confirmEmail ? '#fc8181' : undefined,
              }}
            />
            {confirmEmail && email !== confirmEmail && (
              <span style={styles.fieldError}>Emails do not match</span>
            )}
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading || email !== confirmEmail}
            style={{
              ...styles.button,
              opacity: email !== confirmEmail ? 0.5 : 1,
              cursor: email !== confirmEmail ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Log in</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    width: '100%',
    maxWidth: '420px',
  },
  title: {
    margin: '0 0 0.25rem',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1a202c',
    textAlign: 'center' as const,
  },
  subtitle: {
    margin: '0 0 1.5rem',
    fontSize: '1rem',
    fontWeight: 400,
    color: '#718096',
    textAlign: 'center' as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#4a5568',
  },
  input: {
    padding: '0.625rem 0.875rem',
    fontSize: '1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    color: '#1a202c',
  },
  fieldError: {
    fontSize: '0.75rem',
    color: '#e53e3e',
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
  button: {
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3182ce',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    color: '#718096',
  },
  link: {
    color: '#3182ce',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
