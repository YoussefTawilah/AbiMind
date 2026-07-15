import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { AbiProfileProvider } from './contexts/AbiProfileContext.tsx'

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('[AbiMind PWA] Offline bereit')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AbiProfileProvider>
        <App />
      </AbiProfileProvider>
    </AuthProvider>
  </StrictMode>,
)
