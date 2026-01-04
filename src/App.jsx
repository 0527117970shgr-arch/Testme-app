import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Process from './components/Process';
import Contact from './components/Contact';
import BookingForm from './components/BookingForm';
import AdminDashboard from './components/AdminDashboard';
import DocumentChat from './components/DocumentChat';
import { LanguageProvider } from './context/LanguageContext';

const App = () => {
  const [showChat, setShowChat] = React.useState(false);

  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <>
                <Header onToggleChat={() => setShowChat(!showChat)} />
                <Hero />
                <div id="services">
                  <Services />
                </div>
                <div id="process">
                  <Process />
                </div>
                <div id="ai-chat">
                  <DocumentChat isOpen={showChat} onToggle={() => setShowChat(!showChat)} />
                </div>
                <div id="booking">
                  <BookingForm />
                </div>
                <div id="contact">
                  <Contact />
                </div>
              </>
            } />
            <Route path="/admin" element={
              <>
                <Header onToggleChat={() => setShowChat(!showChat)} />
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
