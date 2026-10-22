import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Footer, AuthModal, ErrorBoundary } from './components';
import { Home } from './pages/Home';
import { DraftPlan } from './pages/DraftPlan';
import { Trips } from './pages/Trips';
import { Destination } from './pages/Destination';
import { Options } from './pages/Options';
import { Confirmed } from './pages/Confirmed';
import { Rating } from './pages/Rating';
import { Survey } from './pages/Survey';
import { ComponentsTestPage } from './pages/ComponentsTest';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { useScrollReveal } from './hooks/useScrollReveal';
import './App.css';

function AppLayout() {
  const { user, logout, sessionExpired, clearSessionExpired } = useAuth();
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });
  const navigate = useNavigate();
  const location = useLocation();
  useScrollReveal(location.pathname);

  // A new page starts at the top (links to #about / #features scroll themselves).
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  const handleFooterNavigate = (key) => {
    if (key === 'home') {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (key === 'about' || key === 'features') {
      if (location.pathname !== '/') {
        navigate(`/#${key}`);
        setTimeout(() => {
          document.getElementById(key)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(key)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (key === 'destination') {
      navigate('/destination');
    } else if (key === 'survey') {
      navigate('/survey');
    } else if (key === 'trips') {
      navigate('/trips');
    } else if (key === 'components') {
      navigate('/components');
    }
  };

  return (
    <div className="ayn-app">
      {/* Dynamic Navbar */}
      <Navbar
        user={user}
        onLogout={logout}
        onOpenLogin={() => setAuthModal({ isOpen: true, mode: 'login' })}
        onOpenSignup={() => setAuthModal({ isOpen: true, mode: 'signup' })}
      />

      {/* Main Content Routed */}
      <main className="ayn-main-content">
        <ErrorBoundary>
          {/* Keyed by route so each page plays the enter animation (styles/motion.css). */}
          <div key={location.pathname} className="ayn-route">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plan/:id" element={<DraftPlan />} />
            <Route path="/plan/:id/options" element={<Options />} />
            <Route path="/plan/:id/confirmed" element={<Confirmed />} />
            <Route path="/plan/:id/rate" element={<Rating />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/destination" element={<Destination />} />
            <Route path="/survey" element={<Survey />} />
            <Route path="/profile" element={<Survey />} />
            {import.meta.env.DEV && (
              <Route path="/components" element={<ComponentsTestPage />} />
            )}
            <Route path="*" element={<Home />} />
          </Routes>
          </div>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleFooterNavigate} />

      {/* Auth Modal for Login / Signup */}
      {/* Also opens by itself when the saved login expires (sessionExpired from AuthContext). */}
      <AuthModal
        isOpen={authModal.isOpen || sessionExpired}
        initialMode={sessionExpired ? 'login' : authModal.mode}
        onClose={() => {
          setAuthModal({ isOpen: false, mode: 'login' });
          clearSessionExpired();
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
