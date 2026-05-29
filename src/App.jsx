import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import Home          from './pages/Home'
import Login         from './pages/Login'
import Register      from './pages/Register'
import Statement     from './pages/Statement'
import Bills         from './pages/Bills'
import HealthScore   from './pages/HealthScore'
import More          from './pages/More'
import SchedulesList from './pages/SchedulesList'
import ChatbotPage   from './pages/chatboat'

// Inject Google Fonts once at app root so every page has icons + font
function useFonts() {
  useEffect(() => {
    const id = "esewa-gfonts";
    if (document.getElementById(id)) return;
    const link  = document.createElement("link");
    link.id     = id;
    link.rel    = "stylesheet";
    link.href   = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
    document.head.appendChild(link);
  }, []);
}

const App = () => {
  useFonts(); // ← ensures Material Symbols loads on every page

  return (
    <Routes>
      <Route path="/"               element={<Home />}          />
      <Route path="/login"          element={<Login />}         />
      <Route path="/register"       element={<Register />}      />
      <Route path="/statement"      element={<Statement />}     />
      <Route path="/bills"          element={<Bills />}         />
      <Route path="/health"         element={<HealthScore />}   />
      <Route path="/more"           element={<More />}          />
      <Route path="/schedules"      element={<SchedulesList />} />
      <Route path="/schedules-list" element={<SchedulesList />} />
      <Route path="/chatbot"        element={<ChatbotPage />}   />
    </Routes>
  )
}

export default App