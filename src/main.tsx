import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

try {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
} catch (error: any) {
    console.error('Final Render Error:', error);
    document.body.innerHTML = `
        <div style="padding: 20px; color: red; font-family: sans-serif;">
            <h1>Erro ao carregar o site</h1>
            <p>Ocorreu um erro durante a inicialização: ${error?.message || 'Erro desconhecido'}</p>
            <pre>${error?.stack || ''}</pre>
        </div>
    `;
}
