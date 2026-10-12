import React, { useState } from 'react';
import { Navbar, Footer, Button } from './components';
import { Home } from './pages/Home';
import { ComponentsTestPage } from './pages/ComponentsTest';
import './App.css';

function App() {
  const [currentRoute, setCurrentRoute] = useState('home');

  const handleNavigate = (route) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="ayn-app">
      {/* Reusable Navbar */}
      <Navbar
        activeLink={currentRoute}
        onNavigate={handleNavigate}
        user={{ name: 'Sarah', loggedIn: true }}
        onLogout={() => alert('Logged out')}
      />

      {/* Main View Router */}
      <main className="ayn-main-content">
        {currentRoute === 'home' && <Home onNavigate={handleNavigate} />}

        {currentRoute === 'components' && <ComponentsTestPage />}

        {currentRoute === 'about' && (
          <div className="ayn-placeholder-screen">
            <h1 className="ayn-placeholder-screen__title">About Ayn</h1>
            <p className="ayn-placeholder-screen__desc">
              Ayn (أين) means &quot;where&quot; in Arabic. It is your intelligent travel partner crafted for Egypt.
            </p>
            <Button variant="primary" onClick={() => handleNavigate('home')}>
              Back to Home
            </Button>
          </div>
        )}

        {currentRoute === 'features' && (
          <div className="ayn-placeholder-screen">
            <h1 className="ayn-placeholder-screen__title">Features</h1>
            <p className="ayn-placeholder-screen__desc">
              Discover Ayn&apos;s personalized itinerary generator, dynamic budget balancing, and interactive refinement.
            </p>
            <Button variant="primary" onClick={() => handleNavigate('home')}>
              Back to Home
            </Button>
          </div>
        )}

        {currentRoute === 'trips' && (
          <div className="ayn-placeholder-screen">
            <h1 className="ayn-placeholder-screen__title">Your Trips</h1>
            <p className="ayn-placeholder-screen__desc">
              View your confirmed and draft Egyptian adventures.
            </p>
            <Button variant="primary" onClick={() => handleNavigate('destination')}>
              Plan a new trip
            </Button>
          </div>
        )}

        {currentRoute === 'destination' && (
          <div className="ayn-placeholder-screen">
            <h1 className="ayn-placeholder-screen__title">Destination Selection</h1>
            <p className="ayn-placeholder-screen__desc">
              Select your Egyptian destination, dates, budget and travelers.
            </p>
            <Button variant="secondary" onClick={() => handleNavigate('home')}>
              Back to Home
            </Button>
          </div>
        )}

        {currentRoute === 'survey' && (
          <div className="ayn-placeholder-screen">
            <h1 className="ayn-placeholder-screen__title">Travel Survey</h1>
            <p className="ayn-placeholder-screen__desc">
              Help Ayn understand your travel style, pace, and interests.
            </p>
            <Button variant="secondary" onClick={() => handleNavigate('home')}>
              Back to Home
            </Button>
          </div>
        )}
      </main>

      {/* Reusable Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
