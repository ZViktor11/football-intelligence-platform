import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

type LoginResponse = {
  accessToken: string
  user: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
    isActive: boolean
  }
}

function AdminLoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!response.ok) {
        throw new Error('Invalid email or password')
      }

      const data: LoginResponse = await response.json()

      localStorage.setItem('accessToken', data.accessToken)

      navigate('/admin/matches/9')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not sign in',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="main">
      <section className="matches-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Match administration</p>
            <h1>Sign in</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="admin-email">
              Email
            </label>

            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password">
              Password
            </label>

            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p>{error}</p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default AdminLoginPage