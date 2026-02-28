// ================= 1. SYSTEM STATE & REAL DB DATA =================
let student = {}; // Will hold real data from MySQL
let currentExamConfig = {};
let cameraStream = null;

// --- SECURITY VARIABLES ---
let securityViolations = 0;
const MAX_VIOLATIONS = 3; 
let isWarningOpen = false; 

let timerInterval;
let timeRemaining = 3600; // 1 Hour in seconds

// Exam State
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = []; 

// Generate Mock Questions based on Exam Selection
function generateMockQuestions(examName) {
    const qCount = examName === "MHT-CET" ? 50 : 20; 
    return Array.from({ length: qCount }, (_, i) => ({
        id: i + 1,
        text: `Sample high-level analytical question ${i + 1} for ${examName}. Evaluate the given parameters.`,
        options: ["Parameter Alpha is constant", "Derivative equates to zero", "Intermolecular forces increase", "None of the above"],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: `Explanation for Q${i+1}: Based on the standard principles of ${examName} syllabus, this is the derived conclusion.`
    }));
}

// ================= 2. INITIALIZATION & ELIGIBILITY =================
window.onload = async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    
    if (!currentUser || currentUser.role !== 'student') {
        window.location.href = "Homepage.html";
        return;
    }

    try {
        const response = await fetch(`https://success-academy.onrender.com/api/student/dashboard/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            student = data.profile;
            student.has_completed_mcq = true; // Mock MCQ completion until DB table is made
            
            // Check eligibility and render exams based on their real target_exam string
            checkEligibility();
        } else {
            document.getElementById('eligibilityMessage').innerText = "Failed to load student profile.";
            document.getElementById('eligibilityMessage').classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error fetching student profile:", error);
    }
};
async function selectExam(examName) {
    // 1. Request Fullscreen immediately upon selecting the exam
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
    } catch (err) {
        console.log("Fullscreen request deferred. Will try again on start.");
    }

    document.getElementById('liveExamTitle').innerText = `${examName} - Live Mock Assessment`;
    questions = generateMockQuestions(examName);
    userAnswers = questions.map(q => ({ selected: null, status: 'not-visited' }));
    
    document.getElementById('selectionScreen').classList.add('hidden');
    document.getElementById('instructionScreen').classList.remove('hidden');

    requestCameraAccess();
}

// ================= 3. PROCTORING & SECURITY SETUP =================
async function requestCameraAccess() {
    const camStatus = document.getElementById('camStatus');
    const preview = document.getElementById('previewCam');
    const startBtn = document.getElementById('startTestBtn');

    try {
       // Change this line:
cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        preview.srcObject = cameraStream;
        camStatus.innerHTML = "<span style='color: #00ff88;'>✅ Camera Active & Secured</span>";
        startBtn.disabled = false;
    } catch (err) {
        camStatus.innerHTML = "<span style='color: #ff4d4d;'>❌ Camera Access Denied. Test cannot start.</span>";
        alert("You must grant camera permissions to take the proctored test. Please check your browser settings.");
    }
}

async function initializeProctoredTest() {
    // Just setup listeners, fullscreen is already active
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur); 
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    document.getElementById('instructionScreen').classList.add('hidden');
    document.getElementById('examScreen').classList.remove('hidden');

    document.getElementById('liveCam').srcObject = cameraStream;

    userAnswers[0].status = 'not-answered'; 
    renderPalette();
    loadQuestion(0);
    startTimer();
}

function cancelTest() {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    window.location.href = 'Practice_zone.html';
}

// --- SECURITY HANDLERS ---

function handleVisibilityChange() {
    if (document.hidden) triggerSecurityViolation("Tab switching or minimizing detected.");
}

function handleBlur() {
    // Detects when the user clicks out of the browser into another app
    triggerSecurityViolation("Window lost focus (switched to another application).");
}

function handleFullscreenChange() {
    if (!document.fullscreenElement) triggerSecurityViolation("Exited Fullscreen mode.");
}

function triggerSecurityViolation(reason) {
    if (isWarningOpen) return; 
    
    securityViolations++;
    isWarningOpen = true; 
    
    if (securityViolations >= MAX_VIOLATIONS) {
        // Custom Max Violation Modal
        document.getElementById('warningText').innerHTML = `<strong>🚨 SECURITY BREACH</strong><br><br>Maximum violations (3) reached. Your test has been automatically submitted.`;
        const btn = document.querySelector('#warningModal .btn-secondary');
        btn.innerText = "View Results";
        btn.onclick = () => { document.getElementById('warningModal').classList.add('hidden'); forceSubmitExam(); };
        document.getElementById('warningModal').classList.remove('hidden');
    } else {
        const chancesLeft = MAX_VIOLATIONS - securityViolations;
        document.getElementById('warningText').innerHTML = 
            `<strong>${reason}</strong><br><br>This is violation ${securityViolations}. You have <strong style="color: #ffcc00; font-size: 18px;">${chancesLeft}</strong> chance(s) left before auto-submission.`;
        
        const btn = document.querySelector('#warningModal .btn-secondary');
        btn.innerText = "I Understand";
        btn.onclick = dismissWarning;
        document.getElementById('warningModal').classList.remove('hidden');
    }
}

function dismissWarning() {
    document.getElementById('warningModal').classList.add('hidden');
    
    // Try to force fullscreen back
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log("User must interact to re-enter fullscreen"));
    }
    
    // Slight delay before removing the lock so the act of clicking the button doesn't trigger a 'blur'
    setTimeout(() => {
        isWarningOpen = false;
    }, 500); 
}

function forceSubmitExam() {
    clearInterval(timerInterval);
    
    // Stop camera and remove listeners
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleBlur); // <-- ADDED
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    if (document.fullscreenElement) document.exitFullscreen().catch(e=>console.log(e));

    calculateAndShowResults();
}

// ================= 4. EXAM INTERFACE LOGIC =================
function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            
            // Custom Time Up Modal
            document.getElementById('warningText').innerHTML = `<strong>⏰ Time is up!</strong><br><br>Your exam is being automatically submitted.`;
            const btn = document.querySelector('#warningModal .btn-secondary');
            btn.innerText = "View Results";
            btn.onclick = () => { document.getElementById('warningModal').classList.add('hidden'); forceSubmitExam(); };
            document.getElementById('warningModal').classList.remove('hidden');
            return;
        }
        
        const h = Math.floor(timeRemaining / 3600).toString().padStart(2, '0');
        const m = Math.floor((timeRemaining % 3600) / 60).toString().padStart(2, '0');
        const s = (timeRemaining % 60).toString().padStart(2, '0');
        document.getElementById('timeLeft').innerText = `${h}:${m}:${s}`;
    }, 1000);
}

function loadQuestion(index) {
    currentQuestionIndex = index;
    const q = questions[index];
    
    // Update Question State if not visited
    if (userAnswers[index].status === 'not-visited') {
        userAnswers[index].status = 'not-answered';
        renderPalette();
    }

    document.getElementById('qNumberDisplay').innerText = index + 1;
    document.getElementById('questionText').innerText = q.text;

    const optionsHTML = q.options.map((opt, i) => {
        const isSelected = userAnswers[index].selected === i;
        return `
            <label class="option-label ${isSelected ? 'selected' : ''}" onclick="selectOption(this, ${i})">
                <input type="radio" name="examOpt" value="${i}" ${isSelected ? 'checked' : ''}>
                <span>${opt}</span>
            </label>
        `;
    }).join("");
    
    document.getElementById('optionsContainer').innerHTML = optionsHTML;
}

function selectOption(labelElement, optionIndex) {
    // Remove selected class from all
    document.querySelectorAll('.option-label').forEach(el => el.classList.remove('selected'));
    // Add to clicked
    labelElement.classList.add('selected');
    labelElement.querySelector('input').checked = true;
    
    userAnswers[currentQuestionIndex].selected = optionIndex;
}

// --- FOOTER BUTTON ACTIONS ---
function saveAndNext() {
    const currentAns = userAnswers[currentQuestionIndex];
    
    if (currentAns.selected !== null) {
        currentAns.status = 'answered';
    } else {
        currentAns.status = 'not-answered';
    }
    
    goToNextQuestion();
}

function markForReview() {
    const currentAns = userAnswers[currentQuestionIndex];
    if (currentAns.selected !== null) {
        currentAns.status = 'answered-review';
    } else {
        currentAns.status = 'review';
    }
    goToNextQuestion();
}

function clearResponse() {
    userAnswers[currentQuestionIndex].selected = null;
    userAnswers[currentQuestionIndex].status = 'not-answered';
    loadQuestion(currentQuestionIndex); // Reload UI
    renderPalette();
}

function goToNextQuestion() {
    renderPalette();
    if (currentQuestionIndex < questions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    }
}

// --- PALETTE LOGIC ---
function renderPalette() {
    const grid = document.getElementById('paletteGrid');
    grid.innerHTML = "";
    
    questions.forEach((q, i) => {
        const statusClass = `status-${userAnswers[i].status}`;
        grid.innerHTML += `
            <button class="palette-btn ${statusClass}" onclick="loadQuestion(${i})">
                ${i + 1}
            </button>
        `;
    });
}

// ================= 5. SUBMISSION & RESULTS =================
// --- CUSTOM SUBMIT CONFIRMATION ---
function confirmFinalSubmit() {
    const unattempted = userAnswers.filter(a => a.selected === null).length;
    let msg = `Are you sure you want to submit the exam?`;
    if (unattempted > 0) msg += `<br><br><span style="color:#ff4d4d;">You have <strong>${unattempted}</strong> unattempted questions.</span>`;
    
    document.getElementById('submitConfirmText').innerHTML = msg;
    document.getElementById('submitConfirmModal').classList.remove('hidden');
}

function closeSubmitConfirm() {
    document.getElementById('submitConfirmModal').classList.add('hidden');
}

function executeFinalSubmit() {
    document.getElementById('submitConfirmModal').classList.add('hidden');
    forceSubmitExam();
}

function forceSubmitExam() {
    clearInterval(timerInterval);
    
    // Stop camera
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    
    // Remove listeners so they don't trigger while viewing results
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleBlur); 
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    
    // NOTE: We DO NOT exit fullscreen here. We keep them locked in.

    calculateAndShowResults();
}

// --- EXIT AND RETURN (Triggered from Result Screen) ---
function exitExamAndReturn() {
    // Now we safely exit fullscreen and leave the page
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.log(e));
    }
    window.location.href = 'Practice_zone.html';
}
function calculateAndShowResults() {
    document.getElementById('examScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');

    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    const analysisContainer = document.getElementById('analysisContainer');
    analysisContainer.innerHTML = "";

    questions.forEach((q, i) => {
        const ans = userAnswers[i];
        let isCorrect = false;
        let cardClass = "";

        if (ans.selected === null) {
            unattempted++;
            cardClass = "";
        } else if (ans.selected === q.correctAnswer) {
            correct++;
            isCorrect = true;
            cardClass = "correct";
        } else {
            incorrect++;
            cardClass = "wrong";
        }

        // Generate Analysis UI
        let userSelectionText = ans.selected !== null ? q.options[ans.selected] : "Did not attempt";
        
        analysisContainer.innerHTML += `
            <div class="analysis-card ${cardClass}">
                <h4 style="color: #fff; margin-bottom: 10px;">Q${i+1}: ${q.text}</h4>
                <div style="font-size: 13px;">
                    <span style="color: #aaa;">Your Answer:</span> 
                    <span class="ans-label ${isCorrect ? 'ans-correct' : (ans.selected===null ? '' : 'ans-wrong')}">${userSelectionText}</span>
                </div>
                ${!isCorrect ? `
                    <div style="font-size: 13px; margin-top: 5px;">
                        <span style="color: #aaa;">Correct Answer:</span> 
                        <span class="ans-label ans-correct">${q.options[q.correctAnswer]}</span>
                    </div>
                ` : ''}
                <div class="explanation-text"><strong>Analysis:</strong> ${q.explanation}</div>
            </div>
        `;
    });

    // Score Calculation (+4 for correct, -1 for wrong - Standard NTA Rules)
    const totalScore = (correct * 4) - (incorrect * 1);
    const maxScore = questions.length * 4;

    document.getElementById('finalScoreDisplay').innerText = `${totalScore} / ${maxScore}`;
    document.getElementById('correctCount').innerText = correct;
    document.getElementById('incorrectCount').innerText = incorrect;
    document.getElementById('unattemptedCount').innerText = unattempted;

  // Real API call to send the score to the backend
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const currentExamType = document.getElementById('liveExamTitle').innerText.split(' -')[0]; // Extracts "JEE", "NEET", etc.

    if (currentUser && currentUser.id) {
        fetch('https://success-academy.onrender.com/api/submit-dc-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                exam_type: currentExamType,
                score: totalScore
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("Score successfully saved to Leaderboard!");
            } else {
                console.error("Failed to save score:", data.error);
            }
        })
        .catch(error => console.error("Error sending score to backend:", error));
    }
}
// ================= ANTI-COPY & RIGHT-CLICK BLOCK =================
document.addEventListener('contextmenu', event => {
    event.preventDefault();
    // Optional: You can trigger a security violation here if you want to be very strict
});

document.addEventListener('copy', event => {
    event.preventDefault();
    triggerSecurityViolation("Copying text is strictly prohibited.");
});

document.addEventListener('paste', event => {
    event.preventDefault();
});
// ================= KEYBOARD SHORTCUT BLOCKER =================
document.addEventListener('keydown', (event) => {
    // Block F12
    if (event.key === 'F12') {
        event.preventDefault();
        triggerSecurityViolation("Developer tools are prohibited.");
    }
    // Block Ctrl shortcuts (Copy, Print, Save, Inspect)
    if (event.ctrlKey && ['c', 'v', 'p', 's', 'i', 'u'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        triggerSecurityViolation("Keyboard shortcuts are prohibited.");
    }
});