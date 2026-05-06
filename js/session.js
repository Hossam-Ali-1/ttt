/**
 * Session Management
 * Handles user login state, Remember Me, and auto-login
 */

// Session storage keys
const SESSION_KEY = 'smartQR_user_session';
const REMEMBER_ME_KEY = 'smartQR_remember_me';
const CURRENT_USER_KEY = 'smartQR_current_user';

/**
 * Save user session to localStorage (if Remember Me is checked)
 * @param {Object} userData - User data to save
 * @param {boolean} rememberMe - Whether to persist the session
 */
function saveSession(userData, rememberMe = false) {
    // Always store current user for the active session
    const currentUser = {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        nationalId: userData.nationalId,
        role: userData.role,
        loginTime: Date.now()
    };
    
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    
    // If Remember Me is checked, also save to localStorage
    if (rememberMe) {
        const sessionData = {
            ...currentUser,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        console.log('💾 Session saved (Remember Me enabled)');
    }
}

/**
 * Get the current logged-in user
 * @returns {Object|null} Current user data or null if not logged in
 */
function getCurrentUser() {
    // First check sessionStorage (current browser session)
    const sessionUser = sessionStorage.getItem(CURRENT_USER_KEY);
    if (sessionUser) {
        try {
            return JSON.parse(sessionUser);
        } catch (e) {
            console.error('❌ Error parsing session user:', e);
        }
    }
    
    // Then check localStorage (Remember Me)
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            
            // Check if session has expired
            if (Date.now() < session.expiresAt) {
                // Restore to sessionStorage
                const currentUser = {
                    id: session.id,
                    fullName: session.fullName,
                    email: session.email,
                    nationalId: session.nationalId,
                    role: session.role,
                    loginTime: session.loginTime
                };
                sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
                return currentUser;
            } else {
                // Session expired - clean up
                clearSession();
            }
        } catch (e) {
            console.error('❌ Error parsing saved session:', e);
        }
    }
    
    return null;
}

/**
 * Clear all session data (logout)
 */
function clearSession() {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    console.log('🗑️ Session cleared');
}

/**
 * Check if user is logged in and has the correct role
 * @param {string} requiredRole - The role required to access the page ('teacher' or 'student')
 * @returns {Object|null} User data if authenticated, null otherwise
 */
function requireAuth(requiredRole = null) {
    const user = getCurrentUser();
    
    if (!user) {
        // No user logged in - redirect to login
        console.warn('⚠️ No authenticated user - redirecting to login');
        window.location.href = 'login.html';
        return null;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        // Wrong role - redirect to appropriate page
        console.warn(`⚠️ Role mismatch: expected ${requiredRole}, got ${user.role}`);
        if (user.role === 'teacher') {
            window.location.href = 'teacher.html';
        } else {
            window.location.href = 'student.html';
        }
        return null;
    }
    
    return user;
}

/**
 * Redirect user to their dashboard based on role
 * @param {string} role - User role
 */
function redirectToDashboard(role) {
    if (role === 'teacher') {
        window.location.href = 'teacher.html';
    } else if (role === 'student') {
        window.location.href = 'student.html';
    } else {
        window.location.href = 'login.html';
    }
}

console.log('🔐 Session management ready');