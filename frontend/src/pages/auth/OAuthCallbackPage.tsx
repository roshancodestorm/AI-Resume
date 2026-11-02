
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    const completeLogin = async () => {
      if (!accessToken || !refreshToken) {
        setError('Google login tokens were not received.')
        return
      }

      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)

      try {
        await refreshUser()
        navigate('/dashboard', { replace: true })
      } catch (err: any) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        setError(
          err.response?.data?.detail ||
          err.message ||
          'Unable to complete login. Please try again.'
        )
      }
    }

    completeLogin()
  }, []) // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-6">
        {error ? (
          <>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Completing sign-in…</p>
          </>
        )}
      </div>
    </div>
  )
}
