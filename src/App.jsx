import React from 'react'
import { Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Statement from './pages/Statement'
import Bills from './pages/Bills'
import HealthScore from './pages/HealthScore'
import More from './pages/More'
import SchedulesList from './pages/SchedulesList'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/statement" element={<Statement />} />
      <Route path="/bills" element={<Bills />} />
      <Route path="/health" element={<HealthScore />} />
      <Route path="/more" element={<More />} />
      <Route path="/schedules" element={<SchedulesList />} />
      <Route path="/schedules-list" element={<SchedulesList />} />
    </Routes>
  )
}

export default App
