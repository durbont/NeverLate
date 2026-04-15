// Entry point for the NeverLate React application.
// Mounts the root App component into the #root div defined in index.html.
// StrictMode is enabled to surface potential issues during development.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './global.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
