import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/bricolage-grotesque/wdth.css'
import '@fontsource-variable/figtree'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)

// Ask the browser not to evict saved progress, and cache the app for offline use.
navigator.storage?.persist?.()
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
