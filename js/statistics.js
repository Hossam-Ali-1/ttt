/**
 * Statistics & Reports Script
 * Teacher view: Student performance, question analytics
 */

// ==================== Auth Check ====================
const currentUser = requireAuth('teacher');
if (!currentUser) {
    window.location.href = 'login.html';
}

// ==================== Initialize ====================
function initStatistics() {
    // Set sidebar info
    document.getElementById('sidebarUserName').textContent = currentUser.fullName;
    document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0);
    
    // Load all data
    loadAllStatistics();
    
    console.log('📊 Statistics page initialized');
}

// ==================== Load All Statistics ====================
async function loadAllStatistics() {
    try {
        // Fetch all answers
        const answersSnapshot = await answersCollection.get();
        const allAnswers = [];
        answersSnapshot.forEach(doc => {
            allAnswers.push({ id: doc.id, ...doc.data() });
        });
        
        // Fetch all questions
        const questionsSnapshot = await questionsCollection.get();
        const allQuestions = [];
        questionsSnapshot.forEach(doc => {
            allQuestions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📊 Loaded ${allAnswers.length} answers and ${allQuestions.length} questions`);
        
        if (allAnswers.length === 0) {
            showEmptyState();
            return;
        }
        
        // Calculate overall stats
        calculateOverallStats(allAnswers);
        
        // Build student performance table
        buildStudentPerformance(allAnswers);
        
        // Build per-question statistics
        buildQuestionStats(allQuestions, allAnswers);
        
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
        document.getElementById('performanceBody').innerHTML = 
            '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">❌ حدث خطأ في تحميل البيانات</td></tr>';
    }
}

// ==================== Calculate Overall Stats ====================
function calculateOverallStats(answers) {
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect === true).length;
    const wrongAnswers = totalAnswers - correctAnswers;
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    
    // Get unique students
    const uniqueStudents = new Set(answers.map(a => a.studentId));
    
    document.getElementById('totalStudents').textContent = uniqueStudents.size;
    document.getElementById('totalCorrect').textContent = correctAnswers;
    document.getElementById('totalWrong').textContent = wrongAnswers;
    document.getElementById('accuracyRate').textContent = accuracy + '%';
}

// ==================== Build Student Performance Table ====================
function buildStudentPerformance(answers) {
    // Group answers by student
    const studentMap = {};
    
    answers.forEach(answer => {
        const key = answer.studentId || 'unknown';
        if (!studentMap[key]) {
            studentMap[key] = {
                studentId: key,
                studentName: answer.studentName || 'غير معروف',
                studentEmail: answer.studentEmail || '-',
                answers: [],
                correctCount: 0,
                wrongCount: 0,
                lastAnswerTime: null
            };
        }
        
        studentMap[key].answers.push(answer);
        if (answer.isCorrect) {
            studentMap[key].correctCount++;
        } else {
            studentMap[key].wrongCount++;
        }
        
        const answerTime = answer.answeredAt?.toDate ? answer.answeredAt.toDate() : new Date(answer.answeredAt || Date.now());
        if (!studentMap[key].lastAnswerTime || answerTime > studentMap[key].lastAnswerTime) {
            studentMap[key].lastAnswerTime = answerTime;
        }
    });
    
    // Convert to array and sort by correct answers
    const students = Object.values(studentMap);
    students.sort((a, b) => b.correctCount - a.correctCount);
    
    // Build table HTML
    let html = '';
    
    if (students.length === 0) {
        html = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">لا توجد بيانات بعد</td></tr>';
    } else {
        students.forEach((student, index) => {
            const correctPercent = student.answers.length > 0 
                ? Math.round((student.correctCount / student.answers.length) * 100) 
                : 0;
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${student.studentName}</strong></td>
                    <td>${student.answers.length}</td>
                    <td><span class="badge badge-success">${student.correctCount}</span></td>
                    <td><span class="badge badge-danger">${student.wrongCount}</span></td>
                    <td>${formatTimestamp(student.lastAnswerTime)}</td>
                    <td>
                        <button class="btn-outline" style="padding: 5px 12px; font-size: 0.8rem;" 
                                onclick="showStudentDetails('${student.studentId}', '${student.studentName}')">
                            <i class="fa-solid fa-eye"></i> عرض
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    document.getElementById('performanceBody').innerHTML = html;
}

// ==================== Build Per-Question Statistics ====================
function buildQuestionStats(questions, answers) {
    const container = document.getElementById('questionsStats');
    
    if (questions.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">لا توجد أسئلة منشورة بعد</p>';
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    
    questions.forEach((question, index) => {
        const questionAnswers = answers.filter(a => a.questionId === question.questionId);
        const correctCount = questionAnswers.filter(a => a.isCorrect).length;
        const wrongCount = questionAnswers.length - correctCount;
        const total = questionAnswers.length;
        
        const typeLabel = question.type === 'mcq' ? 'اختيار من متعدد' : 'صح / خطأ';
        const typeClass = question.type === 'mcq' ? 'badge-info' : 'badge-warning';
        
        html += `
            <div style="background: #f8f9fa; padding: 15px 20px; border-radius: 10px; border-right: 4px solid #2196f3;">
                <h4 style="margin-bottom: 10px;">${index + 1}. ${question.questionText}</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    <span class="badge ${typeClass}">${typeLabel}</span>
                    <span class="badge badge-info">📝 ${total} إجابات</span>
                    <span class="badge badge-success">✅ ${correctCount} صحيحة</span>
                    <span class="badge badge-danger">❌ ${wrongCount} خاطئة</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== Show Student Details Modal ====================
async function showStudentDetails(studentId, studentName) {
    try {
        document.getElementById('studentModal').style.display = 'flex';
        document.getElementById('modalStudentName').textContent = '📋 ' + studentName;
        document.getElementById('modalContent').innerHTML = 
            '<p style="text-align: center; color: #666;">جاري تحميل التفاصيل...</p>';
        
        // Fetch student's answers
        const snapshot = await answersCollection
            .where('studentId', '==', studentId)
            .orderBy('answeredAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            document.getElementById('modalContent').innerHTML = 
                '<p style="text-align: center; color: #666;">لا توجد إجابات لهذا الطالب</p>';
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const resultIcon = data.isCorrect ? '✅' : '❌';
            const resultColor = data.isCorrect ? '#28a745' : '#dc3545';
            
            html += `
                <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; border-right: 3px solid ${resultColor};">
                    <p style="margin-bottom: 5px;"><strong>السؤال:</strong> ${data.questionText || 'غير معروف'}</p>
                    <p style="margin-bottom: 5px;"><strong>الإجابة:</strong> ${data.selectedAnswer || '-'}</p>
                    <p style="margin-bottom: 5px;"><strong>النتيجة:</strong> <span style="color: ${resultColor};">${resultIcon} ${data.isCorrect ? 'صحيحة' : 'خاطئة'}</span></p>
                    <p style="font-size: 0.8rem; color: #666;">${formatTimestamp(data.answeredAt)}</p>
                </div>
            `;
        });
        
        html += '</div>';
        document.getElementById('modalContent').innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error loading student details:', error);
        document.getElementById('modalContent').innerHTML = 
            '<p style="text-align: center; color: #dc3545;">❌ حدث خطأ في تحميل التفاصيل</p>';
    }
}

// ==================== Close Modal ====================
function closeStudentModal() {
    document.getElementById('studentModal').style.display = 'none';
}

// Close modal on outside click
window.addEventListener('click', function(e) {
    const modal = document.getElementById('studentModal');
    if (e.target === modal) {
        closeStudentModal();
    }
});

// ==================== Show Empty State ====================
function showEmptyState() {
    document.getElementById('totalStudents').textContent = '0';
    document.getElementById('totalCorrect').textContent = '0';
    document.getElementById('totalWrong').textContent = '0';
    document.getElementById('accuracyRate').textContent = '0%';
    
    document.getElementById('performanceBody').innerHTML = 
        '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">لا توجد إجابات طلاب بعد. انتظر حتى يجيب الطلاب على الأسئلة.</td></tr>';
    
    document.getElementById('questionsStats').innerHTML = 
        '<p style="text-align: center; padding: 40px; color: #666;">لا توجد بيانات إحصائية بعد</p>';
}

// ==================== Logout ====================
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// ==================== Initialize ====================
initStatistics();
console.log('🚀 Statistics Dashboard Ready');
