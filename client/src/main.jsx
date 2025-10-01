import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'jotai'
import { DevTools } from 'jotai-devtools'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider>
      <DevTools theme="dark" position="bottom-right" initialIsOpen={false} />
      <App />
    </Provider>
  </StrictMode>
)
