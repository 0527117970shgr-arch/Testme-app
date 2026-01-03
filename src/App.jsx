import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import BookingForm from './components/BookingForm';
import AdminDashboard from './components/AdminDashboard';
import FloatingWhatsApp from './components/FloatingWhatsApp';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <main style={{ minHeight: '80vh' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/booking" element={<BookingForm />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        {/* Contact/Footer is inside Home, but maybe we want a global footer? 
            For now, keeping it in Home as per original design, 
            or we can move it here if we want it on all pages. 
            Let's keep it in Home for now to focus the booking page. 
        */}
        <FloatingWhatsApp />
      </div>
    </Router>
  )
}

export default App
