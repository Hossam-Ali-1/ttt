/**
 * Questions Management Script
 * Create, display, and manage questions
 */

// ==================== Auth Check ====================
const currentUser = requireAuth('teacher');
if (!currentUser) throw new Error('Authentication required');

// ==================== Initialize ====================
function initQuestions() {
    document.getElementById('sidebarUserName').textContent = currentUser.fullName;
    document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0);
    loadQuestions();
}

// ==================== Toggle Question Type ====================
function toggleQuestionType() {
    const type = document.getElementById('questionType').value;
    document.getElementById('mcqOptions').style.display = type === 'mcq' ? 'block' : 'none';
    document.getElementById('tfOptions').style.display = type === 'truefalse' ? 'block' : 'none';
}

// ==================== Create Question ====================
async function createQuestion() {
    const questionText = document.getElementById('questionText').value.trim();
    const questionType = document.getElementById('questionType').value;
    const duration = parseInt(document.getElementById('questionDuration').value);
    
    if (!questionText) return showMessage('يرجى إدخال نص السؤال', 'error');
    if (!duration || duration < 1) return showMessage('يرجى تحديد مدة زمنية صحيحة', 'error');
    
    let options = {};
    let correctAnswer = '';
    
    if (questionType === 'mcq') {
        options = {
            A: document.getElementById('optionA').value.trim(),
            B: document.getElementById('optionB').value.trim(),
            C: document.getElementById('optionC').value.trim(),
            D: document.getElementById('optionD').value.trim()
        };
        correctAnswer = document.getElementById('correctMCQ').value;
        
        // Validate all options filled
        if (!options.A || !options.B || !options.C || !options.D) {
            return showMessage('يرجى ملء جميع الخيارات الأربعة', 'error');
        }
    } else {
        options = { true: 'صح', false: 'خطأ' };
        correctAnswer = document.getElementById('correctTF').value;
    }
    
    const questionData = {
        questionText,
        type: questionType,
        options,
        correctAnswer,
        duration,
        teacherId: currentUser.id,
        teacherName: currentUser.fullName,
        createdAt: getServerTimestamp(),
        questionId: generateUniqueId()
    };
    
    try {
        await questionsCollection.add(questionData);
        console.log('✅ Question created:', questionData.questionId);
        showMessage('✅ تم إنشاء السؤال بنجاح!', 'success');
        
        // Reset form
        document.getElementById('questionText').value = '';
        document.getElementById('questionDuration').value = '5';
        loadQuestions();
    } catch (error) {
        console.error('❌ Error creating question:', error);
        showMessage('❌ فشل في إنشاء السؤال', 'error');
    }
}

// ==================== Load Questions ====================
async function loadQuestions() {
    try {
        const snapshot = await questionsCollection
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        const container = document.getElementById('questionsList');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-state">لا توجد أسئلة بعد</p>';
            return;
        }
        
        let html = '';
        let counter = 1;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const typeLabel = data.type === 'mcq' ? 'اختيار من متعدد' : 'صح / خطأ';
            
            html += `
                <div style="background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:10px; border-right:4px solid #2196f3;">
                    <h4>${counter}. ${data.questionText}</h4>
                    <p style="color:#666; font-size:0.85rem;">
                        <span class="badge badge-info">${typeLabel}</span>
                        <span class="badge badge-warning">⏱️ ${data.duration} دقائق</span>
                        <span class="badge badge-success">✅ ${data.correctAnswer}</span>
                    </p>
                    <button class="btn-danger" style="margin-top:8px; font-size:0.8rem; padding:5px 12px;" 
                            onclick="deleteQuestion('${doc.id}')">
                        <i class="fa-solid fa-trash"></i> حذف
                    </button>
                </div>
            `;
            counter++;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error loading questions:', error);
    }
}

// ==================== Delete Question ====================
async function deleteQuestion(docId) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    
    try {
        await questionsCollection.doc(docId).delete();
        console.log('🗑️ Question deleted:', docId);
        loadQuestions();
        showMessage('✅ تم حذف السؤال', 'success');
    } catch (error) {
        console.error('❌ Error deleting question:', error);
    }
}

// ==================== Show Message ====================
function showMessage(message, type) {
    const container = document.getElementById('questionMessage');
    container.innerHTML = type === 'error' 
        ? `<div class="global-error">${message}</div>` 
        : `<div class="global-success">${message}</div>`;
    setTimeout(() => container.innerHTML = '', 3000);
}

// ==================== Logout ====================
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// ==================== Initialize ====================
initQuestions();
console.log('🚀 Questions Management Ready');