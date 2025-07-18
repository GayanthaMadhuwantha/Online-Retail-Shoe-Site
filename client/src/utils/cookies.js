import Cookies from 'js-cookie';

// Cookie consent management
export const cookieConsent = {
  get: () => {
    const consent = Cookies.get('cookie-consent');
    return consent ? JSON.parse(consent) : null;
  },

  set: (preferences) => {
    Cookies.set('cookie-consent', JSON.stringify(preferences), {
      expires: 365, // 1 year
      secure: true,
      sameSite: 'strict'
    });
  },

  hasConsent: () => {
    return cookieConsent.get() !== null;
  },

  canUse: (type) => {
    const consent = cookieConsent.get();
    return consent ? consent[type] : false;
  }
};

// User preferences management
export const userPreferences = {
  get: () => {
    const defaultPrefs = {
      theme: 'light',
      currency: 'USD',
      language: 'en',
      notifications: true,
      autoSave: true
    };

    if (!cookieConsent.canUse('functional')) {
      return defaultPrefs;
    }

    const prefs = Cookies.get('user-preferences');
    return prefs ? { ...defaultPrefs, ...JSON.parse(prefs) } : defaultPrefs;
  },

  set: (preferences) => {
    if (!cookieConsent.canUse('functional')) {
      console.warn('Functional cookies not allowed');
      return;
    }

    const currentPrefs = userPreferences.get();
    const newPrefs = { ...currentPrefs, ...preferences };
    
    Cookies.set('user-preferences', JSON.stringify(newPrefs), {
      expires: 365,
      secure: true,
      sameSite: 'strict'
    });
  },

  clear: () => {
    Cookies.remove('user-preferences');
  }
};

// Shopping cart persistence
export const cartCookies = {
  get: () => {
    if (!cookieConsent.canUse('functional')) {
      return [];
    }

    const cart = Cookies.get('guest-cart');
    return cart ? JSON.parse(cart) : [];
  },

  set: (items) => {
    if (!cookieConsent.canUse('functional')) {
      return;
    }

    Cookies.set('guest-cart', JSON.stringify(items), {
      expires: 7, // 1 week
      secure: true,
      sameSite: 'strict'
    });
  },

  clear: () => {
    Cookies.remove('guest-cart');
  }
};

// Recently viewed products
export const recentlyViewed = {
  get: () => {
    if (!cookieConsent.canUse('functional')) {
      return [];
    }

    const recent = Cookies.get('recently-viewed');
    return recent ? JSON.parse(recent) : [];
  },

  add: (productId) => {
    if (!cookieConsent.canUse('functional')) {
      return;
    }

    const recent = recentlyViewed.get();
    const filtered = recent.filter(id => id !== productId);
    const updated = [productId, ...filtered].slice(0, 10); // Keep last 10

    Cookies.set('recently-viewed', JSON.stringify(updated), {
      expires: 30, // 30 days
      secure: true,
      sameSite: 'strict'
    });
  },

  clear: () => {
    Cookies.remove('recently-viewed');
  }
};

// Analytics tracking
export const analytics = {
  trackEvent: (event, data) => {
    if (!cookieConsent.canUse('analytics')) {
      return;
    }

    // Simulate analytics tracking
    console.log('Analytics Event:', event, data);
    
    // Store in cookie for demo purposes
    const events = Cookies.get('analytics-events');
    const eventList = events ? JSON.parse(events) : [];
    eventList.push({
      event,
      data,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 events
    const trimmed = eventList.slice(-50);
    
    Cookies.set('analytics-events', JSON.stringify(trimmed), {
      expires: 1, // 1 day
      secure: true,
      sameSite: 'strict'
    });
  },

  getEvents: () => {
    if (!cookieConsent.canUse('analytics')) {
      return [];
    }

    const events = Cookies.get('analytics-events');
    return events ? JSON.parse(events) : [];
  }
};

// Session management
export const sessionCookies = {
  setRememberMe: (token) => {
    Cookies.set('remember-token', token, {
      expires: 30, // 30 days
      secure: true,
      sameSite: 'strict',
      httpOnly: false // Note: In production, this should be httpOnly and handled server-side
    });
  },

  getRememberMe: () => {
    return Cookies.get('remember-token') || null;
  },

  clearRememberMe: () => {
    Cookies.remove('remember-token');
  },

  setSessionId: (sessionId) => {
    Cookies.set('session-id', sessionId, {
      secure: true,
      sameSite: 'strict'
    });
  },

  getSessionId: () => {
    return Cookies.get('session-id') || null;
  }
};

// Clear all cookies
export const clearAllCookies = () => {
  const cookieNames = [
    'cookie-consent',
    'user-preferences', 
    'guest-cart',
    'recently-viewed',
    'analytics-events',
    'remember-token',
    'session-id'
  ];

  cookieNames.forEach(name => {
    Cookies.remove(name);
  });
};