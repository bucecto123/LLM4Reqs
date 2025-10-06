import React, { useEffect, useState } from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LLMDashboard from './pages/DashBoard'
import AuthPages from './pages/Login_SignUp'
import { getAuthToken } from './utils/api'

function App() {
  const [token, setToken] = useState(() => getAuthToken());

  useEffect(() => {
    function onAuth() { setToken(getAuthToken()); }
    window.addEventListener('authChanged', onAuth);
    return () => window.removeEventListener('authChanged', onAuth);
  }, []);

  if (!token) {
    return <AuthPages />;
  }

  return <LLMDashboard />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)