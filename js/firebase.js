/**
 * Firebase Configuration
 * 
 * ⚠️ IMPORTANT: Replace these values with your actual Firebase project settings!
 * 
 * To get these values:
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Create a new project or select existing
 * 3. Click "Add app" → Web app (</> icon)
 * 4. Register app name: "Smart QR System"
 * 5. Copy the firebaseConfig object and paste below
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCoXYPiAnkrpz-zfJBH8nLm0HJqPSt1QeU",
    authDomain: "smart-qr-d6e7a.firebaseapp.com",
    projectId: "smart-qr-d6e7a",
    storageBucket: "smart-qr-d6e7a.firebasestorage.app",
    messagingSenderId: "873877612028",
    appId: "1:873877612028:web:53b6a0b998eb98696cbe79",
    measurementId: "G-SE5H3D8V64"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore database
const db = firebase.firestore();

// Enable offline persistence for better mobile experience
db.enablePersistence()
    .then(() => console.log("✅ Offline persistence enabled"))
    .catch((err) => console.warn("⚠️ Offline persistence failed:", err.code));

// ==================== Collection References ====================
const usersCollection = db.collection("users");           // User accounts
const lecturesCollection = db.collection("lectures");     // Lecture sessions
const attendanceCollection = db.collection("attendance"); // Attendance records
const questionsCollection = db.collection("questions");   // Questions bank
const answersCollection = db.collection("answers");       // Student answers

// ==================== Helper Functions ====================

/**
 * Generate a unique ID for documents
 * @returns {string} Unique identifier
 */
function generateUniqueId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get server timestamp from Firebase
 * @returns {Object} Firebase server timestamp
 */
function getServerTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

/**
 * Format a Firebase timestamp to readable date/time
 * @param {Object} timestamp - Firebase timestamp object
 * @returns {string} Formatted date/time string
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== Log Status ====================
console.log("🔥 Firebase initialized successfully");
console.log("📁 Firestore connected");
console.log("📚 Collections: users | lectures | attendance | questions | answers");
console.log("⚠️  Don't forget to replace firebaseConfig with your own project settings!");