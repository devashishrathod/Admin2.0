import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { useAuthStore } from './features/auth/store/authStore'
import { restoreSessionFromOpenTabs, startSessionSharing } from './features/auth/tabSession'

// Answer other admin tabs (and follow their logout) from the start, then —
// before the route guard runs — let a fresh tab borrow the session of an
// admin tab that's still open (tabSession.js). No open tab → login screen.
startSessionSharing(useAuthStore)
restoreSessionFromOpenTabs(useAuthStore).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
})
