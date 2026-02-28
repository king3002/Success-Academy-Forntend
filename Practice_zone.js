// --- Existing Navbar Code ---

const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const overlay = document.getElementById("menuOverlay");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navLinks.classList.toggle("active");
  overlay.classList.toggle("active");
});
overlay.addEventListener("click", () => {
  hamburger.classList.remove("active");
  navLinks.classList.remove("active");
  overlay.classList.remove("active");
});

function confirmLogout(){
  if(confirm("Are you sure you want to logout?")){
    localStorage.removeItem('studentData');
    window.location.href = "Homepage.html";
  }
}

// ==========================================
// STUDENT LOGIC & FILTERING (FETCHED FROM DB)
// ==========================================
let student = {}; // Will hold real data from MySQL

window.addEventListener("load", async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    
    // Security check: Redirect if not logged in
    if (!currentUser || currentUser.role !== 'student') {
        window.location.href = "Homepage.html";
        return;
    }

    try {
        // Fetch real student data from your server
        const response = await fetch(`https://success-academy.onrender.com/api/student/dashboard/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            student = data.profile; // Assign real DB values

            // ---> UPDATED: Check completion across ALL 11th & 12th topics <---
            student.has_completed_mcq = await checkAllTopicsCompleted(student);
            
            // NOTE: Since you don't have an "MCQ Completed" table in the DB yet,
            // we will default this to true so they can access the  Challenges.
            student.has_completed_mcq = false; 
            
            // Hide loader and render the customized dashboard
            setTimeout(() => document.querySelector(".loader").style.display = "none", 500);
            renderDashboardBasedOnProfile();
        } else {
            alert("Failed to load student profile.");
        }
    } catch (error) {
        console.error("Error fetching student profile:", error);
        alert("Server connection error.");
    }
});



// Helper for Smart Scrolling
function smartScroll(elementId) {
    setTimeout(() => {
        const el = document.getElementById(elementId);
        if(el) {
            // Offset by 120px to account for the fixed navbar
            const y = el.getBoundingClientRect().top + window.scrollY - 120;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
    }, 150); // Delay allows the new HTML to render and animate first
}

function triggerKeyFlight() {
    const key = document.getElementById('flyingKey');
    // Only trigger if it's not already flying
    if (key && !key.classList.contains('is-flying')) {
        key.classList.add('is-flying');
        // Reset the animation after 1.2s so it can happen again
        setTimeout(() => key.classList.remove('is-flying'), 1200);
    }
}

// Function to handle the key animation reliably
function triggerKeyFlight() {
    const key = document.getElementById('flyingKey');
    if (key) {
        // Reset animation safely
        key.classList.remove('is-flying');
        void key.offsetWidth; // Trigger DOM reflow to restart animation
        key.classList.add('is-flying');
    }
}

function renderDashboardBasedOnProfile() {
    const grid = document.getElementById('mainPracticeGrid');
    grid.innerHTML = ""; 

    // Define access rules based on DB student_type
    const isRegularOrAcademy = (student.student_type === "Regular" || student.student_type === "Regular+Academy");
    const isCrashOrAcademy = (student.student_type === "Crash Course" || student.student_type === "Regular+Academy");

    // ==========================================
    // 1. BOARD PAPERS & NOTES CARD (The Book)
    // ==========================================
    grid.innerHTML += `
        <div class="practice-card open-book-card ${isRegularOrAcademy ? '' : 'locked-card'}" id="bookCard" 
             onclick="${isRegularOrAcademy ? 'animateAndLoadBoard()' : `showLockedMessage('Study Materials')`}">
            
            ${!isRegularOrAcademy ? `
                <div class="exclusive-badge">
                    🔒 Locked
                    <span>Exclusive to Regular & Academy batches</span>
                </div>
            ` : ''}

            <div class="open-book-container">
                <div class="book-left-page">
                    <h3>Study<br>Materials</h3>
                </div>
                <div class="book-right-page-base">
                    <h3>Options revealed below 👇</h3>
                </div>
                <div class="book-right-page-flip">
                    <div class="flip-front">
                        <h2>📜 Board Papers & Notes</h2>
                        <p>Click to turn page and view.</p>
                    </div>
                    <div class="flip-back"></div>
                </div>
            </div>
        </div>
    `;

    // ==========================================
    // 2. MCQ QUESTION BANK CARD (The Clipboard)
    // ==========================================
    grid.innerHTML += `
        <div class="practice-card clipboard-card ${isCrashOrAcademy ? '' : 'locked-card'}" id="mcqCard" 
             onclick="${isCrashOrAcademy ? 'animateAndLoadMCQ()' : `showLockedMessage('MCQ Bank')`}">
            
            ${!isCrashOrAcademy ? `
                <div class="exclusive-badge">
                    🔒 Locked
                    <span>Exclusive to Crash Course & Academy batches</span>
                </div>
            ` : ''}

            <div class="clipboard-clip"></div>
            
            <div class="clipboard-paper">
                <div class="particle-burst">
                    <span class="particle p1">+1</span>
                    <span class="particle p2">✅</span>
                    <span class="particle p3">+1</span>
                    <span class="particle p4">✅</span>
                    <span class="particle p5">+1</span>
                    <span class="particle p6">✅</span>
                    <span class="particle p7">+1</span>
                    <span class="particle p8">✅</span>
                </div>
                
                <h2 class="mcq-title">📝 MCQ Question Bank</h2>
                <p class="mcq-desc">Target: ${student.target_exam || 'Exams'}</p>
                
                <div class="omr-container">
                    <div class="omr-bubble">A</div>
                    <div class="omr-bubble">B</div>
                    <div class="omr-bubble correct-bubble" id="correctBubble">C</div>
                    <div class="omr-bubble">D</div>
                </div>
            </div>
        </div>
    `;

    // ==========================================
    // 3. DAILY CHALLENGES CARD (Safe & Arena)
    // ==========================================
    const hasSeenUnlock = localStorage.getItem('vaultUnlockedShown') === 'true';

    if (!isCrashOrAcademy) {
        // STATE 0: FOMO LOCKED (Due to Batch Type)
        grid.innerHTML += `
            <div class="practice-card heavy-safe-card locked-card" onclick="showLockedMessage('Challenges')">
                <div class="exclusive-badge">
                    🔒 Locked
                    <span>Exclusive to Crash Course & Academy batches</span>
                </div>
                <div class="safe-outer-frame">
                    <div class="safe-inner-door">
                        <div class="safe-pinstripe">
                            <div class="safe-nameplate"></div>
                            <div class="safe-center-mechanism">
                                <div class="safe-side-dial"></div>
                                <div class="safe-handle">
                                    <div class="prong prong-1"></div><div class="prong prong-2"></div><div class="prong prong-3"></div><div class="handle-center"></div>
                                </div>
                                <div class="safe-side-dial"></div>
                            </div>
                            <div class="safe-bottom-keyhole"><div class="keyhole-slot"></div></div>
                        </div>
                    </div>
                </div>
                <div class="safe-text-plate">
                    <h2 class="locked-title">Challenges Locked</h2>
                    <p class="locked-subtext">Complete all MCQ topics to unlock</p>
                </div>
            </div>
        `;
    } else {
        // Has access based on batch, now check MCQ completion
        if (student.has_completed_mcq) {
            if (!hasSeenUnlock) {
                // STATE 2: READY TO UNLOCK (Golden Ticket)
                grid.innerHTML += `
                    <div class="practice-card heavy-safe-card unlockable" id="unlockableSafe" onclick="triggerVaultUnlock()">
                        <div class="safe-outer-frame split-frame">
                            <div class="golden-ticket">
                                <div class="ticket-inner">
                                    <h3>🎫 GOLDEN TICKET</h3>
                                    <p>Challenges Unlocked!</p>
                                </div>
                            </div>
                            <div class="safe-door left-door"></div>
                            <div class="safe-door right-door"></div>
                            <div class="split-handle-container">
                                <div class="safe-handle">
                                    <div class="prong prong-1"></div><div class="prong prong-2"></div><div class="prong prong-3"></div><div class="handle-center"></div>
                                </div>
                            </div>
                        </div>
                        <div class="safe-text-plate" id="safeTextPlate">
                            <h2 class="locked-title" style="color: #00ff88;">Vault Ready</h2>
                            <p class="locked-subtext">Click to break the seal</p>
                        </div>
                    </div>
                `;
            } else {
                // STATE 3: BLAZING ARENA (Permanently Unlocked)
                grid.innerHTML += `
                    <div class="practice-card arena-card fade-in-smooth" id="arenaCard" onclick="enterArena()">
                        <div class="arena-bg-flames"></div>
                        <div class="daily-content">
                            <div class="live-indicator"><span class="pulse-dot"></span> LIVE TEST</div>
                            <div class="flame-container"><span class="flame-emoji">🔥</span><div class="flame-glow"></div></div>
                            <h2 class="daily-title">Challenges</h2>
                            <p class="daily-subtext">The arena awaits. Prove your skills.</p>
                            <div class="enter-btn">ENTER ARENA ➔</div>
                        </div>
                        <div class="sword sword-left">🗡️</div>
                        <div class="sword sword-right">🗡️</div>
                    </div>
                `;
            }
        } else {
            // STATE 1: LOCKED SAFE (Waiting to finish MCQ)
            grid.innerHTML += `
                <div class="practice-card heavy-safe-card locked" onmouseenter="hoverFlyKey()" onclick="trySafe()">
                    <div class="key-animation" id="flyingKey">🔑</div>
                    <div class="safe-outer-frame">
                        <div class="safe-inner-door">
                            <div class="safe-pinstripe">
                                <div class="safe-nameplate"></div>
                                <div class="safe-center-mechanism">
                                    <div class="safe-side-dial"></div>
                                    <div class="safe-handle" id="safeHandle">
                                        <div class="prong prong-1"></div><div class="prong prong-2"></div><div class="prong prong-3"></div><div class="handle-center"></div>
                                    </div>
                                    <div class="safe-side-dial"></div>
                                </div>
                                <div class="safe-bottom-keyhole"><div class="keyhole-slot"></div></div>
                            </div>
                        </div>
                    </div>
                    <div class="safe-text-plate">
                        <h2 class="locked-title">Challenges Locked</h2>
                        <p class="locked-subtext">Complete all MCQ topics to unlock</p>
                    </div>
                </div>
            `;
        }
    }
}

// Helper to show a polite alert when clicking a blurred card
function showLockedMessage(featureName) {
    alert(`🔒 ${featureName} is locked.\n\nThis feature is not included in your current batch. Contact administration to upgrade your course access!`);
}

// NEW FUNCTION: Attempts to turn the 3-prong safe handle
function trySafe() {
    const handle = document.getElementById('safeHandle');
    
    if (!handle || handle.classList.contains('is-turning')) return;

    // Trigger the handle turning animation
    handle.classList.add('is-turning');
    
    // Remove the class after the animation (400ms)
    setTimeout(() => {
        handle.classList.remove('is-turning');
    }, 400);
}

// NEW FUNCTION: Plays the Golden Ticket animation, then swaps to the Blazing Arena
// UPDATED FUNCTION: Smooth fade out before swapping cards
function triggerVaultUnlock() {
    const safe = document.getElementById('unlockableSafe');
    if (!safe || safe.classList.contains('is-opening')) return;

    safe.classList.add('is-opening');
    
    // Wait 2.4s for the golden ticket to shine, then fade out smoothly
    setTimeout(() => {
        safe.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        safe.style.opacity = "0";
        safe.style.transform = "scale(0.9)";
        
        // Wait 0.4s for the fade out to finish, THEN swap the HTML
        setTimeout(() => {
            localStorage.setItem('vaultUnlockedShown', 'true');
            renderDashboardBasedOnProfile();
        }, 400);
    }, 2400); 
}

// OPTIONAL DEV TOOL: Run this in your browser console to test the animation again:
// localStorage.removeItem('vaultUnlockedShown'); renderDashboardBasedOnProfile();

// NEW FUNCTION: Plays the sword clash animation, then loads the section
// UPDATED FUNCTION: Slower animation timing (2.2 seconds)
function enterArena() {
    const arena = document.getElementById('arenaCard');
    
    // Prevent double-clicking
    if (!arena || arena.classList.contains('is-clashing')) return;

    // Trigger sword animation and hide text
    arena.classList.add('is-clashing');

    // Wait exactly 2.2 seconds for the slow swords to clash and fall
    setTimeout(() => {
        loadDailyChallenge();
        
        // Reset state slightly after
        setTimeout(() => arena.classList.remove('is-clashing'), 500);
    }, 2200);
}

// OPTIONAL DEV TOOL: Run this in your browser console to test the animation again:
// localStorage.removeItem('vaultUnlockedShown'); renderDashboardBasedOnProfile();
// NEW FUNCTION: Calculates the exact distance to the MCQ card
function hoverFlyKey() {
    const key = document.getElementById('flyingKey');
    const mcqCard = document.getElementById('mcqCard');

    // Prevent re-triggering if it's already flying
    if (!key || !mcqCard || key.classList.contains('is-flying')) return;

    // Get exact screen positions
    const keyRect = key.getBoundingClientRect();
    const mcqRect = mcqCard.getBoundingClientRect();

    // Calculate center points
    const keyCenterX = keyRect.left + keyRect.width / 2;
    const keyCenterY = keyRect.top + keyRect.height / 2;

    const mcqCenterX = mcqRect.left + mcqRect.width / 2;
    const mcqCenterY = mcqRect.top + mcqRect.height / 2;

    // Calculate how far the key needs to travel
    const deltaX = mcqCenterX - keyCenterX;
    const deltaY = mcqCenterY - keyCenterY;

    // Pass the coordinates to CSS variables
    document.documentElement.style.setProperty('--fly-x', `${deltaX}px`);
    document.documentElement.style.setProperty('--fly-y', `${deltaY}px`);

    // Trigger animation
    key.classList.remove('is-flying');
    void key.offsetWidth; // Force a DOM reflow to restart animation
    key.classList.add('is-flying');

    // Reset after animation finishes (1.2s)
    setTimeout(() => {
        if (key) key.classList.remove('is-flying');
    }, 1200);
}

function getSubjectsArray(examName = null) {
    let subjects = ["Physics", "Chemistry"];
    
    // Add subjects based on student's registered group
    if (student.subject_group.includes("PCM") || student.subject_group.includes("PCMB")) subjects.push("Mathematics");
    if (student.subject_group.includes("PCB") || student.subject_group.includes("PCMB")) subjects.push("Biology");

    // --- SMART EXAM FILTERING ---
    if (examName === "JEE") {
        // Remove Biology for JEE
        subjects = subjects.filter(sub => sub !== "Biology");
    } else if (examName === "NEET") {
        // Remove Mathematics for NEET
        subjects = subjects.filter(sub => sub !== "Mathematics");
    }

    return subjects;
}

function getExamsArray() {
    return student.target_exam.split(",").map(e => e.trim());
}

const subjectTopics = {
    "Physics": [
        { no: 1, name: "Rotational Dynamics" }, 
        { no: 2, name: "Mechanical Properties of Fluids" }
    ],
    "Mathematics": [
        { no: 1, name: "Mathematical Logic" }, 
        { no: 2, name: "Matrices" }
    ],
    "Chemistry": [
        { no: 1, name: "Solid State" }, 
        { no: 2, name: "Solutions" }
    ],
    "Biology": [
        { no: 1, name: "Reproduction in Lower and Higher Plants" }
    ]
};

// ==========================================
// OPTION 1: STUDY MATERIALS FLOW (Board/Notes)
// ==========================================
function loadBoardSection() {
    const container = document.getElementById('dynamicContentContainer');
    container.classList.remove('hidden');
    container.innerHTML = `
        <h2 class="fade-in">Select Standard</h2>
        <div class="demo-box fade-in" id="board-level1" style="display: flex; gap: 15px;">
            <button class="start-btn inactive-btn type-btn" onclick="askBoardType(this, '11th')">11th Standard</button>
            <button class="start-btn inactive-btn type-btn" onclick="askBoardType(this, '12th')">12th Standard</button>
        </div>
        <div id="board-level2"></div>
        <div id="board-level3"></div>
        <div id="board-level4"></div>
    `;
    smartScroll('dynamicContentContainer');
}

function askBoardType(btnElement, std) {
    handleButtonSelection(btnElement, '#board-level1 .type-btn');
    document.getElementById("board-level3").innerHTML = ""; 
    document.getElementById("board-level4").innerHTML = ""; 

    // If 11th, ONLY show Notes. If 12th, show Papers and Notes.
    let buttonsHTML = `<button class="start-btn inactive-btn type-btn" onclick="askBoardSubject(this, 'Notes', '${std}')">📑 Chapter Notes</button>`;
    
    if (std === '12th') {
        buttonsHTML = `
            <button class="start-btn inactive-btn type-btn" onclick="askBoardSubject(this, 'Papers', '${std}')">📝 Board Papers</button>
            ${buttonsHTML}
        `;
    }

    document.getElementById("board-level2").innerHTML = `
        <h2 style="margin-top: 30px;" class="fade-in">Select Material Type</h2>
        <div class="demo-box fade-in" id="boardTypeBox" style="display: flex; gap: 15px;">
            ${buttonsHTML}
        </div>
    `;
    smartScroll('boardTypeBox');
}

function askBoardSubject(btnElement, type, std) {
    handleButtonSelection(btnElement, '#boardTypeBox .type-btn');
    document.getElementById("board-level4").innerHTML = ""; 

    let subjectButtons = getSubjectsArray().map(sub => {
        const onClickFunc = type === 'Papers' ? `showBoardPaperOptions(this, '${sub}', '${std}')` : `showNotesTopics(this, '${sub}', '${std}')`;
        return `<button class="start-btn inactive-btn sub-btn" onclick="${onClickFunc}">${sub}</button>`;
    }).join(" ");

    document.getElementById("board-level3").innerHTML = `
        <h2 style="margin-top: 30px;" class="fade-in">Select Subject</h2>
        <div class="demo-box fade-in" style="display: flex; flex-wrap: wrap; gap: 10px;" id="boardSubjectBox">
            ${subjectButtons}
        </div>
    `;
    smartScroll('boardSubjectBox');
}

async function showBoardPaperOptions(btnElement, subject, std) {
    handleButtonSelection(btnElement, '#boardSubjectBox .sub-btn');
    const container = document.getElementById("board-level4");
    
    container.innerHTML = `<h2 style="margin-top: 30px;" class="fade-in">Loading Papers...</h2>`;
    smartScroll('board-level4');

    try {
        const response = await fetch(`https://success-academy.onrender.com/api/study-materials?standard=${std}&subject=${subject}&type=Papers`);
        const materials = await response.json();

        let listHTML = materials.length > 0 
            ? materials.map(m => `<li><a href="#" onclick="window.open('SecureViewer.html?id=${m.id}', '_blank'); return false;" style="color: #00ff88; text-decoration: none; font-size: 16px;">📄 ${m.topic}</a></li>`).join("")
            : `<li style="color: #aaa;">No papers available for this subject yet.</li>`;

        container.innerHTML = `
            <h2 style="margin-top: 30px;" class="fade-in">${std} ${subject} - Board Papers</h2>
            <div class="demo-box fade-in" id="boardPaperBox">
                <ul style="list-style: none; display: grid; gap: 15px;">
                    ${listHTML}
                </ul>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<p style="color: #ff4d4d;">Error loading papers.</p>`;
    }
}

async function showNotesTopics(btnElement, subject, std) {
    handleButtonSelection(btnElement, '#boardSubjectBox .sub-btn');
    const container = document.getElementById("board-level4");
    
    container.innerHTML = `<h2 style="margin-top: 30px;" class="fade-in">Loading Notes...</h2>`;
    smartScroll('board-level4');

    try {
        const response = await fetch(`https://success-academy.onrender.com/api/study-materials?standard=${std}&subject=${subject}&type=Notes`);
        const materials = await response.json();

        let listHTML = materials.length > 0 
            ? materials.map(m => `<li><a href="#" onclick="window.open('SecureViewer.html?id=${m.id}', '_blank'); return false;" style="color: #ffcc00; text-decoration: none; font-size: 16px;">📑 ${m.topic}</a></li>`).join("")
            : `<li style="color: #aaa;">No notes available for this subject yet.</li>`;

        container.innerHTML = `
            <h2 style="margin-top: 30px;" class="fade-in">${std} ${subject} - Chapter Notes</h2>
            <div class="demo-box fade-in" id="boardNoteBox">
                <ul style="list-style: none; display: grid; gap: 15px;">
                    ${listHTML}
                </ul>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<p style="color: #ff4d4d;">Error loading notes.</p>`;
    }
}




async function loadMCQSection() {
    const container = document.getElementById('dynamicContentContainer');
    container.classList.remove('hidden');
    
    container.innerHTML = `<h2 class="fade-in">Calculating Global Progress...</h2>`;
    
    // 1. Get Progress for HUD and Standard Buttons
    const progressData = await getGlobalMCQProgress();
    const percent = progressData.total === 0 ? 0 : Math.round((progressData.completed / progressData.total) * 100);
    
    // 2. Check individual standard completion for the buttons
    const is11thDone = await checkSpecificStandardDone('11th');
    const is12thDone = await checkSpecificStandardDone('12th');

    container.innerHTML = `
        <div class="master-progress-container fade-in" style="margin-bottom: 30px; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,204,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="color: #ffcc00; font-weight: 600; letter-spacing: 1px; font-size: 0.9rem;">ARENA UNLOCK PROGRESS</span>
                <span style="color: #fff; font-family: monospace;">${progressData.completed} / ${progressData.total} Chapters</span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #ffcc00, #ffae00); box-shadow: 0 0 15px rgba(255,204,0,0.4); transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
            <p style="color: #aaa; font-size: 0.8rem; margin-top: 10px; text-align: center;">
                ${percent === 100 ? "🌟 Arena Access Granted!" : `Complete all 11th & 12th chapters to unlock the Daily Challenges Arena.`}
            </p>
        </div>

        <h2 class="fade-in">Select Standard</h2>
        <div class="demo-box fade-in" id="mcq-level1" style="display: flex; gap: 15px;">
            <button class="start-btn inactive-btn type-btn" 
                    style="${is11thDone ? 'border: 2px solid #00ff88 !important;' : ''}"
                    onclick="askMCQExam(this, '11th')">
                11th Standard ${is11thDone ? '<span style="color: #00ff88; margin-left: 8px;">(Completed)</span>' : ''}
            </button>
            
            <button class="start-btn inactive-btn type-btn" 
                    style="${is12thDone ? 'border: 2px solid #00ff88 !important;' : ''}"
                    onclick="askMCQExam(this, '12th')">
                12th Standard ${is12thDone ? '<span style="color: #00ff88; margin-left: 8px;">(Completed)</span>' : ''}
            </button>
        </div>
        <div id="mcq-level2"></div>
        <div id="mcq-level3"></div>
        <div id="mcq-level4"></div>
    `;
    smartScroll('dynamicContentContainer');
}

function askMCQExam(btnElement, std) {
    handleButtonSelection(btnElement, '#mcq-level1 .type-btn');
    document.getElementById("mcq-level3").innerHTML = "";
    document.getElementById("mcq-level4").innerHTML = "";

    const exams = student.target_exam ? student.target_exam.split(',').map(e => e.trim()) : [];
    
    let examButtons = exams.map(exam => 
        `<button class="start-btn inactive-btn type-btn" onclick="askMCQSubject(this, '${exam}', '${std}')">${exam}</button>`
    ).join(" ");

    document.getElementById("mcq-level2").innerHTML = `
        <h2 style="margin-top: 30px;" class="fade-in">Select Exam Target</h2>
        <div class="demo-box fade-in" id="mcqExamBox" style="display: flex; gap: 15px;">
            ${examButtons}
        </div>
    `;
    smartScroll('mcqExamBox');
}

function askMCQSubject(btnElement, exam, std) {
    handleButtonSelection(btnElement, '#mcqExamBox .type-btn');
    document.getElementById("mcq-level4").innerHTML = "";

    let subjectButtons = getSubjectsArray(exam).map(sub => 
        `<button class="start-btn inactive-btn sub-btn" onclick="showMCQTopics(this, '${exam}', '${sub}', '${std}')">${sub}</button>`
    ).join(" ");

    document.getElementById("mcq-level3").innerHTML = `
        <h2 style="margin-top: 30px;" class="fade-in">Select Subject</h2>
        <div class="demo-box fade-in" id="mcqSubjectBox" style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${subjectButtons}
        </div>
    `;
    smartScroll('mcqSubjectBox');
}

// ==========================================
// DYNAMIC MCQ TOPICS LOADING
// ==========================================
async function showMCQTopics(btnElement, exam, subject, std) {
    // 1. Highlight the selected subject button
    handleButtonSelection(btnElement, '#mcqSubjectBox .sub-btn');

    const topicsContainer = document.getElementById("mcq-level4");
    
    // 2. Show a loading message while we fetch the real topics from the database
    topicsContainer.innerHTML = `
        <h2 style="margin-top: 30px;" class="glow-text">Select a Topic</h2>
        <div style="text-align:center; padding: 20px; color: #aaa;">
            <p>Loading topics from the vault...</p>
        </div>
    `;
    topicsContainer.style.display = "block";
    smartScroll('mcq-level4');

    try {
        // 3. Call the exact API route we just created in server.js!
        const response = await fetch(`https://success-academy.onrender.com/api/fetch-topics?standard=${encodeURIComponent(std)}&exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}`);
        
        if (!response.ok) throw new Error("Failed to load topics");
        
        const topicsData = await response.json();

        // 4. If no topics exist for this subject/exam yet
        if (topicsData.length === 0) {
            topicsContainer.innerHTML = `
                <h2 style="margin-top: 30px;" class="glow-text">Select a Topic</h2>
                <div style="text-align:center; padding: 20px; color: #ff4d4d;">
                    <p>No chapters available yet for this subject.</p>
                </div>
            `;
            return;
        }

        // 5. Build the HTML using the REAL topic names from your MySQL database
        let topicsHTML = topicsData.map((item, i) => {
            // Check for current score AND permanent history
            const scoreKey = `mcq_score_${exam}_${subject}_${item.topic}`;
            const historyKey = `mcq_history_${exam}_${subject}_${item.topic}`;
            
            const savedScore = localStorage.getItem(scoreKey);
            const hasHistory = localStorage.getItem(historyKey);

            if (savedScore !== null) {
                // ---> STATE 1: COMPLETED TOPIC (Has Score) <---
                let scoreColor = savedScore >= 80 ? '#00ff88' : (savedScore >= 50 ? '#ffcc00' : '#ff4d4d');
                
                return `
                <div style="background: rgba(0, 255, 136, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(0, 255, 136, 0.3); display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; transition: all 0.3s ease;">
                    <div>
                        <span style="font-weight: 500; font-size: 1.1rem; color: #00ff88;">${item.topic} <span style="font-size: 0.8em; opacity: 0.8;">(Verified ✓)</span></span>
                        <div style="font-size: 0.85rem; color: #aaa; margin-top: 5px;">Diagnostic Score: <strong style="color: ${scoreColor}; text-shadow: 0 0 8px ${scoreColor};">${savedScore}%</strong></div>
                    </div>
                    <button class="start-btn" style="padding: 8px 15px; font-size: 13px; background: transparent; border: 1px solid #ffcc00; border-radius: 5px; color: #ffcc00; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='#ffcc00'; this.style.color='#000';" onmouseout="this.style.background='transparent'; this.style.color='#ffcc00';" onclick="resetTopicTest('${exam}', '${subject}', '${item.topic.replace(/'/g, "\\'")}', '${std}')">Re-initialize Bank</button>
                </div>`;
                
            } else if (hasHistory === 'true') {
                // ---> STATE 2: PREVIOUSLY COMPLETED, BUT CLEARED/RETAKING <---
                return `
                <div style="background: rgba(0, 242, 254, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.3); display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; transition: all 0.3s ease;">
                    <div>
                        <span style="font-weight: 500; font-size: 1.1rem;">${item.topic} <span style="font-size: 0.8em; color: #00f2fe; opacity: 0.8;">(Retaking 🔄)</span></span>
                        <div style="font-size: 0.85rem; color: #aaa; margin-top: 5px;">Status: <strong style="color: #00f2fe; text-shadow: 0 0 8px rgba(0,242,254,0.5);">Previously Completed</strong></div>
                    </div>
                    <button class="start-btn" style="padding: 8px 20px; font-size: 14px; background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); border: none; border-radius: 5px; color: #fff; cursor: pointer; box-shadow: 0 0 10px rgba(0,242,254,0.3);" onclick="goToMCQTest('${exam}', '${subject}', '${item.topic.replace(/'/g, "\\'")}', '${std}')">Start Bank</button>
                </div>`;
                
            } else {
                // ---> STATE 3: BRAND NEW/UNFINISHED TOPIC <---
                return `
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; transition: all 0.3s ease;">
                    <span style="font-weight: 500; font-size: 1.1rem;">${item.topic}</span>
                    <button class="start-btn" style="padding: 8px 20px; font-size: 14px; background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); border: none; border-radius: 5px; color: #fff; cursor: pointer; box-shadow: 0 0 10px rgba(0,242,254,0.3);" onclick="goToMCQTest('${exam}', '${subject}', '${item.topic.replace(/'/g, "\\'")}', '${std}')">Start Bank</button>
                </div>`;
            }
        }).join("");

        // 6. Inject the real chapters into the page
        topicsContainer.innerHTML = `
            <h2 style="margin-top: 30px;" class="glow-text">Select a Topic</h2>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;" class="custom-scrollbar">
                ${topicsHTML}
            </div>
        `;

    } catch (error) {
        console.error("Error fetching topics:", error);
        topicsContainer.innerHTML = `
            <h2 style="margin-top: 30px;" class="glow-text">Select a Topic</h2>
            <div style="text-align:center; padding: 20px; color: #ff4d4d;">
                <p>Failed to connect to the server.</p>
            </div>
        `;
    }
}

function goToMCQTest(exam, subject, topic, std) {
    window.location.href = `MCQ_Test.html?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}&std=${encodeURIComponent(std)}`;
}

// ==========================================
// OPTION 3: DAILY CHALLENGES FLOW
// ==========================================
function loadDailyChallenge() {
    window.location.href = "DC.html";
}

// ==========================================
// UTILITIES
// ==========================================
function getSubjectsArray(examName = null) {
    let subjects = ["Physics", "Chemistry"];
    if (student.subject_group.includes("PCM") || student.subject_group.includes("PCMB")) subjects.push("Mathematics");
    if (student.subject_group.includes("PCB") || student.subject_group.includes("PCMB")) subjects.push("Biology");

    if (examName === "JEE") subjects = subjects.filter(sub => sub !== "Biology");
    else if (examName === "NEET") subjects = subjects.filter(sub => sub !== "Mathematics");

    return subjects;
}

function handleButtonSelection(btnElement, selectorGroup) {
    document.querySelectorAll(selectorGroup).forEach(b => { 
        b.classList.remove('active-btn'); b.classList.add('inactive-btn'); 
    });
    btnElement.classList.add('active-btn');
    btnElement.classList.remove('inactive-btn');
}
// NEW FUNCTION: Plays the click animation, then loads the section
function animateAndLoadMCQ() {
    const card = document.getElementById('mcqCard');
    
    // Prevent double-clicking while animating
    if (card.classList.contains('is-clicked')) return; 
    
    // Trigger the CSS click animations
    card.classList.add('is-clicked');
    
    // Wait for 800ms (so particles can pop and fall) before loading the section
    setTimeout(() => {
        loadMCQSection();
        
        // Optional: remove the class later in case they scroll back up
        setTimeout(() => card.classList.remove('is-clicked'), 500);
    }, 800);
}
// Plays the book flip animation, then loads the section
function animateAndLoadBoard() {
    const card = document.getElementById('bookCard');
    if (card.classList.contains('is-clicked')) return; 
    
    card.classList.add('is-clicked');
    
    // Wait 800ms for the page to completely flip before sliding down
    setTimeout(() => {
        loadBoardSection();
        
        // Wait a little longer (1200ms) before resetting the book so it looks better
        setTimeout(() => card.classList.remove('is-clicked'), 1200);
    }, 800);
}
// Clears a specific topic's progress from the dashboard and restarts it
window.resetTopicTest = function(exam, subject, topic, std) {
    if(confirm(`Are you sure you want to clear your data and restart ${topic}?`)) {
        localStorage.removeItem(`mcq_score_${exam}_${subject}_${topic}`);
        localStorage.removeItem(`mcq_progress_${exam}_${subject}_${topic}`);
        goToMCQTest(exam, subject, topic, std);
    }
}


async function getGlobalMCQProgress() {
    const exams = getExamsArray();
    const standards = ['11th', '12th'];
    const subjects = getSubjectsArray(); 
    let masterTopicList = new Map();

    try {
        for (const std of standards) {
            for (const sub of subjects) {
                // Fetch topics only ONCE per subject/standard using the first exam as curriculum baseline
                const response = await fetch(`https://success-academy.onrender.com/api/fetch-topics?standard=${encodeURIComponent(std)}&exam=${encodeURIComponent(exams[0])}&subject=${encodeURIComponent(sub)}`);
                const topics = await response.json();
                
                topics.forEach(t => {
                    const cleanName = t.topic.trim().toLowerCase();
                    const uniqueID = `${std}_${sub}_${cleanName}`;
                    if (!masterTopicList.has(uniqueID)) {
                        masterTopicList.set(uniqueID, { sub: sub, originalName: t.topic.trim() });
                    }
                });
            }
        }

        let completedCount = 0;
        masterTopicList.forEach((details, key) => {
    const std = key.split('_')[0]; // extract standard from uniqueID
    const historyKey = `mcq_history_${std}_${details.sub}_${details.originalName}`;
    if (localStorage.getItem(historyKey) === 'true') {
        completedCount++;
    }
});

        return { total: masterTopicList.size, completed: completedCount };
    } catch (error) {
        return { total: 0, completed: 0 };
    }
}
async function checkSpecificStandardDone(std) {
    const exams = getExamsArray();
    const subjects = getSubjectsArray(); 
    let standardTopicsMap = new Map();

    try {
        for (const sub of subjects) {
            const response = await fetch(`https://success-academy.onrender.com/api/fetch-topics?standard=${encodeURIComponent(std)}&exam=${encodeURIComponent(exams[0])}&subject=${encodeURIComponent(sub)}`);
            const topics = await response.json();
            topics.forEach(t => {
                const uniqueID = `${sub}_${t.topic.trim().toLowerCase()}`;
                if (!standardTopicsMap.has(uniqueID)) {
                    standardTopicsMap.set(uniqueID, { sub: sub, originalName: t.topic.trim() });
                }
            });
        }

        if (standardTopicsMap.size === 0) return false;

        let allDone = true;
        standardTopicsMap.forEach(details => {
          const finished = localStorage.getItem(
    `mcq_history_${std}_${details.sub}_${details.originalName}`
) === 'true';
            if (!finished) allDone = false;
        });
        return allDone;
    } catch (e) { return false; }
}

async function checkAllTopicsCompleted(studentProfile) {
    // Simply check if both 11th and 12th are done using our new strict logic
    const is11thDone = await checkSpecificStandardDone('11th');
    const is12thDone = await checkSpecificStandardDone('12th');
    return is11thDone && is12thDone;
}