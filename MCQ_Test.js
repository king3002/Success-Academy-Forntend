// 1. Grab the exact selections from the URL that Practice_zone.js sent over
const urlParams = new URLSearchParams(window.location.search);
const currentExam = urlParams.get('exam');
const currentSubject = urlParams.get('subject');
const currentTopic = urlParams.get('topic');
const currentStd = urlParams.get('std');

let allQuestions = []; 
const questionsPerPage = 5;
let currentPage = 0;

// ---> NEW: Create a unique save slot for this specific test <---
const storageKey = `mcq_progress_${currentExam}_${currentSubject}_${currentTopic}`;

// ---> NEW: Load saved answers from the browser, or start fresh <---
let userSubmissions = JSON.parse(localStorage.getItem(storageKey)) || {};


// 2. The New Fetch Function
async function fetchQuestions() {
    try {
        console.log("Fetching questions for:", { currentStd, currentExam, currentSubject, currentTopic });

        if (!currentStd || !currentExam || !currentSubject || !currentTopic) {
            document.getElementById('questionsWrapper').innerHTML = `
                <div style="text-align:center; padding: 50px; color: #ff4d4d;">
                    <h2>Missing Selection Data!</h2>
                    <p>Please go back to the Practice Zone and select your topic again.</p>
                </div>`;
            return;
        }

        // Send the request to your MySQL database
        const apiUrl = `https://success-academy.onrender.com/api/fetch-mcqs?standard=${encodeURIComponent(currentStd)}&exam=${encodeURIComponent(currentExam)}&subject=${encodeURIComponent(currentSubject)}&topic=${encodeURIComponent(currentTopic)}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to connect to the database");

        const dbQuestions = await response.json();

        if (dbQuestions.length === 0) {
            document.getElementById('questionsWrapper').innerHTML = `
                <div style="text-align:center; padding: 50px; color: #fff;">
                    <h2>No questions found for this topic yet.</h2>
                </div>`;
            return;
        }

        // ---> ADD THIS NEW LINE RIGHT HERE <---
        document.getElementById('testHeaderTitle').innerText = currentTopic;

        // 3. Map the MySQL columns perfectly to match what your UI code expects!
        allQuestions = dbQuestions.map(row => ({
            id: row.id,
            text: row.question_text, 
            options: [row.option_a, row.option_b, row.option_c, row.option_d], 
            correctAnswer: row.correct_option,
            explanation: row.explanation
        }));

        // 4. Now that we actually have the data, render the page!
        renderPage();

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

// ... Keep your existing function renderPage() below this line! ...
// 3. Render Questions (With Staggered Slide-In)
function renderPage() {
    const wrapper = document.getElementById('questionsWrapper');
    wrapper.innerHTML = "";
    wrapper.className = ""; // Reset swipe classes

    const startIndex = currentPage * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    const questionsToShow = allQuestions.slice(startIndex, endIndex);

    questionsToShow.forEach((q, index) => {
        const actualQNum = startIndex + index + 1;
        const isLocked = userSubmissions[q.id] !== undefined; 
        
        let correctStateClass = "";
        let stampHtml = "";
        
        // If already answered, apply styles immediately
        if (isLocked) {
            const isCorrect = userSubmissions[q.id].isCorrect;
            correctStateClass = isCorrect ? 'card-correct' : 'card-incorrect';
            stampHtml = `<div class="verification-stamp" style="color: ${isCorrect ? '#00ff88' : '#ff4d4d'}; opacity: 0.4; transform: scale(1) rotate(0deg);">${isCorrect ? '✓' : '✖'}</div>`;
        }

        let optionsHTML = q.options.map((opt, optIndex) => {
            let optClass = "";
            if (isLocked) {
                if (optIndex === q.correctAnswer) optClass = "opt-correct"; // Always show correct answer
                else if (optIndex === userSubmissions[q.id].selected && !userSubmissions[q.id].isCorrect) optClass = "opt-incorrect"; // Cross out wrong choice
            }

            return `
            <li>
                <label class="${optClass}">
                    <input type="radio" name="q${q.id}" value="${optIndex}" ${isLocked ? 'disabled' : ''} 
                           ${isLocked && userSubmissions[q.id].selected === optIndex ? 'checked' : ''}>
                    <span class="custom-radio"></span>
                    <span class="opt-text">${opt}</span>
                </label>
            </li>
        `}).join("");

        wrapper.innerHTML += `
            <div class="question-card stagger-card ${isLocked ? 'locked' : ''} ${correctStateClass}" id="card-q${q.id}" style="animation-delay: ${index * 0.12}s">
                ${stampHtml}
                <h4 style="color: #ccc; margin-bottom: 15px; font-weight: 500;">Q${actualQNum}</h4>
                <h3 style="margin-bottom: 10px;">${q.text}</h3>
                <ul class="options-list">${optionsHTML}</ul>
                ${!isLocked ? `<button class="submit-q-btn" id="btn-q${q.id}" onclick="submitSingleQuestion(${q.id}, ${q.correctAnswer}, '${q.explanation.replace(/'/g, "\\'")}')">Submit Answer</button>` : ''}
            </div>
        `;
    });

    updateHUD();

    // Pagination UI
    document.getElementById('pageIndicator').innerText = `PAGE 0${currentPage + 1} / 0${Math.ceil(allQuestions.length / questionsPerPage)}`;
    document.getElementById('prevBtn').disabled = currentPage === 0;
    
    if (endIndex >= allQuestions.length) {
        document.getElementById('nextBtn').innerText = "Finalize Data ►";
        document.getElementById('nextBtn').onclick = finishTopic;
    } else {
        document.getElementById('nextBtn').innerText = "Next Data ►";
        document.getElementById('nextBtn').onclick = () => triggerSwipe(1);
    }
}

// 4. Submit Question (The "Processing" Suspense)
function submitSingleQuestion(qId, correctIndex, explanation) {
    const selectedOption = document.querySelector(`input[name="q${qId}"]:checked`);
    if (!selectedOption) return alert("System Error: No parameters selected.");

    const btn = document.getElementById(`btn-q${qId}`);
    btn.innerText = "Processing...";
    btn.disabled = true;
    
    // Disable other radio buttons in this card to prevent changing during processing
    document.querySelectorAll(`input[name="q${qId}"]`).forEach(r => r.disabled = true);

    const selectedValue = parseInt(selectedOption.value);
    const isCorrect = selectedValue === correctIndex;

    // The Micro-moment of Suspense
   // The Micro-moment of Suspense
    setTimeout(() => {
        userSubmissions[qId] = { isCorrect: isCorrect, selected: selectedValue };
        
        // ---> FIX 1: Save progress to LocalStorage immediately so it survives reloads <---
        localStorage.setItem(storageKey, JSON.stringify(userSubmissions));
        
        const card = document.getElementById(`card-q${qId}`);
        card.classList.add('locked');
        
        // ---> FIX 2: Use insertAdjacentHTML instead of innerHTML so we don't break the button! <---
        if (isCorrect) {
            card.classList.add('card-correct');
            card.insertAdjacentHTML('beforeend', `<div class="verification-stamp stamp-in" style="color: #00ff88;">✓</div>`);
        } else {
            card.classList.add('card-incorrect');
            card.insertAdjacentHTML('beforeend', `<div class="verification-stamp stamp-in" style="color: #ff4d4d;">✖</div>`);
        }

        // Apply specific styles to the options
        const labels = card.querySelectorAll('label');
        labels.forEach((label, index) => {
            if (index === correctIndex) label.classList.add('opt-correct');
            if (index === selectedValue && !isCorrect) label.classList.add('opt-incorrect');
        });

        // The button will now successfully update!
        btn.innerText = "Submitted"; 
        btn.style.borderColor = "#00ff88"; 
        btn.style.color = "#00ff88";       
        
        updateHUD();
        showBottomSheet(qId, isCorrect, explanation);
        
    }, 600); // 600ms Processing Delay
}

// Update the Top Progress Bar
function updateHUD() {
    const totalAnswered = Object.keys(userSubmissions).length;
    const progressPercent = (totalAnswered / allQuestions.length) * 100;
    document.getElementById('hudProgressBar').style.width = `${progressPercent}%`;
}

// Bottom Sheet Diagnostics
function showBottomSheet(qId, isCorrect, explanation) {
    const sheet = document.getElementById("mcqBottomSheet");
    const sheetContent = sheet.querySelector(".sheet-content");
    
    if (isCorrect) {
        sheetContent.className = "sheet-content correct";
        // ---> CHANGED TEXT HERE <---
        document.getElementById("sheetTitle").innerHTML = `<span style="color:#00ff88">Correct Ans</span>`;
    } else {
        sheetContent.className = "sheet-content wrong";
        // ---> CHANGED TEXT HERE <---
        document.getElementById("sheetTitle").innerHTML = `<span style="color:#ff4d4d">Incorrect Ans</span>`;
    }
    
    document.getElementById("sheetExplanation").innerText = explanation;
    sheet.classList.add("active");
}

function closeBottomSheet() { document.getElementById("mcqBottomSheet").classList.remove("active"); }

// 5. Swipe Transitions
function triggerSwipe(direction) {
    const wrapper = document.getElementById('questionsWrapper');
    // Swipe out current
    wrapper.className = direction > 0 ? "swipe-out-left" : "swipe-out-right";
    
    // Wait for the smoother 400ms swipe out to finish
    setTimeout(() => {
        currentPage += direction;
        renderPage();
        // Swipe in new
        wrapper.className = direction > 0 ? "swipe-in-right" : "swipe-in-left";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400); 
}

// 6. The Assessment Report & Counter
function finishTopic() {
    const totalAnswered = Object.keys(userSubmissions).length;
    if (totalAnswered < allQuestions.length) {
        if(!confirm(`WARNING: Data incomplete. ${totalAnswered}/${allQuestions.length} answered. Force finalize?`)) return;
    }

    let correctCount = 0;
    for (let key in userSubmissions) { if (userSubmissions[key].isCorrect) correctCount++; }
    const accuracy = totalAnswered === 0 ? 0 : Math.round((correctCount / allQuestions.length) * 100);

    const finalScoreKey = `mcq_score_${currentExam}_${currentSubject}_${currentTopic}`;
    localStorage.setItem(finalScoreKey, accuracy);
    
// ---> NEW: Save a permanent flag that they finished this at least once <---
  // Save completion only by Subject + Topic + Standard (NOT exam)
const historyKey = `mcq_history_${currentStd}_${currentSubject}_${currentTopic}`;
localStorage.setItem(historyKey, 'true');
    
    document.getElementById('questionsWrapper').style.display = "none";
    document.getElementById('paginationControls').style.display = "none";
    document.getElementById('hudProgressBar').parentElement.style.display = "none";
    
    const resultScreen = document.getElementById('finalResultScreen');
    resultScreen.style.display = "block";
    
    // Performance Glow Logic
    let themeClass = "result-mid";
    if (accuracy >= 80) themeClass = "result-high";
    else if (accuracy < 50) {
        themeClass = "result-low";
        document.getElementById('badgeContainer').innerHTML = `<div class="badge-improvement">⚠️ CRITICAL: Needs Improvement</div>`;
    }
    resultScreen.classList.add(themeClass);

    // Number Counter Animation
    const accuracyDisplay = document.getElementById('accuracyDisplay');
    let currentCount = 0;
    const duration = 1500; // 1.5 seconds
    const interval = 30; // Update every 30ms
    const step = accuracy / (duration / interval);

    const counter = setInterval(() => {
        currentCount += step;
        if (currentCount >= accuracy) {
            currentCount = accuracy;
            clearInterval(counter);
        }
        accuracyDisplay.innerText = `${Math.floor(currentCount)}%`;
    }, interval);
}
// Clears the saved data so the student can retake the test
// Clears the saved data so the student can retake the test
function resetTest() {
    localStorage.removeItem(storageKey); // Removes question progress
    localStorage.removeItem(`mcq_score_${currentExam}_${currentSubject}_${currentTopic}`); // Removes final score
    location.reload();
}

// ==========================================
// ANTI-CHEAT: PREVENT COPY, PASTE & SELECTION
// ==========================================

// 1. Prevent Text Selection (Dragging) via CSS injection
document.body.style.userSelect = "none";
document.body.style.webkitUserSelect = "none"; // For Safari
document.body.style.msUserSelect = "none"; // For older Edge/IE

// 2. Prevent Selection Event
document.addEventListener('selectstart', (e) => {
    e.preventDefault();
});

// 3. Prevent Right-Click Menu (Blocks right-click -> Copy)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// 4. Prevent the Copy & Paste Events directly
document.addEventListener('copy', (e) => {
    e.preventDefault();
});
document.addEventListener('paste', (e) => {
    e.preventDefault();
});

// 5. Prevent Keyboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U for source code)
document.addEventListener('keydown', (e) => {
    // Check if Ctrl (Windows) or Cmd (Mac) is held down
    if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        // Block C (Copy), V (Paste), X (Cut), U (View Source), P (Print)
        if (key === 'c' || key === 'v' || key === 'x' || key === 'u' || key === 'p') {
            e.preventDefault();
        }
    }
});

// Initialize
window.onload = fetchQuestions;