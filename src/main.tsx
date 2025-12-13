import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import App from './App'
import './index.css'

// Configurar StatusBar para iOS - precisa ser async
async function configureStatusBar() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Primeiro, fazer o webview passar por baixo da status bar
      await StatusBar.setOverlaysWebView({ overlay: true })
      // Depois, definir o estilo (texto branco)
      await StatusBar.setStyle({ style: Style.Light })
      console.log('StatusBar configurada com sucesso')
    } catch (error) {
      console.error('Erro ao configurar StatusBar:', error)
    }
  }
}

// Chamar a configuração
configureStatusBar()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
