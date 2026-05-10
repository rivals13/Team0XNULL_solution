import React from 'react'
import Navbar from './layout/Navbar'
import Footer from './layout/Footer'
import Home from './pages/Home'
import Statement from './pages/Statement'
import Schedules from './pages/Schedules'
import More from './pages/More'
import { Routes, Route } from 'react-router-dom'
import SchedulesList from './pages/SchedulesList'

const App = () => {
  return (
    <div>
    
     <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/statement" element={<Statement />} />
        <Route path="/schedules" element={<SchedulesList />} />
        <Route path="/schedules-list" element={<SchedulesList />} />
        <Route path="/more" element={<More />} />
        <Route path="/footer" element={<Footer />} /> 
      </Routes>
  
     <Footer />
    </div>
  )
}

export default App
