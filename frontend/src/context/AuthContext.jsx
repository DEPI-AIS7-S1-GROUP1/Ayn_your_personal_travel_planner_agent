import { createContext, useContext, useState, useEffect } from 'react';
import api, { SESSION_EXPIRED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('ayn_auth_token');
    const saved = localStorage.getItem('ayn_user');
    if (token && saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.loggedIn) {
          return parsed;
        }
      } catch {
        // ignore parse error
      }
    }
    // No token -> not logged in
    return { loggedIn: false };
  });

  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // api.js fires this when the server rejects the saved token (expired or signed with an old key).
  useEffect(() => {
    const onExpired = () => {
      setUser({ loggedIn: false });
      setSessionExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    if (user && user.loggedIn) {
      localStorage.setItem('ayn_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ayn_user');
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await api.login(email, password);
      const name = data.user.email.split('@')[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      const userObj = {
        id: data.user.id,
        name: capitalized,
        email: data.user.email,
        onboarding_completed: Boolean(data.user.onboarding_completed),
        loggedIn: true,
      };
      setUser(userObj);
      setSessionExpired(false);
      return userObj;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await api.signup(email, password);
      const name = data.user.email.split('@')[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      const userObj = {
        id: data.user.id,
        name: capitalized,
        email: data.user.email,
        onboarding_completed: Boolean(data.user.onboarding_completed),
        loggedIn: true,
      };
      setUser(userObj);
      return userObj;
    } catch (err) {
      setAuthError(err.message || 'Signup failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser({ loggedIn: false });
    localStorage.removeItem('ayn_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoggedIn: !!user?.loggedIn,
        login,
        signup,
        logout,
        authError,
        loading,
        sessionExpired,
        clearSessionExpired: () => setSessionExpired(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
