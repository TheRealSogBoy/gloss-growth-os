import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- MOBILE DRAG & DROP POLYFILL ---
import { polyfill } from "mobile-drag-drop";
// Opcional pero recomendado para simular el scroll al arrastrar
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";

polyfill({
    // Hold to drag enables vertical scrolling when a touch happens, 
    // and only starts drag when user presses down for X milliseconds
    holdToDrag: 150, 
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});
// ------------------------------------

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
