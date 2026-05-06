/**
 * Authentication Logic
 * Handles registration and login with Firebase
 */

// ==================== Registration ====================

/**
 * Register a new user in Firebase
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user data
 */
async function registerUser(userData) {
    try {
        // Check if email already exists
        const emailSnapshot = await usersCollection
            .where('email', '==', userData.email)
            .limit(1)
            .get();
        
        if (!emailSnapshot.empty) {
            throw new Error('This email is already registered. Please use a different email.');
        }
        
        // Check if national ID already exists
        const idSnapshot = await usersCollection
            .where('nationalId', '==', userData.nationalId)
            .limit(1)
            .get();
        
        if (!idSnapshot.empty) {
            throw new Error('This National ID is already registered.');
        }
        
        // Create user document
        const newUser = {
            fullName: userData.fullName,
            email: userData.email,
            nationalId: userData.nationalId,
            password: userData.password, // ⚠️ In production, HASH the password!
            role: userData.role,
            createdAt: getServerTimestamp(),
            userId: generateUniqueId()
        };
        
        // Save to Firestore
        const docRef = await usersCollection.add(newUser);
        
        console.log('✅ User registered successfully!');
        console.log('🆔 Firestore Document ID:', docRef.id);
        
        // Return user data (without password)
        return {
            id: docRef.id,
            fullName: newUser.fullName,
            email: newUser.email,
            nationalId: newUser.nationalId,
            role: newUser.role,
            createdAt: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        throw error;
    }
}

// ==================== Login ====================

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Authenticated user data
 */
async function loginUser(email, password) {
    try {
        // Query for user with matching email
        const snapshot = await usersCollection
            .where('email', '==', email)
            .limit(1)
            .get();
        
        // Check if user exists
        if (snapshot.empty) {
            throw new Error('Invalid email or password. Please try again.');
        }
        
        // Get user data
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        
        // Check password (plain text comparison for demo)
        // ⚠️ In production, use a proper hashing library like bcrypt
        if (userData.password !== password) {
            throw new Error('Invalid email or password. Please try again.');
        }
        
        console.log('✅ User authenticated:', userData.email);
        
        // Return user data (without password)
        return {
            id: userDoc.id,
            fullName: userData.fullName,
            email: userData.email,
            nationalId: userData.nationalId,
            role: userData.role,
            createdAt: userData.createdAt
        };
        
    } catch (error) {
        console.error('❌ Login error:', error);
        throw error;
    }
}

/**
 * Process forgot password request
 * @param {string} emailOrId - Email or National ID to search for
 * @returns {Promise<Object>} Found user info (or throws error if not found)
 */
async function findUserForReset(emailOrId) {
    try {
        // Search by email first
        let snapshot = await usersCollection
            .where('email', '==', emailOrId)
            .limit(1)
            .get();
        
        // If not found, search by national ID
        if (snapshot.empty) {
            snapshot = await usersCollection
                .where('nationalId', '==', emailOrId)
                .limit(1)
                .get();
        }
        
        if (snapshot.empty) {
            throw new Error('No account found with this email or national ID.');
        }
        
        const userData = snapshot.docs[0].data();
        
        console.log('🔑 Password reset requested for:', userData.email);
        
        return {
            fullName: userData.fullName,
            email: userData.email
        };
        
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        throw error;
    }
}

// ==================== Helper Functions ====================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate national ID (numeric only, specific length)
 * @param {string} nationalId - National ID to validate
 * @returns {boolean} True if valid
 */
function isValidNationalId(nationalId) {
    return /^\d+$/.test(nationalId) && nationalId.length === 14;
}

/**
 * Toggle password visibility
 * @param {string} inputId - ID of the password input element
 * @param {string} iconId - ID of the toggle icon element
 */
function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

console.log('🔐 Authentication module ready');