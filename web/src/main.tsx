import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TrainingProvider } from './context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrainingProvider>
      <App />
    </TrainingProvider>
  </StrictMode>,
)
