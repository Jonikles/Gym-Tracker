import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// A code chunk failed to load — usually an old cached page asking for files a
// newer deploy removed. Reload once to pick up the current version.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'chunkReloadAt'
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // storage unavailable — still try one reload
  }
  if (Date.now() - last > 10_000) {
    event.preventDefault()
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
