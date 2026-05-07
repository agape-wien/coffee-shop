import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import OrderView from './views/OrderView.js'
import BaristaView from './views/BaristaView.js'
import CounterView from './views/CounterView.js'
import PickupView from './views/PickupView.js'
import ManagementView from './views/ManagementView.js'

export default function App() {
  return (
    <>
    <CssBaseline />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/order" element={<OrderView />} />
        <Route path="/barista" element={<BaristaView />} />
        <Route path="/counter" element={<CounterView />} />
        <Route path="/pickup" element={<PickupView />} />
        <Route path="/management" element={<ManagementView />} />
        <Route path="/" element={<Navigate to="/order" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}
