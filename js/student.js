/**
 * Student Attendance Script - Version 2 (Fixed Scanner)
 */

// ==================== Auth Check ====================
const currentUser = requireAuth('student');
if (!currentUser) throw new Error('Authentication required');

// ==================== State Variables ====================
let html5QrCode = null;
let isScanning = false;

// ==================== Initialize ====================
function initStudent() {
    document.getElementById('sidebarUserName').textContent = currentUser.fullName;
    document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0);
    document.getElementById('displayName').textContent = currentUser.fullName;
    document.getElementById('displayEmail').textContent = currentUser.email;
    
    loadMyAttendance();
    
    console.log('👤 Student ready:', currentUser.fullName);
}

// ==================== Start Scanner ====================
async function startScanner() {
    console.log('📷 Starting camera...');
    
    // Check if library is loaded
    if (typeof Html5Qrcode === 'undefined') {
        alert('❌ تعذر تحميل مكتبة QR. تأكد من اتصالك بالإنترنت.');
        return;
    }
    
    // Hide start button, show stop button
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'inline-block';
    
    // Clear previous scanner
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch(e) {
            console.log('Clearing old scanner...');
        }
    }
    
    // Show scanning status
    document.getElementById('scanStatus').innerHTML = 
        '<p style="color: #2196f3;">🔍 جاري البحث عن كود QR... وجه الكاميرا نحو الكود</p>';
    
    try {
        // Create new scanner
        html5QrCode = new Html5Qrcode("reader");
        
        // Camera configuration
        const config = {
            fps: 10,                    // Frames per second
            qrbox: { width: 250, height: 250 },  // Scanning area
            aspectRatio: 1.0
        };
        
        // Start scanning
        await html5QrCode.start(
            { facingMode: "environment" },  // Rear camera
            config,
            onScanSuccess,                   // Success callback
            onScanError                      // Error callback
        );
        
        isScanning = true;
        console.log('✅ Camera started successfully');
        
    } catch (error) {
        console.error('❌ Camera error:', error);
        
        let errorMsg = '';
        if (error.name === 'NotAllowedError') {
            errorMsg = '❌ تم رفض الوصول إلى الكاميرا. اضغط على أيقونة القفل في المتصفح واسمح بالكاميرا.';
        } else if (error.name === 'NotFoundError') {
            errorMsg = '❌ لم يتم العثور على كاميرا في هذا الجهاز.';
        } else if (error.name === 'NotReadableError') {
            errorMsg = '❌ الكاميرا قيد الاستخدام من تطبيق آخر.';
        } else {
            errorMsg = '❌ فشل فتح الكاميرا. تأكد من تشغيل الموقع على localhost أو HTTPS.';
        }
        
        document.getElementById('scanStatus').innerHTML = `<p style="color: #dc3545;">${errorMsg}</p>`;
        resetScanButtons();
    }
}

// ==================== Stop Scanner ====================
async function stopScanner() {
    try {
        if (html5QrCode && isScanning) {
            await html5QrCode.stop();
            html5QrCode.clear();
            isScanning = false;
            console.log('📷 Camera stopped');
        }
    } catch (error) {
        console.log('Error stopping:', error.message);
    }
    
    resetScanButtons();
    document.getElementById('scanStatus').innerHTML = '';
}

function resetScanButtons() {
    document.getElementById('startScanBtn').style.display = 'inline-block';
    document.getElementById('stopScanBtn').style.display = 'none';
}

// ==================== Scan Success Callback ====================
async function onScanSuccess(decodedText) {
    console.log('🎯 QR Code detected!');
    console.log('📝 Raw data:', decodedText);
    
    // Stop scanning
    await stopScanner();
    
    try {
        // Parse QR data
        let qrData;
        try {
            qrData = JSON.parse(decodedText);
        } catch (parseError) {
            showScanResult('❌ الكود الممسوح ليس كود محاضرة صالح', 'error');
            return;
        }
        
        // Validate
        if (!qrData.sessionId || !qrData.courseName) {
            showScanResult('❌ كود QR غير صالح', 'error');
            return;
        }
        
        // Check expiration
        const expiresAt = new Date(qrData.expiresAt);
        if (new Date() > expiresAt) {
            showScanResult('⏰ انتهت صلاحية هذا الكود. اطلب من المعلم كوداً جديداً.', 'error');
            return;
        }
        
        // Check duplicate
        const duplicateSnapshot = await attendanceCollection
            .where('studentId', '==', currentUser.id)
            .where('sessionId', '==', qrData.sessionId)
            .limit(1)
            .get();
        
        if (!duplicateSnapshot.empty) {
            showScanResult('⚠️ تم تسجيل حضورك في هذه المحاضرة مسبقاً', 'error');
            return;
        }
        
        // Save attendance
        const record = {
            studentId: currentUser.id,
            studentName: currentUser.fullName,
            studentEmail: currentUser.email,
            courseName: qrData.courseName,
            lectureTitle: qrData.lectureTitle,
            sessionId: qrData.sessionId,
            teacherId: qrData.teacherId,
            teacherName: qrData.teacherName,
            scannedAt: getServerTimestamp(),
            qrGeneratedAt: qrData.generatedAt
        };
        
        await attendanceCollection.add(record);
        
        // Update lecture count
        const lectureSnapshot = await lecturesCollection
            .where('sessionId', '==', qrData.sessionId)
            .limit(1)
            .get();
        
        if (!lectureSnapshot.empty) {
            await lectureSnapshot.docs[0].ref.update({
                attendanceCount: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        console.log('✅ Attendance saved');
        
        showScanResult(`
            <div style="background: #d4edda; padding: 20px; border-radius: 10px; text-align: center;">
                <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: #28a745;"></i>
                <h3 style="color: #28a745;">✅ تم تسجيل الحضور بنجاح!</h3>
                <p><strong>المقرر:</strong> ${qrData.courseName}</p>
                <p><strong>المحاضرة:</strong> ${qrData.lectureTitle}</p>
                <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-EG')}</p>
            </div>
        `, 'success');
        
        // Refresh attendance list
        loadMyAttendance();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showScanResult('❌ حدث خطأ أثناء تسجيل الحضور', 'error');
    }
}

// ==================== Scan Error Callback ====================
function onScanError(errorMessage) {
    // This fires continuously while scanning - normal behavior
    // Don't show to user, just log
    console.log('🔍 Scanning... (this is normal)');
}

// ==================== Show Result ====================
function showScanResult(message, type) {
    const container = document.getElementById('scanStatus');
    container.innerHTML = message;
}

// ==================== Load My Attendance ====================
async function loadMyAttendance() {
    try {
        const snapshot = await attendanceCollection
            .where('studentId', '==', currentUser.id)
            .orderBy('scannedAt', 'desc')
            .limit(30)
            .get();
        
        const tbody = document.getElementById('myAttendanceBody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:#666;">لا توجد سجلات حضور بعد</td></tr>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <tr>
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

// ==================== Logout ====================
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// ==================== Initialize ====================
initStudent();
console.log('🚀 Student Scanner Ready (v2)');