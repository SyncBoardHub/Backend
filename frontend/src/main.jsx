import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import ToastViewport from './components/ui/ToastViewport.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <ToastViewport />
      </ThemeProvider>
    </ToastProvider>
  </StrictMode>,
)
