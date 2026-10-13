/**
 * Ayn API Client (docs/api-contract.md)
 *
 * Base URL: http://localhost:8000/api
 * Handles Bearer token authentication and structured error responses.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('ayn_auth_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('ayn_auth_token', token);
    } else {
      localStorage.removeItem('ayn_auth_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('ayn_auth_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (_err) {
      // Network failure
      const error = new Error('Network error: Cannot connect to the server.');
      error.status = 502;
      error.code = 'NETWORK_ERROR';
      throw error;
    }

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errMessage = (data && data.error && data.error.message) || response.statusText || 'Request failed';
      const errCode = (data && data.error && data.error.code) || 'HTTP_ERROR';
      const error = new Error(errMessage);
      error.status = response.status;
      error.code = errCode;
      error.data = data;
      throw error;
    }

    return data;
  }

  // --- Auth ---
  async login(email, password) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async signup(email, password) {
    const data = await this.request('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // --- Profile ---
  async getProfile() {
    return this.request('/profile', { method: 'GET' });
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // --- Currencies ---
  async getCurrencies() {
    return this.request('/currencies', { method: 'GET' });
  }

  // --- Trips ---
  async getTrips() {
    return this.request('/trips', { method: 'GET' });
  }

  async getTrip(tripId) {
    return this.request(`/trips/${tripId}`, { method: 'GET' });
  }

  async createTrip(tripData) {
    return this.request('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData)
    });
  }

  // --- Plans ---
  async getPlan(planId) {
    return this.request(`/plans/${planId}`, { method: 'GET' });
  }

  async updatePlan(planId, updates) {
    return this.request(`/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async confirmPlan(planId) {
    return this.request(`/plans/${planId}/confirm`, {
      method: 'POST'
    });
  }

  async cancelPlan(planId) {
    return this.request(`/plans/${planId}/cancel`, {
      method: 'POST'
    });
  }

  async chatPlan(planId, { conversation_id, message }) {
    return this.request(`/plans/${planId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ conversation_id, message })
    });
  }

  // --- Ratings ---
  async createRating(ratingData) {
    return this.request('/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData)
    });
  }
}

export const api = new ApiClient();
export default api;
