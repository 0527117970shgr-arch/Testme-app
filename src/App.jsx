import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import BookingForm from './components/BookingForm';
import AdminDashboard from './components/AdminDashboard';
import DocumentChat from './components/DocumentChat';
import { LanguageProvider } from './context/LanguageContext';

const App = () => {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <>
                <Header />
                <Hero />
                <div id="services">
                  <Services />
                </div>
                <div id="ai-chat">
                  <DocumentChat />
                </div>
                <div id="booking">
                  <BookingForm />
                </div>
              </>
            } />
            <Route path="/admin" element={
              <>
                <Header />
                <AdminDashboard />
              </>
            } />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
};

export default App;
