// ================= BASE CONFIGURATION =================
const API_BASE_URL = 'https://success-academy.onrender.com/api';
const ADMIN_KEY = 'SuperSecretAdminPassword123!'; // MUST match process.env.ADMIN_SECRET_KEY in server.js
let allStudentsDB = []; // Will store fetched students

document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    
    // // If no one is logged in, OR if the person logged in is not an admin, kick them out!
    // if (!currentUser || currentUser.role !== 'admin') {
    //     alert("🔒 Unauthorized Access. You must be an Admin.");
    //     window.location.href = "Homepage.html";
    //     return; // Stops the rest of the page from loading
    // }
});

// ================= INITIALIZATION & PAGE LOADER =================
window.addEventListener("load", function () {
  const loader = document.querySelector(".loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => { loader.style.display = "none"; }, 500);
  }
  
  // Set today's date in attendance field
  document.getElementById('attDate').valueAsDate = new Date();

  // Load all dashboard and system data
  loadDashboardStats();
  loadPendingApprovals();
  loadAllStudents();
  loadMessages();
  loadPublicInquiries();
  loadAdminLeaderboard();
  loadAdmissionApplications();
});

// ================= SIDEBAR & NAVIGATION =================
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('.content-section');
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    navLinks.forEach(nav => nav.classList.remove('active'));
    this.classList.add('active');
    sections.forEach(sec => sec.classList.remove('active'));
    const targetId = this.getAttribute('data-target');
    document.getElementById(targetId).classList.add('active');
    if(window.innerWidth <= 900) sidebar.classList.remove('active');
  });
});

hamburger.addEventListener('click', () => sidebar.classList.toggle('active'));

function confirmLogout() {
  if(confirm("Are you sure you want to exit the Admin Panel?")) {
    window.location.href = "Homepage.html";
  }
}

// ================= DASHBOARD & APPROVALS LOGIC =================

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const data = await response.json();
        document.getElementById('totalStudentsCount').innerText = data.total || 0;
        document.getElementById('pendingCount').innerText = data.pending || 0;
    } catch (err) {
        console.error("Failed to load stats", err);
    }
}

async function loadPendingApprovals() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/pending-students`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const students = await response.json();
        const tbody = document.getElementById('pendingRegistrations');
        tbody.innerHTML = '';

        if(students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ccc;">No pending approvals.</td></tr>`;
            return;
        }

        students.forEach(student => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${student.name}</strong><br><span style="font-size: 12px; color: #aaa;">${student.phone}</span></td>
                    <td>${student.standard}</td>
                    <td>${student.subject_group} <br> ${student.student_type}</td>
                    <td>
                        <button class="action-btn approve-btn" onclick="approveStudent(${student.id}, '${student.name}', this)">Approve</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Failed to load pending students", err);
        const tbody = document.getElementById('pendingRegistrations');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:#ff4d4d;">
                    Failed to load pending registrations.
                </td>
            </tr>
        `;
    }
}

async function approveStudent(studentId, studentName, btnElement) {
    if(confirm(`Approve ${studentName} and automatically send login credentials to their email?`)) {
        btnElement.innerText = "Approving...";
        btnElement.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/approve-student`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-key': ADMIN_KEY 
                },
                body: JSON.stringify({ student_id: studentId })
            });
            const result = await response.json();
            
            if(result.success) {
                alert(`✅ Success! ${studentName} approved.\n\nReg No: ${result.credentials.reg_no}\nPassword: ${result.credentials.password}`);
                loadPendingApprovals(); // Refresh list
                loadDashboardStats(); // Refresh count
                loadAllStudents(); // Add to main list
            } else {
                alert("Error: " + result.error);
                btnElement.innerText = "Approve";
                btnElement.disabled = false;
            }
        } catch(err) {
            console.error(err);
            alert("Failed to communicate with server.");
        }
    }
}

// ================= MANAGE STUDENTS LOGIC =================

async function loadAllStudents() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/students`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        allStudentsDB = await response.json();
        searchStudent(); // Render table
    } catch (err) {
        console.error("Failed to load students", err);
    }
}

// Function to allow pressing "Enter" to search
function handleSearchEnter(event) {
    if (event.key === "Enter") {
        searchStudent();
    }
}

function searchStudent() {
    const query = document.getElementById("searchInput").value.trim().toLowerCase();
    const statusFilter = document.getElementById("filterStatus").value; // Active or Graduated
    const tbody = document.getElementById("searchResultsBody");
    tbody.innerHTML = ""; 

    // 1. Filter by Status First (Treating null/empty as 'Active')
    let matchingStudents = allStudentsDB.filter(student => {
        const studentStatus = student.status || 'Active'; 
        return studentStatus === statusFilter;
    });

    // 2. Then filter by the text search if the admin typed anything
    if (query !== "") {
        matchingStudents = matchingStudents.filter(student => 
          student.name.toLowerCase().includes(query) || student.reg_no.toLowerCase().includes(query)
        );
    }

    if (matchingStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4d4d;">No ${statusFilter.toLowerCase()} students found.</td></tr>`;
        return;
    }

    matchingStudents.forEach(student => {
        tbody.innerHTML += `
            <tr>
                <td style="color: #ffcc00; font-weight: 600;">${student.reg_no}</td>
                <td>${student.name}</td>
                <td>${student.standard}</td>
                <td>${student.student_type}</td>
                <td><button class="action-btn" onclick="openProfileModal(${student.id})">Edit Profile</button></td>
            </tr>
        `;
    });
}

// ================= EXPORT TO EXCEL LOGIC =================

// Helper function to filter and sort students Serially
function filterAndSortStudentsForExport(std, type) {
    if (!std || !type) {
        alert("❌ Please select both Standard and Type from the dropdowns.");
        return null;
    }

    // Filter by Standard
    let filtered = allStudentsDB.filter(s => s.standard === std);
    
    // Filter by Type (unless "All" is selected)
    if (type !== "All") {
        filtered = filtered.filter(s => s.student_type === type);
    }

    if (filtered.length === 0) {
        alert(`❌ No students found for ${std} - ${type}`);
        return null;
    }

    // STRICTLY Sort Serially by Registration Number (Ascending)
    filtered.sort((a, b) => a.reg_no.localeCompare(b.reg_no));
    
    return filtered;
}

// 1. Download Whole Datasheet
function downloadWholeDatasheet() {
    const std = document.getElementById("exportWholeStd").value;
    const type = document.getElementById("exportWholeType").value;
    
    const students = filterAndSortStudentsForExport(std, type);
    if (!students) return;

    // Map all data to neat columns
    const excelData = students.map(s => ({
        "Registration Number": s.reg_no,
        "Name": s.name,
        "Email Address": s.email || "N/A",
        "Standard": s.standard,
        "Type": s.student_type,
        "Course Group": s.subject_group,
        "Target Exam": s.target_exam,
        "Student Phone": s.phone,
        "Parent Phone": s.parent_phone,
        "School Name": s.school_name
    }));

    // Create and download Excel file
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Data");
    XLSX.writeFile(wb, `SuccessAcademy_Datasheet_${std}_${type}.xlsx`);
}

// 2. Download Marks Display Template
function downloadMarksTemplate() {
    const std = document.getElementById("exportMarksStd").value;
    const type = document.getElementById("exportMarksType").value;
    
    const students = filterAndSortStudentsForExport(std, type);
    if (!students) return;

    // Map strictly to the exact format your server.js needs for uploading
    const excelData = students.map(s => ({
        "Registration Number": s.reg_no,
        "Name": s.name,
        "Marks Obtained": "", // Left blank for teachers to fill
        "Total Marks": ""     // Left blank for teachers to fill
    }));

    // Create and download Excel file
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks Entry");
    XLSX.writeFile(wb, `Marks_Template_${std}_${type}.xlsx`);
}

// ================= MODAL & EDIT LOGIC =================
async function openProfileModal(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const student = await response.json();

        document.getElementById("modalStudentId").value = student.id;
        document.getElementById("modalRegNoDisplay").innerText = student.reg_no;
        document.getElementById("modalName").value = student.name;
        document.getElementById("modalEmail").value = student.email || "";
        document.getElementById("modalPhone").value = student.phone;
        document.getElementById("modalParentPhone").value = student.parent_phone;
        document.getElementById("modalSchool").value = student.school_name;
        document.getElementById("modalStd").value = student.standard;
        document.getElementById("modalType").value = student.student_type;
        document.getElementById("modalGroup").value = student.subject_group;
        // Parse the comma-separated exams and check the corresponding boxes
        const savedExams = student.target_exam ? student.target_exam.split(',').map(e => e.trim()) : [];
        document.querySelectorAll('.edit-exam-cb').forEach(cb => {
            cb.checked = savedExams.includes(cb.value);
        });

        document.getElementById("studentProfileModal").style.display = "flex";
    } catch(err) {
        alert("Failed to load student details.");
    }
}

function closeProfileModal() { document.getElementById("studentProfileModal").style.display = "none"; }

async function updateStudent() {
    const id = document.getElementById("modalStudentId").value;
    const data = {
        name: document.getElementById("modalName").value,
        email: document.getElementById("modalEmail").value,
        phone: document.getElementById("modalPhone").value,
        parent_phone: document.getElementById("modalParentPhone").value,
        school_name: document.getElementById("modalSchool").value,
        standard: document.getElementById("modalStd").value,
        student_type: document.getElementById("modalType").value,
        subject_group: document.getElementById("modalGroup").value,
        // Gather all checked boxes and join them with a comma
        target_exam: Array.from(document.querySelectorAll(".edit-exam-cb:checked")).map(cb => cb.value).join(",")
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/students/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY 
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if(result.success) {
            alert("Student profile updated successfully!");
            closeProfileModal();
            loadAllStudents();
        }
    } catch(err) {
        alert("Update failed.");
    }
}

async function deleteStudent() {
    const id = document.getElementById("modalStudentId").value;
    const name = document.getElementById("modalName").value;
    
    if(confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${name}? This will erase all their marks, attendance, and queries.`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/students/${id}`, { 
                method: 'DELETE',
                headers: { 'x-admin-key': ADMIN_KEY }
            });
            const result = await response.json();
            
            if(result.success) {
                alert("Student permanently deleted.");
                closeProfileModal();
                loadAllStudents();
                loadDashboardStats();
            }
        } catch(err) {
            alert("Delete failed.");
        }
    }
}

// ================= ATTENDANCE LOGIC =================
async function loadAttendanceList() {
    const date = document.getElementById("attDate").value; // 1. Grab the selected date
    const std = document.getElementById("attStandard").value;
    const type = document.getElementById("attType").value;
    const tbody = document.getElementById("attendanceListBody");

    // 2. Ensure date is selected before loading
    if (!date || !std || !type) {
        alert("❌ Please select a Date, Standard, and Batch Type.");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading students...</td></tr>`;

    try {
        const safeDate = encodeURIComponent(date);
        const safeStd = encodeURIComponent(std);
        const safeType = encodeURIComponent(type);
        
        // 3. Pass the date to the backend URL
        const response = await fetch(`${API_BASE_URL}/admin/students-by-batch?date=${safeDate}&standard=${safeStd}&type=${safeType}`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        currentAttendanceBatch = await response.json();
        
        tbody.innerHTML = "";
        
        if(currentAttendanceBatch.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#00ff88;">All students for this batch have already been marked for ${date}, or no active students exist.</td></tr>`;
            return;
        }

        currentAttendanceBatch.forEach(student => {
            // Default everyone to present locally
            student.currentStatus = 'Present'; 

            tbody.innerHTML += `
                <tr>
                    <td style="color: #ffcc00; font-weight: 600;">${student.reg_no}</td>
                    <td>${student.name}</td>
                    <td>${student.student_type}</td>
                    <td class="attendance-cell" style="display: flex; gap: 10px; justify-content: center;">
                        <button class="present-btn" onclick="toggleAttendance(${student.id}, 'Present', this)" style="background: #00ff88; color: #000; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Present</button>
                        <button class="absent-btn" onclick="toggleAttendance(${student.id}, 'Absent', this)" style="background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Absent</button>
                    </td>
                </tr>
            `;
        });
    } catch(err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ff4d4d;">Failed to load students. Is the server running?</td></tr>`;
    }
}

function toggleAttendance(studentId, status, btnElement) {
    // Update local state
    const student = currentAttendanceBatch.find(s => s.id === studentId);
    if(student) student.currentStatus = status;

    // Update UI
    const td = btnElement.closest('.attendance-cell');
    const pBtn = td.querySelector('.present-btn');
    const aBtn = td.querySelector('.absent-btn');

    if (status === 'Present') {
        pBtn.style.background = '#00ff88'; pBtn.style.color = '#000'; pBtn.style.border = 'none';
        aBtn.style.background = 'transparent'; aBtn.style.color = '#ff4d4d'; aBtn.style.border = '1px solid #ff4d4d';
    } else {
        aBtn.style.background = '#ff4d4d'; aBtn.style.color = '#fff'; aBtn.style.border = 'none';
        pBtn.style.background = 'transparent'; pBtn.style.color = '#00ff88'; pBtn.style.border = '1px solid #00ff88';
    }
}

async function submitAttendance() {
    if (currentAttendanceBatch.length === 0) {
        alert("❌ Load a student list first.");
        return;
    }

    const date = document.getElementById('attDate').value;
    if(!date) return alert("❌ Please select a date first!");

    // Map current status to the format backend expects
    const attendanceData = currentAttendanceBatch.map(s => ({
        student_id: s.id,
        status: s.currentStatus
    }));

    const submitBtn = event.target;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/attendance`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY
            },
            body: JSON.stringify({ date, attendanceData })
        });
        const result = await response.json();

        if(result.success) {
            alert(`✅ ${result.message}`);
            document.getElementById("attendanceListBody").innerHTML = `<tr><td colspan="4" style="text-align:center;">Attendance Submitted Successfully!</td></tr>`;
            currentAttendanceBatch = [];
        } else {
            alert("Error: " + result.error);
        }
    } catch(err) {
        console.error(err);
        alert("Server error. Check backend console.");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

// ================= UPLOAD MARKS LOGIC =================
function updateFileName(input) {
  const display = document.getElementById('fileNameDisplay');
  if (input.files && input.files.length > 0) {
    display.innerText = "Selected File: " + input.files[0].name;
    display.style.color = "#00ff88";
  }
}

async function uploadExcelMarks(event) {
    event.preventDefault();
    const fileInput = document.getElementById('marksFile');
    const btn = document.getElementById('marksSubmitBtn');

    if(!fileInput.files.length) return alert("❌ Select a file!");

    btn.innerText = "Uploading & Parsing Excel...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('marksFile', fileInput.files[0]);
    formData.append('standard', document.getElementById('marksStd').value);
    formData.append('examTitle', document.getElementById('marksTitle').value);
    formData.append('examDate', document.getElementById('marksDate').value);
    formData.append('subject', document.getElementById('marksSub').value);

    try {
        const response = await fetch(`${API_BASE_URL}/admin/upload-marks`, {
            method: 'POST',
            headers: { 'x-admin-key': ADMIN_KEY }, // Do not set Content-Type here, browser sets multipart/form-data automatically
            body: formData 
        });
        const result = await response.json();
        
        if(result.success) {
            alert("✅ " + result.message);
            event.target.reset();
            document.getElementById('fileNameDisplay').innerText = "Only .xlsx or .csv allowed";
            document.getElementById('fileNameDisplay').style.color = "#aaa";
        } else {
            alert("❌ Error: " + result.error);
        }
    } catch(err) {
        console.error(err);
        alert("Failed to upload marks.");
    } finally {
        btn.innerText = "Upload & Generate Notices";
        btn.disabled = false;
    }
}

// ================= POST NOTICES LOGIC =================
async function publishNotice(event) {
    event.preventDefault();
    
    const data = {
        noticeType: document.getElementById('noticeType').value,
        targetRegNo: document.getElementById('noticeTarget').value,
        title: document.getElementById('noticeTitle').value,
        content: document.getElementById('noticeContent').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/publish-notice`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if(result.success) {
            alert("✅ Notice Published Successfully!");
            event.target.reset();
        } else {
            alert("Error: " + result.error);
        }
    } catch(err) {
        alert("Failed to publish notice.");
    }
}

// ================= EVENTS LOGIC =================
async function addEvent(event) {
    event.preventDefault();
    
    const data = {
        target_standard: document.getElementById('eventStd').value,
        target_type: document.getElementById('eventType').value,
        event_date: document.getElementById('eventDate').value,
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDesc').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/events`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if(result.success) {
            alert("✅ Event added to timeline!");
            event.target.reset();
        }
    } catch(err) {
        alert("Failed to add event.");
    }
}

// ================= MESSAGES & INQUIRIES LOGIC =================

// 1. Load Student Dashboard Messages
async function loadMessages() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/messages?time=${new Date().getTime()}`, { 
            cache: 'no-store',
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const messages = await response.json();
        const tbody = document.getElementById("messagesBody");
        tbody.innerHTML = "";

        if(!messages || messages.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No student messages found.</td></tr>`;
            return;
        }

        messages.forEach(msg => {
            const isReplied = msg.status && msg.status.trim().toLowerCase() === 'replied';
            const statusHtml = isReplied 
                ? `<span class="status-badge active" style="background: rgba(0, 255, 136, 0.2); color: #00ff88;">Replied</span>` 
                : `<span class="status-badge pending" style="background: rgba(255, 204, 0, 0.2); color: #ffcc00;">Pending</span>`;
                
            const btnHtml = isReplied 
                ? `<button class="action-btn" disabled style="opacity:0.5;">Replied</button>` 
                : `<button class="action-btn reply-btn" onclick="openReplyModal('student', ${msg.id || msg.query_id}, '${msg.name}', null, this)">Reply</button>`;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${msg.name}</strong><br><span style="font-size: 12px; color: #ffcc00;">${msg.reg_no}</span></td>
                    <td>${msg.standard} <br> ${msg.student_type}</td>
                    <td>${msg.query_text}</td>
                    <td class="status-cell">${statusHtml}</td>
                    <td class="action-cell">${btnHtml}</td>
                </tr>
            `;
        });
    } catch(err) {
        document.getElementById("messagesBody").innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Failed to load messages.</td></tr>`;
    }
}

// 2. Load Public Homepage Inquiries
async function loadPublicInquiries() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/public-inquiries?time=${new Date().getTime()}`, { 
            cache: 'no-store',
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const inquiries = await response.json();
        const tbody = document.getElementById("publicInquiriesBody");
        tbody.innerHTML = "";

        if(!inquiries || inquiries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No public inquiries found.</td></tr>`;
            return;
        }

        inquiries.forEach(inq => {
            const isReplied = inq.status && inq.status.trim().toLowerCase() === 'replied';
            const statusHtml = isReplied 
                ? `<span class="status-badge active" style="background: rgba(0, 255, 136, 0.2); color: #00ff88;">Replied</span>` 
                : `<span class="status-badge pending" style="background: rgba(255, 77, 77, 0.2); color: #ff4d4d;">New</span>`;
                
            const btnHtml = isReplied 
                ? `<button class="action-btn" disabled style="opacity:0.5;">Email Sent</button>` 
                // Safely handling potential null emails as discussed
                : `<button class="action-btn reply-btn" onclick="openReplyModal('public', ${inq.id}, '${inq.name}', '${inq.email || ''}', this)">Reply via Email</button>`;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${inq.name}</strong><br><span style="font-size: 12px; color: #aaa;">${inq.phone}</span></td>
                    <td>${inq.subject}</td>
                    <td>${inq.message}</td>
                    <td class="status-cell">${statusHtml}</td>
                    <td class="action-cell">${btnHtml}</td>
                </tr>
            `;
        });
    } catch(err) {
        document.getElementById("publicInquiriesBody").innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Failed to load inquiries.</td></tr>`;
    }
}

// ================= CUSTOM MODAL LOGIC =================
let currentRowBeingRepliedTo = null; // Keeps track of which table row to update visually

function openReplyModal(type, id, name, email, btnElement) {
    document.getElementById("replyTargetType").value = type;
    document.getElementById("replyTargetId").value = id;
    document.getElementById("replyTargetEmail").value = email || '';
    
    document.getElementById("replyModalTitle").innerText = type === 'public' ? "Send Email Reply" : "Reply to Student Portal";
    document.getElementById("replyModalSubtitle").innerText = `To: ${name} ${email ? `(${email})` : ''}`;
    document.getElementById("replyMessage").value = ""; 
    
    currentRowBeingRepliedTo = btnElement.closest('tr');
    
    document.getElementById("replyModal").style.display = "flex";
}

function closeReplyModal() {
    document.getElementById("replyModal").style.display = "none";
    currentRowBeingRepliedTo = null;
}

// Close modal if clicking outside
window.addEventListener("click", function(event) {
    if (event.target === document.getElementById("replyModal")) closeReplyModal();
});

// 3. Submit the custom reply
async function submitCustomReply() {
    const type = document.getElementById("replyTargetType").value;
    const id = parseInt(document.getElementById("replyTargetId").value, 10);
    const email = document.getElementById("replyTargetEmail").value;
    const replyText = document.getElementById("replyMessage").value.trim();
    const name = document.getElementById("replyModalSubtitle").innerText.replace('To: ', '').split(' (')[0];

    if (!replyText) return alert("❌ Reply message cannot be empty!");

    const btn = document.getElementById("sendReplyBtn");
    const originalText = btn.innerText;
    btn.innerText = "Sending...";
    btn.disabled = true;

    // Determine which API route to hit based on if it's a student or a public visitor
    const endpoint = type === 'public' ? `${API_BASE_URL}/admin/public-inquiries/reply` : `${API_BASE_URL}/admin/messages/reply`;
    
    // Construct the data payload
    const payload = type === 'public' 
        ? { id: id, email: email, name: name, admin_reply: replyText } 
        : { query_id: id, admin_reply: replyText };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.success) {
            alert(type === 'public' ? `✅ Email Sent Successfully to ${name}!` : `✅ Reply posted to ${name}'s dashboard!`);
            
            // Instantly update the UI table row
            if (currentRowBeingRepliedTo) {
                currentRowBeingRepliedTo.querySelector('.status-cell').innerHTML = `<span class="status-badge active" style="background: rgba(0, 255, 136, 0.2); color: #00ff88;">Replied</span>`;
                currentRowBeingRepliedTo.querySelector('.action-cell').innerHTML = `<button class="action-btn" disabled style="opacity:0.5;">${type === 'public' ? 'Email Sent' : 'Replied'}</button>`;
            }
            
            closeReplyModal();
        } else {
            alert("❌ Failed: " + (result.error || "Unknown error"));
        }
    } catch(err) {
        alert("Server error. Check console.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ================= YEAR-END PROMOTION LOGIC =================
async function executeBulkPromotion() {
    const std = document.getElementById("bulkPromoteStd").value;
    
    const actionText = std === '11th' 
        ? "PROMOTE ALL 11th graders to 12th grade" 
        : "GRADUATE ALL 12th graders and permanently revoke their dashboard access";
    
    // WARNING 1: Standard Yes/No Confirm
    const confirm1 = confirm(`WARNING 1: Are you absolutely sure you want to ${actionText}?`);
    if (!confirm1) return;
    
    // WARNING 2: Hard-Type Confirmation
    const confirm2 = prompt(`WARNING 2: This is a massive database change and cannot be easily undone.\n\nType the word "CONFIRM" in all caps below to proceed:`);
    if (confirm2 !== "CONFIRM") {
        alert("Action cancelled. You did not type 'CONFIRM'.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/bulk-promote`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': ADMIN_KEY
            },
            body: JSON.stringify({ standard: std })
        });
        const result = await response.json();

        if (result.success) {
            alert(`✅ SUCCESS: ${result.message}`);
            // Refresh data on the page
            loadAllStudents(); 
            loadDashboardStats(); 
        } else {
            alert("❌ Error: " + result.error);
        }
    } catch(err) {
        console.error(err);
        alert("Server error during bulk promotion.");
    }
}

// --- ADMISSION APPLICATIONS LOGIC ---
async function loadAdmissionApplications() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/admission-applications`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const applications = await response.json();
        const tbody = document.getElementById('admissionApplicationsBody');
        tbody.innerHTML = '';

        if(applications.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ccc;">No new admission applications.</td></tr>`;
            return;
        }

        applications.forEach(app => {
            // Formatting the date
            const dateApplied = new Date(app.created_at).toLocaleDateString();
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${app.name}</strong><br><span style="font-size: 12px; color: #ffcc00;">Applied: ${dateApplied}</span></td>
                    <td>
                        <span style="font-size: 13px;">📞 ${app.phone} (P: ${app.parent_phone})</span><br>
                        <span style="font-size: 13px; color: #aaa;">✉️ ${app.email}</span>
                    </td>
                    <td>
                        <span style="font-weight: 600;">${app.standard} | ${app.student_type}</span><br>
                        <span style="font-size: 13px; color: #ccc;">${app.subject_group} | ${app.target_exam}</span><br>
                        <span style="font-size: 12px; color: #aaa;">School: ${app.school_name}</span>
                    </td>
                    <td>
                        <button class="action-btn" style="background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d;" onclick="markEnquiryDone(${app.id}, '${app.name}')">Enquiry Done</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Failed to load admission applications", err);
        const tbody = document.getElementById('admissionApplicationsBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:#ff4d4d;">
                    Failed to load applications.
                </td>
            </tr>
        `;
    }
}

async function markEnquiryDone(appId, appName) {
    if(confirm(`Have you completed the enquiry process for ${appName}? This will remove them from this list.`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/admission-applications/${appId}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': ADMIN_KEY }
            });
            const result = await response.json();
            
            if(result.success) {
                loadAdmissionApplications(); // Refresh the table
            } else {
                alert("Error removing application.");
            }
        } catch(err) {
            console.error("Error:", err);
            alert("Failed to communicate with server.");
        }
    }
}

// Leaderboard doesn't inherently need an admin key if it's a public/shared route, 
// but it's okay to leave it open as it was originally /api/leaderboard.
async function loadAdminLeaderboard() {
    const filter = document.getElementById('adminExamFilter').value;
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard?exam=${filter}`);
        const data = await response.json();
        const tbody = document.getElementById('adminLeaderboardBody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No scores found for this week.</td></tr>`;
            return;
        }

        data.forEach((student, index) => {
            // Add a little trophy for the top 3
            let rankDisplay = index + 1;
            if (index === 0) rankDisplay = '🥇 1st';
            if (index === 1) rankDisplay = '🥈 2nd';
            if (index === 2) rankDisplay = '🥉 3rd';

            tbody.innerHTML += `
                <tr>
                    <td style="font-weight: bold; color: ${index < 3 ? '#ffcc00' : 'white'};">${rankDisplay}</td>
                    <td>${student.reg_no}</td>
                    <td>${student.name}</td>
                    <td>${student.exam_type}</td>
                    <td style="color: #00ff88; font-weight: bold;">${student.score}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading leaderboard", error);
    }
}

// ================= QR CODE GENERATION =================
async function generateQR() {
    const qrContainer = document.getElementById("qrContainer");
    qrContainer.innerHTML = "Generating...";

    try {
        // Step 1: Ask backend to create token
        const response = await fetch(`${API_BASE_URL}/admin/generate-unlock-token`, {
            method: "POST",
            headers: { 'x-admin-key': ADMIN_KEY }
        });

        const data = await response.json();

        if (!data.success) {
            qrContainer.innerHTML = "Failed to create token";
            return;
        }

        const token = data.token;

        // Step 2: Generate QR with token
        qrContainer.innerHTML = "";
        QRCode.toCanvas(token, { width: 220 }, function (error, canvas) {
            if (error) {
                console.error(error);
                qrContainer.innerHTML = "QR generation failed";
                return;
            }
            qrContainer.appendChild(canvas);
        });

    } catch (err) {
        console.error(err);
        qrContainer.innerHTML = "Server error";
    }
}