// ==========================================
// 1. UI & NAVIGATION LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", function(){
    const navItems = document.querySelectorAll(".nav-links li");
    const pages = document.querySelectorAll(".page");
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");
    const overlay = document.getElementById("menuOverlay");

    // Navigation switching
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            if(item.classList.contains("logout")) return; 
            
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            const pageId = item.getAttribute("data-page");
            if (pages && pages.length > 0) {
                pages.forEach(page => {
                    page.classList.remove("active-page");
                    if(page.id === pageId) page.classList.add("active-page");
                });
            }

            if(hamburger) hamburger.classList.remove("active");
            if(navLinks) navLinks.classList.remove("active");
            if(overlay) overlay.classList.remove("active");
        });
    });

    // Hamburger toggle
    if (hamburger) {
        hamburger.addEventListener("click", function(){
            hamburger.classList.toggle("active");
            navLinks.classList.toggle("active");
            overlay.classList.toggle("active");
        });
    }

    // Overlay click closes menu
    if (overlay) {
        overlay.addEventListener("click", function(){
            if(hamburger) hamburger.classList.remove("active");
            if(navLinks) navLinks.classList.remove("active");
            overlay.classList.remove("active");
        });
    }
});

// Remove loader smoothly
window.addEventListener("load", function () {
    const loader = document.querySelector(".loader");
    if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => loader.style.display = "none", 500);
    }
});

// Logout function
function confirmLogout(){
    if(confirm("Are you sure you want to logout?")){
        localStorage.removeItem("currentUser");
        window.location.href = "Homepage.html";
    }
}

// ==========================================
// 2. DATA FETCHING & DASHBOARD POPULATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    
    // Security check
    if (!currentUser || currentUser.role !== 'student') {
        alert("🔒 Unauthorized access. Please login as a student.");
        window.location.href = "Homepage.html";
        return;
    }

    try {
        const response = await fetch(`https://success-academy.onrender.com/api/student/dashboard/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            populateDashboard(data);
        } else {
            console.error("Dashboard Error:", data.error);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
});

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// The Master Function that fills the whole page
function populateDashboard(data) {
    const p = data.profile;
    
    // 1. Fill Text Fields
    setText("studentName", p.name);
    setText("studentRegNo", p.reg_no);
    setText("studentStandard", p.standard);
    setText("studentBatch", p.student_type);
    setText("studentGroup", p.subject_group);

   // 2. Update Attendance Meter
    const attendancePct = p.attendance_percentage !== undefined ? p.attendance_percentage : 0; 
    const attText = document.getElementById("attendanceText");
    const attBar = document.getElementById("attendanceBar");
    
    if (attText && attBar) {
        // Update the text physically on the screen
        attText.innerText = `${attendancePct}%`;
        
        // Convert to a strict number
        const numericPct = Number(attendancePct);
        
        setTimeout(() => {
            // Simply set the width to whatever the percentage is, even if it's 0%.
            // The background stays transparent so your CSS pencil scribble works beautifully.
            attBar.setAttribute(
                "style", 
                `width: ${numericPct}% !important; background-color: transparent !important; transition: width 1.5s cubic-bezier(0.25, 1, 0.5, 1) !important;`
            );
        }, 150);
    }

    // 3. Trigger API calls for dynamic sections
    loadEvents(p.standard, p.student_type);
    loadStudentMessages(p.id);

    // 4. Populate Notices (If Notice Board exists on page)
    const noticeContainer = document.getElementById("noticeBoard");
    if (noticeContainer && data.notices) {
        noticeContainer.innerHTML = ""; 
        if (data.notices.length === 0) {
            noticeContainer.innerHTML = "<p style='color: #aaa; text-align: center; padding: 20px;'>No new notices at this time.</p>";
        } else {
            data.notices.forEach(notice => {
                const dateStr = new Date(notice.date_posted).toLocaleDateString('en-GB');
                noticeContainer.innerHTML += `
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #00ff88;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <h4 style="color: #00ff88; margin: 0;">${notice.title}</h4>
                            <small style="color: #aaa;">${dateStr}</small>
                        </div>
                        <p style="font-size: 14px; margin: 0; color: #e2e8f0;">${notice.message}</p>
                    </div>
                `;
            });
        }
    }

    // 5. Populate Marks (If Marks table exists on page)
    const marksBody = document.getElementById("marksTableBody");
    if (marksBody && data.marks) {
        marksBody.innerHTML = ""; 
        if (data.marks.length === 0) {
            marksBody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:#aaa; padding: 20px;'>No marks uploaded yet</td></tr>";
        } else {
            data.marks.forEach(mark => {
                const dateStr = new Date(mark.exam_date).toLocaleDateString('en-GB');
                const percentage = ((mark.marks_obtained / mark.total_marks) * 100).toFixed(1);
                let scoreColor = percentage < 35 ? "#ff4d4d" : percentage < 60 ? "#ffcc00" : "#00ff88";

                marksBody.innerHTML += `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #334155;">${dateStr}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #334155;">${mark.exam_title}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #334155; color: #ffcc00;">${mark.subject}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #334155;">
                            <strong style="color: ${scoreColor}; font-size: 16px;">${mark.marks_obtained}</strong> / ${mark.total_marks} 
                            <span style="font-size: 12px; color: #aaa; margin-left: 5px;">(${percentage}%)</span>
                        </td>
                    </tr>
                `;
            });
        }
    }
}

// ==========================================
// 3. EVENTS & MESSAGING LOGIC
// ==========================================
async function loadEvents(standard, studentType) {
    try {
        const response = await fetch(`https://success-academy.onrender.com/api/student/events?standard=${encodeURIComponent(standard)}&type=${encodeURIComponent(studentType)}`);
        const events = await response.json();
        const timeline = document.getElementById("eventsTimeline");
        
        if (!timeline) return;
        timeline.innerHTML = "";

        if (events.length === 0) {
            timeline.innerHTML = `<p style="padding-left: 30px; color: #aaa;">No upcoming events.</p>`;
            return;
        }

        events.forEach(ev => {
            const dateStr = new Date(ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            timeline.innerHTML += `
                <div class="timeline-item">
                  <div class="timeline-date">${dateStr}</div>
                  <div class="timeline-content">
                    <h3>${ev.title}</h3>
                    <p>${ev.description}</p>
                  </div>
                </div>
            `;
        });
    } catch (error) { console.error("Error loading events:", error); }
}

async function loadStudentMessages(studentId) {
    try {
        const response = await fetch(`https://success-academy.onrender.com/api/student/messages/${studentId}`);
        const messages = await response.json();
        const container = document.getElementById("repliesContainer");
        
        if (!container) return;
        container.innerHTML = "";

        // If no messages exist yet
        if (messages.length === 0) {
            container.innerHTML = `<p style="color: #ccc; text-align: center; padding: 20px;">No message history.</p>`;
            return;
        }

        messages.forEach(msg => {
            // FOOLPROOF FIX: We check if an admin_reply actually exists in the database!
            const hasReply = msg.admin_reply && msg.admin_reply.trim() !== '';
            
            // Set the badge text to exactly what you want
            const displayStatus = hasReply ? 'Replied' : 'Pending'; 

            // Format date safely
            let dateStr = "Recently";
            if(msg.created_at) {
               dateStr = new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            }

            container.innerHTML += `
                <div class="reply-item">
                  <div class="reply-header" onclick="toggleReply(this)">
                    <div class="reply-info">
                      <span class="reply-subject">Query #${msg.id}</span>
                      <span class="reply-date">${dateStr}</span>
                    </div>
                    <div class="reply-status ${hasReply ? 'resolved' : 'pending'}">${displayStatus} ▼</div>
                  </div>
                  <div class="reply-body">
                    <p><strong>Your Message:</strong> ${msg.query_text}</p>
                    <div class="admin-response">
                      ${hasReply 
                        ? `<p><strong>Admin Reply:</strong> ${msg.admin_reply}</p>` 
                        : `<p><em>Waiting for admin response...</em></p>`}
                    </div>
                  </div>
                </div>
            `;
        });
    } catch (error) { console.error("Error loading messages:", error); }
}

// Dropdown accordion for messages
function toggleReply(headerElement) {
    const item = headerElement.parentElement;
    document.querySelectorAll('.reply-item').forEach(el => {
        if(el !== item) el.classList.remove('active');
    });
    item.classList.toggle('active');
}

// Send message to backend
async function sendMessage(event) {
    event.preventDefault(); 
    
    const subject = document.getElementById("msgSubject").value;
    const content = document.getElementById("msgContent").value;
    const combinedMessage = `[${subject}] ${content}`;
    
    const btn = event.target.querySelector(".msg-btn");
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    btn.disabled = true;
    btn.innerText = "Sending...";
    btn.style.opacity = "0.7";

    try {
        const response = await fetch('https://success-academy.onrender.com/api/student/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentUser.id,
                query_text: combinedMessage
            })
        });

        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Success! Your message has been sent to the Admin.`);
            event.target.reset(); 
            loadStudentMessages(currentUser.id); // Instantly reload messages UI
        } else {
            alert("❌ Failed to send message.");
        }
    } catch (error) {
        console.error("Error sending message:", error);
        alert("❌ Server error while sending message.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Send Message 🚀";
        btn.style.opacity = "1";
    }
}
