import Navbar from './layout/Navbar'
import Footer from './layout/Footer'
import Home from './pages/Home'
import Statement from './pages/Statement'
import More from './pages/More'
import { Routes, Route } from 'react-router-dom'
import SchedulesList from './pages/SchedulesList'
import AutomationDashboard from './pages/AutomationDashboard'

const App = () => {
  return (
    <div>
    
     <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/statement" element={<Statement />} />
        <Route path="/schedules" element={<SchedulesList />} />
        <Route path="/schedules-list" element={<SchedulesList />} />
        <Route path="/automation-dashboard" element={<AutomationDashboard />} />
        <Route path="/automation" element={<AutomationDashboard />} />
        <Route path="/more" element={<More />} />
        <Route path="/footer" element={<Footer />} /> 
      </Routes>
  
     <Footer />
    </div>
  )
}

export default App
