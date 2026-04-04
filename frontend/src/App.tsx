// Root application component for NeverLate.
// Defines top-level client-side routes. The home route (/) is protected —
// users without a JWT token in localStorage are redirected to /login.
// As new features are built (commute detail, timer, stats), add routes here.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'

function ProtectedRoute({ element }: { element: JSX.Element }) {
  return localStorage.getItem('token') ? element : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<ProtectedRoute element={<Home />} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
