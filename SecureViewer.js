// 1. Get material ID from URL (e.g., SecureViewer.html?id=1)
const urlParams = new URLSearchParams(window.location.search);
const materialId = urlParams.get('id');
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

window.onload = async () => {
    if (!currentUser || !materialId) {
        document.getElementById('docTitle').innerText = "Access Denied.";
        return;
    }

    applyWatermark();
    applySecurityListeners();
    await fetchAndRenderPDF();
};

// ==========================================
// RENDER PDF AS CANVAS
// ==========================================
async function fetchAndRenderPDF() {
    try {
        // Fetch the raw stream via POST
        const response = await fetch('https://success-academy.onrender.com/api/secure-view-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ material_id: materialId, student_id: currentUser.id })
        });

        if (!response.ok) throw new Error("Failed to load document");

        // Convert stream to an ArrayBuffer for PDF.js
        const arrayBuffer = await response.arrayBuffer();
        
        // Load the document using PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        document.getElementById('docTitle').innerText = `Secure Document View (${pdf.numPages} Pages)`;
        const container = document.getElementById('pdf-container');

        // Render every page as a separate canvas
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5; // Adjust resolution
            const viewport = page.getViewport({ scale: scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = { canvasContext: context, viewport: viewport };
            await page.render(renderContext).promise;
            
            container.appendChild(canvas);
        }
    } catch (error) {
        console.error("PDF Rendering Error:", error);
        document.getElementById('docTitle').innerText = "Error loading document. Please try again.";
    }
}

// ==========================================
// DYNAMIC WATERMARKING
// ==========================================
function applyWatermark() {
    const container = document.getElementById('watermarkContainer');
    const watermarkString = `${currentUser.reg_no} | ${currentUser.name} | Success Academy`;
    
    // Create a dense grid of watermarks
    for (let i = 0; i < 40; i++) {
        const span = document.createElement('span');
        span.className = 'watermark-text';
        span.innerText = watermarkString;
        container.appendChild(span);
    }
}

// ==========================================
// ANTI-CHEAT SECURITY LISTENERS
// ==========================================
function applySecurityListeners() {
    // Disable Right Click
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Disable Dragging the Canvas
    document.addEventListener('dragstart', event => event.preventDefault());

    // Block specific keyboard shortcuts (F12, Print, Save, Copy)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'F12') {
            event.preventDefault();
            alert("Developer tools are prohibited.");
        }
        if (event.ctrlKey && ['p', 's', 'c', 'v', 'u', 'i'].includes(event.key.toLowerCase())) {
            event.preventDefault();
            alert("Action prohibited in secure view.");
        }
    });
}