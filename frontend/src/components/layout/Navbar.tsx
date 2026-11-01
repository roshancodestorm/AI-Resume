import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { FileText, LogOut, User, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <FileText className="w-6 h-6" />
            <span>AI Resume</span>
          </Link>

          {/* Nav links */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1">
              <Link to="/dashboard" className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                Dashboard
              </Link>
              <Link to="/resumes/new" className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                New Resume
              </Link>
              <Link to="/job-match" className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                Job Match
              </Link>
              <Link to="/jobs" className="px-3 py-2 text-sm text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1.5 font-medium">
                Jobs & Tracker
              </Link>
            </div>
          )}

          {/* User menu */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                      {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                  )}
                  <span className="hidden sm:block">{user?.full_name || user?.email}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary">Sign in</Link>
                <Link to="/register" className="btn-primary">Get started</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
