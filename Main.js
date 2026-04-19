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
  
  // Target the Contact section and the new Hero button
  const contactSection = document.getElementById("contact");
  const heroInquireBtn = document.getElementById("heroInquireBtn"); 

  if (groups.public) groups.public.style.display = "none";
  if (groups.unlocked) groups.unlocked.style.display = "none";
  if (groups.registered) groups.registered.style.display = "none";

  if (isRegistered === "true") {
    if (groups.registered) groups.registered.style.display = "flex";
    
    // HIDE the entire Contact Us section and Inquire button for registered students
    if (contactSection) contactSection.style.display = "none"; 
    if (heroInquireBtn) heroInquireBtn.style.display = "none"; 
    
  } else if (isUnlocked === "true") {
    if (groups.unlocked) groups.unlocked.style.display = "flex";
    
    // Show Contact Us section but HIDE the Inquire button for unlocked users
    if (contactSection) contactSection.style.display = "block";
    if (heroInquireBtn) heroInquireBtn.style.display = "none"; 
    
  } else {
    if (groups.public) groups.public.style.display = "flex";
    
    // Show Contact Us section and SHOW the Inquire button for completely public visitors
    if (contactSection) contactSection.style.display = "block";
    if (heroInquireBtn) heroInquireBtn.style.display = "inline-block"; 
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
document.getElementById("openLoginModal2")?.addEventListener("click", () => modals.login.style.display = "flex");
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
// SECRET ADMIN LOGIN (3-SECOND LONG PRESS)
// ==========================================
const navLogo = document.querySelector('.logo');
const adminModal = document.getElementById('adminLoginModal');
let pressTimer;

// Function to open the secret modal
function openSecretAdmin() {
    adminModal.style.display = "flex";
    // Optional: Triggers a tiny vibration on mobile devices to confirm the unlock!
    if (navigator.vibrate) navigator.vibrate(50); 
}

// Start Timer on Touch/Click
function startPress(e) {
    // Only listen to left clicks on desktop
    if (e.type === 'mousedown' && e.button !== 0) return; 
    
    pressTimer = window.setTimeout(openSecretAdmin, 3000); // 3000ms = 3 seconds
}

// Cancel Timer if finger/mouse moves or lifts
function cancelPress() {
    clearTimeout(pressTimer);
}

if (navLogo) {
    // Desktop Events
    navLogo.addEventListener('mousedown', startPress);
    navLogo.addEventListener('mouseup', cancelPress);
    navLogo.addEventListener('mouseleave', cancelPress);
    
    // Mobile Touch Events
    navLogo.addEventListener('touchstart', startPress, { passive: true });
    navLogo.addEventListener('touchend', cancelPress);
    navLogo.addEventListener('touchmove', cancelPress, { passive: true });
}

// ==========================================
// SECRET ADMIN AUTHENTICATION LOGIC
// ==========================================
document.getElementById("adminLoginForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const regNo = this.querySelector("input[type='text']").value.trim();
  const password = this.querySelector("input[type='password']").value.trim();
  const loginBtn = this.querySelector("button[type='submit']");

  loginBtn.textContent = "Authenticating...";

  try {
    const response = await fetch('https://success-academy.onrender.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reg_no: regNo, password: password, device_id: getDeviceId() })
    });

    const data = await response.json();

    // Extra security: Only let them through if the DB says they are an admin
    if (data.success && data.user.role === 'admin') {
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      loginBtn.textContent = "Access Granted";
      loginBtn.style.background = "#00ff88"; // Turn button green
      
      setTimeout(() => {
        window.location.href = "Admin.html";
      }, 1000);
    } else {
      alert("❌ Access Denied: Invalid Admin Credentials.");
      loginBtn.textContent = "Access Vault";
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Could not connect to the server.");
    loginBtn.textContent = "Access Vault";
  }
});

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
// DEVICE FINGERPRINT HELPER
// ==========================================
function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = 'dev-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("deviceId", id);
  }
  return id;
}

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
      body: JSON.stringify({ reg_no: regNo, password: password, device_id: getDeviceId() })
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

// ==========================================
// CENTER-FOCUS SHOWCASE CAROUSEL
// ==========================================
const sliderSection = document.querySelector(".image-slider");

if (sliderSection) {
  const slides = sliderSection.querySelectorAll(".slide");
  const dots = sliderSection.querySelectorAll(".dot");
  const prevBtn = sliderSection.querySelector(".prev");
  const nextBtn = sliderSection.querySelector(".next");
  
  if (slides.length > 0) {
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
      // 1. Calculate the Left and Right images in the array
      let prevIndex = (index - 1 + slides.length) % slides.length;
      let nextIndex = (index + 1) % slides.length;

      // 2. Remove all positioning classes from all slides
      slides.forEach(s => {
        s.classList.remove("active", "prev-slide", "next-slide");
      });
      dots.forEach(d => d.classList.remove("active"));
      
      // 3. Assign the new 3D positions
      slides[index].classList.add("active");
      slides[prevIndex].classList.add("prev-slide");
      slides[nextIndex].classList.add("next-slide");
      
      if (dots[index]) dots[index].classList.add("active");
      currentSlide = index;
    }

    function nextSlide() { showSlide((currentSlide + 1) % slides.length); }
    function prevSlide() { showSlide((currentSlide - 1 + slides.length) % slides.length); }

    function startAutoSlide() { slideInterval = setInterval(nextSlide, 4000); }
    function resetAutoSlide() { clearInterval(slideInterval); startAutoSlide(); }

    if (nextBtn) nextBtn.addEventListener("click", () => { nextSlide(); resetAutoSlide(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prevSlide(); resetAutoSlide(); });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => { showSlide(index); resetAutoSlide(); });
    });

    // BONUS: Allow users to click the blurred side images to bring them to the center!
    slides.forEach((slide, index) => {
      slide.addEventListener("click", () => {
        if (slide.classList.contains("prev-slide") || slide.classList.contains("next-slide")) {
          showSlide(index);
          resetAutoSlide();
        }
      });
    });

    // Initialize the first layout
    showSlide(0);
    startAutoSlide();
  }
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
// ==========================================
// GLOWING AMBIENT WAVEFORMS (NO CURSOR EFFECT)
// ==========================================
const canvas = document.getElementById('waveCanvas');

if (canvas) {
  const ctx = canvas.getContext('2d');
  let width, height;
  let time = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Define 6 waves - Brighter opacities, varied speeds and heights
  const waves = [
    { yOffset: 0.45, amplitude: 120, length: 0.0015, speed: 0.012, color: 'rgba(255, 203, 116, 0.7)' }, // Bright Gold
    { yOffset: 0.55, amplitude: 160, length: 0.001,  speed: 0.008, color: 'rgba(26, 100, 219, 0.7)' },  // Bright Blue
    { yOffset: 0.65, amplitude: 100, length: 0.002,  speed: 0.015, color: 'rgba(248, 250, 252, 0.5)' }, // Bright White
    { yOffset: 0.35, amplitude: 90,  length: 0.0025, speed: 0.02,  color: 'rgba(255, 203, 116, 0.4)' }, // Fast Gold
    { yOffset: 0.75, amplitude: 140, length: 0.0012, speed: 0.01,  color: 'rgba(26, 100, 219, 0.4)' },  // Deep Blue
    { yOffset: 0.50, amplitude: 110, length: 0.0018, speed: 0.018, color: 'rgba(248, 250, 252, 0.3)' }  // Fast White
  ];

  function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, width, height);

    waves.forEach(wave => {
      ctx.beginPath();
      
      // Make the lines glow!
      ctx.shadowBlur = 15;
      ctx.shadowColor = wave.color;
      
      // We step by 5 pixels for high performance math calculation
      for (let x = 0; x <= width; x += 5) {
        // Pure, smooth sine wave calculation
        let y = Math.sin(x * wave.length + time * wave.speed) * wave.amplitude + height * wave.yOffset;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 2.5; // Thicker, more visible lines
      ctx.stroke();
    });
    
    time++;
  }
  
  animate();
}

// ==========================================
// CINEMATIC THEATER MODE LOGIC
// ==========================================
const infraLayout = document.querySelector('.infra-layout');

if (infraLayout) {
  // 1. Dynamically create the dark overlay so you don't have to edit your HTML
  const overlay = document.createElement('div');
  overlay.classList.add('theater-overlay');
  document.body.appendChild(overlay);

  // 2. Turn OFF the lights when mouse enters the video or tags area
  infraLayout.addEventListener('mouseenter', () => {
    document.body.classList.add('theater-active');
  });
  
  // 3. Turn ON the lights when mouse leaves the area
  infraLayout.addEventListener('mouseleave', () => {
    document.body.classList.remove('theater-active');
  });

  // Keep the pulsing video effect from Option 4 when hovering specific tags
  const infraTags = document.querySelectorAll('.infra-tag');
  const videoWrapper = document.querySelector('.infra-video-wrapper');
  
  infraTags.forEach(tag => {
    tag.addEventListener('mouseenter', () => videoWrapper.classList.add('pulse-active'));
    tag.addEventListener('mouseleave', () => videoWrapper.classList.remove('pulse-active'));
  });
}

// ==========================================
// 3D COVER FLOW LOGIC
// ==========================================
const cfWrapper = document.querySelector('.coverflow-wrapper');

if (cfWrapper) {
  const cards = cfWrapper.querySelectorAll('.testimonial-card');
  let currentIndex = 0;

  function updateCoverflow() {
    cards.forEach((card, i) => {
      card.classList.remove('cf-active', 'cf-left', 'cf-right', 'cf-hidden');

      if (i === currentIndex) {
        card.classList.add('cf-active');
      } else if (i < currentIndex) {
        // Swing to the left
        card.classList.add(i === currentIndex - 1 ? 'cf-left' : 'cf-hidden');
      } else if (i > currentIndex) {
        // Swing to the right
        card.classList.add(i === currentIndex + 1 ? 'cf-right' : 'cf-hidden');
      }
    });
  }

  document.getElementById('cfNext')?.addEventListener('click', () => {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      updateCoverflow();
    }
  });

  document.getElementById('cfPrev')?.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCoverflow();
    }
  });

  // Clicking a side card also brings it to the center
  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      currentIndex = index;
      updateCoverflow();
    });
  });

  updateCoverflow(); // Initial call
}

// ==========================================
// BACKGROUND FLOATING SCIENCE SYMBOLS
// ==========================================
function spawnScienceSymbol() {
  const symbols = [
    { char: '⚛', color: '#00F0FF', type: 'text' }, // Physics - Cyan
    { char: '∑', color: '#FFCB74', type: 'text' }, // Math - Gold
    { char: '⌬', color: '#ff4d4d', type: 'text' }, // Chemistry - Red
    { char: '🧬', color: '#00FF66', type: 'emoji' } // Biology - Green
  ];

  const symbolData = symbols[Math.floor(Math.random() * symbols.length)];
  const el = document.createElement('div');
  el.classList.add('science-symbol');
  
  if (symbolData.type === 'emoji') {
    el.classList.add('emoji');
  } else {
    // SINGLE GLOW: Changed back to a single, softer shadow instead of the double blinding one
    el.style.color = symbolData.color;
    el.style.textShadow = `0 0 12px ${symbolData.color}`;
  }
  
  el.innerText = symbolData.char;
  
  // FULL SCREEN SPREAD: Removed margins so they spawn edge-to-edge horizontally and vertically
  const startX = Math.random() * window.innerWidth;
  const startY = Math.random() * window.innerHeight;
  
  el.style.left = `${startX}px`;
  el.style.top = `${startY}px`;
  
  // Randomize the size to be slightly larger (between 35px and 85px)
  const size = Math.random() * 50 + 35; 
  el.style.fontSize = `${size}px`;

  document.body.appendChild(el);

  // Remove the element after 8 seconds (matching the new CSS animation time)
  setTimeout(() => {
    el.remove();
  }, 8000);
}

// Spawn much faster! (Every 800ms instead of 1500ms to fill the screen)
setInterval(spawnScienceSymbol, 800);

// Spawn a massive burst of 12 symbols immediately so the screen is full the second it loads
for(let i=0; i<12; i++) {
  setTimeout(spawnScienceSymbol, i * 150);
}

// ==========================================
// SOCIAL BUTTON CLICK ANIMATION DELAY
// ==========================================
const socialButtons = document.querySelectorAll('.social-btn');

socialButtons.forEach(btn => {
  btn.addEventListener('click', function(e) {
    // 1. Stop the browser from immediately opening the link
    e.preventDefault(); 
    
    // 2. Get the URL and target (_blank) from the HTML
    const url = this.getAttribute('href');
    const target = this.getAttribute('target') || '_self';
    
    // 3. Wait exactly 500ms for your 3D CSS animation to finish playing
    setTimeout(() => {
      if (target === '_blank') {
        window.open(url, '_blank'); // Opens in a new tab/app
      } else {
        window.location.href = url; // Opens in the same tab
      }
    }, 500); 
  });
});