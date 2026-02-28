// ================= SAFE PAGE LOADER =================
window.addEventListener("load", function () {
  const loader = document.querySelector(".loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
    }, 500);
  }
});

// ================= HAMBURGER MENU =================
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const overlay = document.getElementById("menuOverlay");

hamburger.addEventListener("click", function(){
  hamburger.classList.toggle("active");
  navLinks.classList.toggle("active");
  overlay.classList.toggle("active");
});

overlay.addEventListener("click", function(){
  hamburger.classList.remove("active");
  navLinks.classList.remove("active");
  overlay.classList.remove("active");
});

function confirmLogout(){
  if(confirm("Are you sure you want to logout?")){
    window.location.href = "Homepage.html";
  }
}

// ================= AI SHUTTER LOGIC =================
const sendBtn = document.getElementById('sendBtn');
const doubtInput = document.getElementById('doubtInput');
const resultArea = document.getElementById('resultArea');
const aiLoader = document.getElementById('aiLoader');
const shutterContainer = document.getElementById('shutterContainer');

sendBtn.addEventListener('click', async () => {

  if (doubtInput.value.trim() === "") {
    alert("Please type your doubt before sending!");
    return;
  }

  // --- UPDATED: Changes text to "Building The Ans..." ---
  sendBtn.disabled = true;
  sendBtn.innerText = "Building The Ans 🏗️..."; 
  sendBtn.style.opacity = "0.7";

  resultArea.classList.remove('hidden');
  aiLoader.style.display = 'flex';
  shutterContainer.style.display = 'none';
  shutterContainer.classList.remove('open');

  try {

    const response = await fetch("const API_BASE_URL = 'https://success-academy.onrender.com/api/ai-doubt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: doubtInput.value
      })
    });

    const data = await response.json();

    aiLoader.style.display = 'none';
    shutterContainer.style.display = 'block';

    const resultContent = document.querySelector(".result-content");

    if (data.success) {
      // Use marked.parse() to flawlessly convert Markdown to HTML
      resultContent.innerHTML = `
        <div class="answer-box">${marked.parse(data.answer)}</div>
      `;
    }
    else {
      resultContent.innerHTML = `
        <h2>⚠️ Not Allowed</h2>
        <p>${data.message}</p>
      `;
    }

    setTimeout(() => {
      shutterContainer.classList.add('open');
    }, 50);

  } catch (error) {
    console.error(error);
    alert("Server error while processing AI request.");
  }

  // --- UPDATED: Reverts button back after the answer is generated ---
  sendBtn.disabled = false;
  sendBtn.innerText = "Send Doubt";
  sendBtn.style.opacity = "1";
});
// ================= BULB CLICK LOGIC =================
const shopBulb = document.getElementById("shopBulb");
const shopInterior = document.getElementById("shopInterior");

if (shopBulb) {
  shopBulb.addEventListener("click", function() {
    shopBulb.classList.toggle("bulb-on");
    shopInterior.classList.toggle("light-on");
  });
}
