/**
 * Teacher Dashboard Script
 * QR Generation, Attendance Tracking, and Statistics
 */

// ==================== Auth Check ====================
const currentUser = requireAuth('teacher');
if (!currentUser) throw new Error('Authentication required');

// ==================== State Variables ====================
let qrTimerInterval = null;
let timeRemaining = 0;
let currentQRData = null;
let qrCodeInstance = null;

// ==================== Initialize Dashboard ====================
function initDashboard() {
    // Set user info in sidebar
    document.getElementById('sidebarUserName').textContent = currentUser.fullName;
    document.getElementById('sidebarUserRole').textContent = currentUser.role === 'teacher' ? 'معلم' : 'طالب';
    document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0);
    
    // Load data
    loadStats();
    loadAttendanceRecords();
}

// ==================== Load Statistics ====================
async function loadStats() {
    try {
        // Count lectures
        const lecturesSnapshot = await lecturesCollection.get();
        document.getElementById('totalLectures').textContent = lecturesSnapshot.size;
        
        // Count attendance records
        const attendanceSnapshot = await attendanceCollection.get();
        document.getElementById('totalAttendance').textContent = attendanceSnapshot.size;
        
        // Count questions
        const questionsSnapshot = await questionsCollection.get();
        document.getElementById('totalQuestions').textContent = questionsSnapshot.size;
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
    }
}

// ==================== Generate QR Code ====================
async function generateQRCode() {
    const courseName = document.getElementById('courseName').value.trim();
    const lectureTitle = document.getElementById('lectureTitle').value.trim();
    const duration = parseInt(document.getElementById('qrDuration').value);
    
    // Validate
    if (!courseName) return showQRMessage('يرجى إدخال اسم المقرر', 'error');
    if (!lectureTitle) return showQRMessage('يرجى إدخال عنوان المحاضرة', 'error');
    if (!duration || duration < 1 || duration > 60) return showQRMessage('المدة يجب أن تكون بين 1 و 60 دقيقة', 'error');
    
    // Create QR data
    currentQRData = {
        courseName,
        lectureTitle,
        sessionId: generateUniqueId(),
        teacherId: currentUser.id,
        teacherName: currentUser.fullName,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + duration * 60000).toISOString(),
        duration
    };
    
    // Save lecture to Firebase
    try {
        await lecturesCollection.add({
            ...currentQRData,
            generatedAt: getServerTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(new Date(currentQRData.expiresAt)),
            attendanceCount: 0
        });
        console.log('✅ Lecture saved to Firebase');
    } catch (error) {
        console.error('❌ Error saving lecture:', error);
    }
    
    // Generate QR code image
    const qrContainer = document.getElementById('qrCodeDisplay');
    qrContainer.innerHTML = '';
    qrCodeInstance = new QRCode(qrContainer, {
        text: JSON.stringify(currentQRData),
        width: 250,
        height: 250,
        colorDark: '#03034d',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Show QR container
    document.getElementById('qrContainer').style.display = 'block';
    
    // Start timer
    startQRTimer(duration * 60);
    
    // Update stats
    loadStats();
    
    showQRMessage('✅ تم إنشاء كود QR بنجاح!', 'success');
}

// ==================== QR Timer ====================
function startQRTimer(seconds) {
    clearInterval(qrTimerInterval);
    timeRemaining = seconds;
    updateTimerDisplay();
    
    const progressBar = document.getElementById('timerProgress');
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';
    progressBar.offsetHeight;
    progressBar.style.transition = `width ${seconds}s linear`;
    progressBar.style.width = '0%';
    
    qrTimerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 60 && timeRemaining > 0) {
            document.getElementById('timerDisplay').classList.add('timer-warning');
            document.getElementById('timerStatus').textContent = '⚠️ الكود على وشك الانتهاء';
        }
        
        if (timeRemaining <= 0) {
            clearInterval(qrTimerInterval);
            document.getElementById('timerDisplay').textContent = '00:00';
            document.getElementById('timerDisplay').classList.add('timer-danger');
            document.getElementById('timerStatus').textContent = '❌ انتهت صلاحية الكود';
            document.getElementById('qrCodeDisplay').innerHTML = '<p style="padding: 30px; color: #dc3545;">انتهت صلاحية الكود</p>';
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function cancelQRCode() {
    clearInterval(qrTimerInterval);
    document.getElementById('qrContainer').style.display = 'none';
    document.getElementById('timerDisplay').classList.remove('timer-warning', 'timer-danger');
    document.getElementById('qrCodeDisplay').innerHTML = '';
    currentQRData = null;
}

function printQRCode() {
    if (!currentQRData) return;
    const img = document.getElementById('qrCodeDisplay').querySelector('img');
    if (!img) return;
    
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>QR Code - ${currentQRData.courseName}</title>
        <style>body{text-align:center;padding:30px;font-family:sans-serif;} 
        img{border:3px solid #03034d;border-radius:15px;padding:15px;max-width:300px;}
        h2{color:#03034d;} p{color:#666;}</style></head>
        <body><h2>${currentQRData.courseName}</h2><p>${currentQRData.lectureTitle}</p>
        ${img.outerHTML}<p style="margin-top:20px;">📱 امسح الكود لتسجيل الحضور</p></body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

// ==================== Load Attendance Records ====================
async function loadAttendanceRecords() {
    try {
        const snapshot = await attendanceCollection
            .orderBy('scannedAt', 'desc')
            .limit(50)
            .get();
        
        const tbody = document.getElementById('attendanceBody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">لا توجد سجلات حضور بعد</td></tr>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <tr>
                    <td>${data.studentName || 'غير معروف'}</td>
                    <td>${data.courseName || '-'}</td>
                    <td>${data.lectureTitle || '-'}</td>
                    <td>${formatTimestamp(data.scannedAt)}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error loading attendance:', error);
    }
}

// ==================== Show Message ====================
function showQRMessage(message, type) {
    const container = document.getElementById('qrMessage');
    if (type === 'error') {
        container.innerHTML = `<div class="global-error">${message}</div>`;
    } else {
        container.innerHTML = `<div class="global-success">${message}</div>`;
        setTimeout(() => container.innerHTML = '', 3000);
    }
}

// ==================== Logout ====================
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// ==================== Initialize ====================
initDashboard();
console.log('🚀 Teacher Dashboard Ready');