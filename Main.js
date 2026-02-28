// ==========================================
// GLOBAL INITIALIZATION
// ==========================================
// Loader handling
window.addEventListener("load", () => {
  const loader = document.querySelector(".loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.style.display = "none", 500);
  }
});

// ==========================================
// 1. SHARED NAVBAR & STATE MANAGEMENT
// ==========================================
function updateNavbarState() {
  const isRegistered = localStorage.getItem("isRegistered");
  const isUnlocked = localStorage.getItem("isUnlocked");

  const groups = {
    public: document.getElementById("publicButtons"),
    unlocked: document.getElementById("unlockedButtons"),
    registered: document.getElementById("registeredButtons")
  };
  
  // Target the Contact section
  const contactSection = document.getElementById("contact");

  if (groups.public) groups.public.style.display = "none";
  if (groups.unlocked) groups.unlocked.style.display = "none";
  if (groups.registered) groups.registered.style.display = "none";

  if (isRegistered === "true") {
    if (groups.registered) groups.registered.style.display = "flex";
    
    // HIDE the entire Contact Us section for registered students
    if (contactSection) contactSection.style.display = "none"; 
    
  } else if (isUnlocked === "true") {
    if (groups.unlocked) groups.unlocked.style.display = "flex";
    
    // Show Contact Us section for unlocked (but unregistered) users
    if (contactSection) contactSection.style.display = "block";
    
  } else {
    if (groups.public) groups.public.style.display = "flex";
    
    // Show Contact Us section for completely public visitors
    if (contactSection) contactSection.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateNavbarState();
  
  // Initialize particles if the container exists
  if (document.getElementById("particles-js") && typeof tsParticles !== "undefined") {
    tsParticles.load("particles-js", {
      particles: {
        number: { value: 60 },
        size: { value: 3 },
        move: { enable: true, speed: 1 },
        links: { enable: true, color: "#ffffff" },
        color: { value: "#ffffff" }
      },
      background: { color: "transparent" }
    });
  }
});

// Navbar shrink on scroll
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar?.classList.add("scrolled");
  } else {
    navbar?.classList.remove("scrolled");
  }
});

// Hamburger Menu Toggle
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");
hamburger?.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navMenu?.classList.toggle("active");
});
document.querySelectorAll(".nav-menu a").forEach(link => {
  link.addEventListener("click", () => {
    hamburger?.classList.remove("active");
    navMenu?.classList.remove("active");
  });
});

// ==========================================
// 2. MODAL & ACCESS CONTROL LOGIC (SHARED)
// ==========================================
const modals = {
  apply: document.getElementById("applyModal"), // Kept apply as registerModal based on your HTML
  unlock: document.getElementById("unlockModal"),
  login: document.getElementById("loginModal"),
  register: document.getElementById("registerModal"),
  otp: document.getElementById("otpModal"),
  success: document.getElementById("successModal")
};

// Open Handlers
document.getElementById("openUnlockModal")?.addEventListener("click", () => {
    modals.unlock.style.display = "flex";
    setTimeout(startQRScanner, 300);
});
document.getElementById("openRegisterModal")?.addEventListener("click", () => modals.register.style.display = "flex");
document.getElementById("openLoginModal")?.addEventListener("click", () => modals.login.style.display = "flex");
document.getElementById("openLoginOnly")?.addEventListener("click", () => modals.login.style.display = "flex");
document.getElementById("openApplyModal")?.addEventListener("click", () => modals.apply.style.display = "flex");

// Close Handlers
document.querySelectorAll(".close-btn, .close-login").forEach(btn => {
  btn.addEventListener("click", () => {
    const modal = btn.closest(".auth-modal");
    if (modal) modal.style.display = "none";
  });
});
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("auth-modal")) e.target.style.display = "none";
});

// async function startQRScanner() {
//     try {
//         const devices = await Html5Qrcode.getCameras();

//         if (devices && devices.length) {
//             const cameraId = devices[0].id;

//             const qrScanner = new Html5Qrcode("qrScanner");

//             await qrScanner.start(
//                 cameraId,
//                 { fps: 10, qrbox: 250 },
//                 async (decodedText) => {
//                     await qrScanner.stop();
async function startQRScanner() {
    try {
        const qrScanner = new Html5Qrcode("qrScanner");

        // Use { facingMode: "environment" } to specifically request the back camera
        await qrScanner.start(
            { facingMode: "environment" }, 
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 } // Better practice to use an object
            },
            async (decodedText) => {
                await qrScanner.stop();

                    const response = await fetch('https://success-academy.onrender.com/api/validate-unlock-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: decodedText })
                    });

                    const data = await response.json();

                    if (data.success) {
                        localStorage.setItem("isUnlocked", "true");
                        modals.unlock.style.display = "none";
                        updateNavbarState();
                        alert("✅ Registration Unlocked!");
                    } else {
                        alert("❌ " + data.error);
                    }
                }
            );
            } catch (err) {
        console.error(err);
        alert("❌ Camera access error: " + err);
    }
}

//         } else {
//             alert("❌ No camera found on this device.");
//         }

//     } catch (err) {
//         console.error(err);
//         alert("❌ Camera permission denied or not supported.");
//     }
// }
// ==========================================
// 3. REGISTRATION & OTP (Backend Connected)
// ==========================================
let pendingRegistrationData = {};

document.getElementById("registrationForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const inputs = this.querySelectorAll("input");
    const selects = this.querySelectorAll("select");
    
    pendingRegistrationData = {
        name: document.getElementById("regName").value.trim(),
        phone: document.getElementById("regPhone").value.trim(),
        email: document.getElementById("regEmail").value.trim(),
        // Note: Make sure your backend server.js is updated to accept these new fields too!
        parentPhone: document.getElementById("regParentPhone").value.trim(),
        schoolName: document.getElementById("regSchool").value.trim(),
        
        standard: document.getElementById("regStandard").value,
        subjectGroup: document.getElementById("regGroup").value,
        studentType: document.getElementById("regType").value,
        targetExam: Array.from(this.querySelectorAll(".course-options input:checked")).map(cb => cb.value).join(",")
    };
    const submitBtn = this.querySelector("button[type='submit']");
    submitBtn.innerText = "Sending OTP...";
    submitBtn.disabled = true;

    // Call Backend to send OTP
    try {
        const response = await fetch('https://success-academy.onrender.com/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingRegistrationData.email, name: pendingRegistrationData.name })
        });
        
        if (response.ok) {
            if(modals.register) modals.register.style.display = "none";
            if(modals.otp) modals.otp.style.display = "flex";
        } else {
            alert("❌ Failed to send OTP. Please check your email.");
        }
    } catch (error) {
        console.error("OTP Request Error:", error);
    } finally {
        submitBtn.innerText = "Register";
        submitBtn.disabled = false;
    }
});

document.getElementById("verifyOtpBtn")?.addEventListener("click", async () => {
    const otpInput = document.getElementById("otpInput").value.trim();
    const otpError = document.querySelector(".otp-error");

    if (!otpInput) return;

    // Attach OTP to the payload
    const finalPayload = { ...pendingRegistrationData, otp: otpInput };

    try {
        const response = await fetch('https://success-academy.onrender.com/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            if(modals.otp) modals.otp.style.display = "none";
            if(modals.success) modals.success.style.display = "flex";
            
            document.getElementById("registrationForm").reset();
            document.getElementById("otpInput").value = "";
            
            // This satisfies Condition 3: Hides "Register", keeps "Login"
            localStorage.setItem("isRegistered", "true");
            localStorage.removeItem("isUnlocked"); 
            updateNavbarState(); 

            setTimeout(() => {
                if(modals.success) modals.success.style.display = "none";
            }, 3000);
        } else {
            otpError.innerText = "❌ " + data.error;
            otpError.style.display = "block";
        }
    } catch (error) {
        console.error("Registration Error:", error);
        alert("❌ Server connection error.");
    }
});

// ==========================================
// 4. LOGIN LOGIC (Backend Connected)
// ==========================================
document.getElementById("loginForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const regNo = this.querySelector("input[placeholder*='Registration']").value.trim();
  const password = this.querySelector("input[type='password']").value.trim();
  const remember = document.getElementById("rememberMe")?.checked;
  const successMsg = document.querySelector(".login-success");
  const loginBtn = this.querySelector("button[type='submit']");

  loginBtn.textContent = "Checking...";

  try {
    const response = await fetch('https://success-academy.onrender.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reg_no: regNo, password: password })
    });

    const data = await response.json();

    if (data.success) {
      if (successMsg) { 
        successMsg.innerText = `✅ Welcome ${data.user.name}!`; 
        successMsg.style.display = "block"; 
      }
      
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      
      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = "Admin.html";
        } else {
          window.location.href = "Dashboard.html";
        }
      }, 1000);
    } else {
      // NEW LOGIC: Check if it's the graduation farewell message
      if (data.error && data.error.includes("trusting us to shape your future")) {
          // Hide the login modal
          if(modals.login) modals.login.style.display = "none";
          
          // Show the beautiful Trophy modal instead of a scary alert
          document.getElementById('graduationMessageText').innerText = data.error;
          document.getElementById('graduationModal').style.display = "flex";
      } else {
          // For normal errors (like wrong password), keep the normal alert
          alert("❌ " + data.error);
      }
      loginBtn.textContent = "Login";
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Could not connect to the server.");
    loginBtn.textContent = "Login";
  }
});

// ==========================================
// 5. INQUIRIES & CONTACT
// ==========================================
document.getElementById("admissionInquiryForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const submitBtn = this.querySelector("button[type='submit']");
  const originalText = submitBtn.innerText;
  submitBtn.innerText = "Submitting...";
  submitBtn.disabled = true;

  // Gather data directly from the Apply form
  const applyData = {
      name: document.getElementById("applyName").value.trim(),
      phone: document.getElementById("applyPhone").value.trim(),
      email: document.getElementById("applyEmail").value.trim(),
      parentPhone: document.getElementById("applyParentPhone").value.trim(),
      schoolName: document.getElementById("applySchool").value.trim(),
      standard: document.getElementById("applyStandard").value,
      subjectGroup: document.getElementById("applyGroup").value,
      studentType: document.getElementById("applyType").value,
      targetExam: Array.from(this.querySelectorAll(".apply-course-cb:checked")).map(cb => cb.value).join(",")
  };

  try {
      // Send data straight to the admin dashboard (no OTP)
      const response = await fetch('https://success-academy.onrender.com/api/apply-admission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(applyData)
      });
      
      const result = await response.json();
      
      if (result.success) {
          alert("✅ Application Submitted! Our team will contact you shortly.");
          if(modals.apply) modals.apply.style.display = "none";
          this.reset();
      } else {
          alert("❌ Error: " + result.error);
      }
  } catch (error) {
      console.error("Application Error:", error);
      alert("❌ Failed to connect to server.");
  } finally {
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
  }
});

document.getElementById("contactForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const sendBtn = document.getElementById("sendBtn");
    const contactSuccess = document.querySelector(".contact-success");
    
    // 1. Gather the form data
    const formData = {
        name: this.querySelector('input[name="name"]').value,
        email: this.querySelector('input[name="email"]').value,
        phone: this.querySelector('input[name="phone"]').value,
        subject: this.querySelector('input[name="subject"]').value,
        message: this.querySelector('textarea[name="message"]').value
    };

    if(sendBtn) {
        sendBtn.classList.add("loading");
        sendBtn.textContent = "Sending...";
        sendBtn.disabled = true;
    }

    try {
        // 2. Send data to the backend
        const response = await fetch('https://success-academy.onrender.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();

        if (data.success) {
            if (contactSuccess) contactSuccess.style.display = "block";
            this.reset();
            setTimeout(() => { if (contactSuccess) contactSuccess.style.display = "none"; }, 4000);
        } else {
            alert("❌ Error: " + data.error);
        }
    } catch (error) {
        console.error("Contact Error:", error);
        alert("❌ Failed to send message. Is the server running?");
    } finally {
        if(sendBtn) {
            sendBtn.classList.remove("loading");
            sendBtn.textContent = "Send Message";
            sendBtn.disabled = false;
        }
    }
});

// ==========================================
// 6. SHARED SCROLL ANIMATIONS
// ==========================================
function revealOnScroll() {
  const reveals = document.querySelectorAll(".reveal");
  reveals.forEach(el => {
    const windowHeight = window.innerHeight;
    const elementTop = el.getBoundingClientRect().top;
    if (elementTop < windowHeight - 100) el.classList.add("active");
    else el.classList.remove("active");
  });
}
window.addEventListener("scroll", revealOnScroll);
revealOnScroll(); // Trigger once on load

// ==========================================
// 7. HOMEPAGE SPECIFIC LOGIC
// ==========================================

// Counter Animation
const statsSection = document.querySelector(".stats");
if (statsSection) {
  const counters = document.querySelectorAll(".counter");
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        counters.forEach(counter => {
          const target = +counter.getAttribute("data-target");
          let count = 0;
          const increment = target / 200;
          const update = () => {
            if (count < target) {
              count += increment;
              counter.innerText = Math.ceil(count).toLocaleString();
              requestAnimationFrame(update);
            } else {
              counter.innerText = target.toLocaleString();
            }
          };
          update();
        });
      }
    });
  }, { threshold: 0.5 });
  counterObserver.observe(statsSection);
}

// Image Slider
const slides = document.querySelectorAll(".image-slider .slide");
const dots = document.querySelectorAll(".dot");
if (slides.length > 0) {
  let currentSlide = 0;
  function showSlide(index) {
    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active"));
    slides[index].classList.add("active");
    if(dots[index]) dots[index].classList.add("active");
    currentSlide = index;
  }
  document.querySelector(".next")?.addEventListener("click", () => showSlide((currentSlide + 1) % slides.length));
  document.querySelector(".prev")?.addEventListener("click", () => showSlide((currentSlide - 1 + slides.length) % slides.length));
  setInterval(() => showSlide((currentSlide + 1) % slides.length), 4000);
}

// Video Controls
document.getElementById("soundToggle")?.addEventListener("click", function() {
  const video = document.getElementById("academyVideo");
  if (video) {
    if (video.muted) {
      video.muted = false;
      this.textContent = "🔊";
    } else {
      video.muted = true;
      this.textContent = "🔇";
    }
  }
});

// Exam Paper Selection Check
// Exam Paper Selection Check
document.querySelectorAll(".exam-paper").forEach(paper => {
  paper.addEventListener("click", () => {
    const goal = paper.getAttribute("data-course");
    const checkboxes = document.querySelectorAll(".course-options input");
    checkboxes.forEach(c => c.checked = (c.value === goal));

    // PERFECTED LOGIC: Check Registration first, then Unlocked, then Default
    if (localStorage.getItem("isRegistered") === "true") {
      // If already registered, tell them to login
      alert("You are already registered! Please Login to your Student Portal.");
      if(modals.login) modals.login.style.display = "flex";
      
    } else if (localStorage.getItem("isUnlocked") === "true") {
      // If unlocked but not registered yet, open registration form
      if(modals.register) modals.register.style.display = "flex";
      
    } else {
      // If totally new user, ask them to unlock
      if(modals.unlock) modals.unlock.style.display = "flex";
    }
  });
});

// ==========================================
// 8. RESULT PAGE SPECIFIC LOGIC
// ==========================================

// Results XML Fetcher
const yearSelect = document.getElementById("yearSelect");
if (yearSelect) {
  const tableContainer = document.getElementById("resultTableContainer");
  const tableBody = document.getElementById("resultTableBody");
  const downloadLink = document.getElementById("downloadLink");

  yearSelect.addEventListener("change", function () {
    const selectedYear = this.value;
    if (!selectedYear) {
      tableContainer.style.display = "none";
      return;
    }

    const filePath = `assest/results_${selectedYear}.xml`;

    fetch(filePath)
      .then(response => {
        if (!response.ok) throw new Error("File not found");
        return response.text();
      })
      .then(data => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");
        const students = xml.getElementsByTagName("student");
        tableBody.innerHTML = "";

        for (let i = 0; i < students.length; i++) {
          const name = students[i].getElementsByTagName("name")[0].textContent;
          const marks = students[i].getElementsByTagName("marks")[0].textContent;
          const exam = students[i].getElementsByTagName("exam")[0].textContent;

          let medal = "";
          if (i === 0) medal = "🥇";
          else if (i === 1) medal = "🥈";
          else if (i === 2) medal = "🥉";

          const row = `
            <tr class="result-row">
              <td>${medal ? medal : i + 1}</td>
              <td>${name}</td>
              <td>${marks}% (${exam})</td>
            </tr>
          `;
          tableBody.innerHTML += row;
        }
        downloadLink.href = filePath;
        tableContainer.style.display = "block";
      })
      .catch(() => {
        tableBody.innerHTML = `<tr><td colspan="3">Result file not available for this year.</td></tr>`;
        tableContainer.style.display = "block";
      });
  });
}

// Result Page Confetti Effect
if (typeof confetti !== "undefined") {
  let canPop = true;   
  let lastPopTime = 0; 
  const cooldownTime = 2 * 60 * 1000; 

  document.addEventListener("mouseenter", function(e){
    // Only trigger if a result-row exists on this page
    const firstRow = e.target.closest(".result-row:first-child");
    if(firstRow){
      const now = Date.now();
      if(canPop && (now - lastPopTime > cooldownTime)){
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 }
        });
        canPop = false;
        lastPopTime = now;
        setTimeout(() => canPop = true, cooldownTime);
      }
    }
  }, true);
}