import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'  // ← ADD THIS
import LLMDashboard from './pages/DashBoard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LLMDashboard />
  </StrictMode>,
)