// ============================================
// FileForge — Frontend Application
// ============================================

let currentTool = null;
let selectedFile = null;

const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const modalIcon = document.getElementById('modal-icon');
const uploadArea = document.getElementById('upload-area');
const uploadZone = document.getElementById('upload-zone');
const uploadHint = document.getElementById('upload-hint');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const convertBtnText = document.getElementById('convert-btn-text');
const progressArea = document.getElementById('progress-area');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const successArea = document.getElementById('success-area');
const successMessage = document.getElementById('success-message');
const errorArea = document.getElementById('error-area');
const errorMessage = document.getElementById('error-message');
const scrollIndicator = document.querySelector('.hero-scroll-indicator');

const toolConfig = {
  'word-to-pdf': {
    title: 'Word to PDF',
    subtitle: 'Konversi dokumen Word menjadi file PDF',
    iconColor: 'green',
    accept: '.docx,.doc',
    hint: 'Format: .docx atau .doc (Maks 50MB)',
    btnText: 'Konversi ke PDF',
    progressText: 'Mengkonversi ke PDF...',
    successText: 'File PDF berhasil dibuat dan didownload!',
    endpoint: '/api/word-to-pdf',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>`
  },
  'pdf-to-word': {
    title: 'PDF to Word',
    subtitle: 'Ubah file PDF menjadi dokumen Word yang bisa diedit',
    iconColor: 'orange',
    accept: '.pdf',
    hint: 'Format: .pdf (Maks 50MB)',
    btnText: 'Konversi ke Word',
    progressText: 'Mengkonversi ke Word...',
    successText: 'File Word berhasil dibuat dan didownload!',
    endpoint: '/api/pdf-to-word',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.342a2 2 0 0 0-.602-1.43l-4.44-4.342A2 2 0 0 0 13.56 2H6a2 2 0 0 0-2 2z"/>
      <path d="M9 13h6"/>
      <path d="M9 17h3"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    </svg>`
  },
  'compress': {
    title: 'Kompresi File',
    subtitle: 'Perkecil ukuran file secara optimal',
    iconColor: 'mixed',
    accept: '*',
    hint: 'Format: semua jenis file (Maks 50MB)',
    btnText: 'Kompresi Sekarang',
    progressText: 'Mengkompresi file...',
    successText: 'File berhasil dikompresi dan didownload!',
    endpoint: '/api/compress',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`
  }
};

// ============================================
// NAVBAR & SCROLL INDICATOR
// ============================================
window.addEventListener('scroll', () => {
  // Efek blur/warna navbar tetap responsif di 50px
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // Toleransi scroll untuk ikon di HP agar tidak langsung hilang (diubah ke 150px)
  if (window.scrollY > 150) {
    if (scrollIndicator) {
      scrollIndicator.style.opacity = '0';
      scrollIndicator.style.visibility = 'hidden';
    }
  } else {
    if (scrollIndicator) {
      scrollIndicator.style.opacity = '1';
      scrollIndicator.style.visibility = 'visible';
    }
  }
});

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('active');
  });
});

// ============================================
// STAT COUNTER ANIMATION (DENGAN SENSOR LAYAR)
// ============================================
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  counters.forEach(counter => {
    counter.innerText = '0';
    const target = parseInt(counter.getAttribute('data-count'));
    const duration = 1500; // 1.5 Detik (Cepat, tapi tetap terlihat prosesnya)
    let startTime = null;

    function update(currentTime) {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3); // Efek melambat di akhir
      counter.textContent = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        counter.textContent = target; 
      }
    }
    requestAnimationFrame(update);
  });
}

// Sensor untuk mendeteksi kapan area angka masuk ke dalam layar
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters(); // Jalankan animasi
      statsObserver.disconnect(); // Matikan sensor agar tidak berulang-ulang
    }
  });
}, { threshold: 0.3 }); // 30% area angka terlihat, animasi langsung mulai

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
  statsObserver.observe(heroStats);
}

// ============================================
// SCROLL ANIMATIONS (KARTU FITUR)
// ============================================
const animateOnScroll = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.feature-card, .step-card, .tool-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  animateOnScroll.observe(el);
});

document.querySelectorAll('.feature-card').forEach((el, i) => {
  el.style.transitionDelay = `${i * 100}ms`;
});

document.querySelectorAll('.step-card').forEach((el, i) => {
  el.style.transitionDelay = `${i * 150}ms`;
});

document.querySelectorAll('.tool-card').forEach((el, i) => {
  el.style.transitionDelay = `${i * 120}ms`;
});

const style = document.createElement('style');
style.textContent = `.animate-in { opacity: 1 !important; transform: translateY(0) !important; }`;
document.head.appendChild(style);

// ============================================
// TOOL MODAL & FORM PROCESSING
// ============================================
function openTool(toolName) {
  currentTool = toolName;
  const config = toolConfig[toolName];

  if (!config) return;

  modalTitle.textContent = config.title;
  modalSubtitle.textContent = config.subtitle;
  modalIcon.className = 'modal-icon ' + config.iconColor;
  modalIcon.innerHTML = config.icon;
  uploadHint.textContent = config.hint;
  convertBtnText.textContent = config.btnText;

  if (config.accept === '*') {
    fileInput.removeAttribute('accept');
  } else {
    fileInput.setAttribute('accept', config.accept);
  }

  const qualityControl = document.getElementById('quality-control');
  if (qualityControl) {
    if (toolName === 'compress') {
      qualityControl.classList.remove('hidden');
    } else {
      qualityControl.classList.add('hidden');
    }
  }

  resetToolState();

  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTool() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
  currentTool = null;
  selectedFile = null;
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeTool();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeTool();
});

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  const config = toolConfig[currentTool];

  if (file.size > 50 * 1024 * 1024) {
    showError('File terlalu besar! Maksimum ukuran file adalah 50MB.');
    return;
  }

  if (config.accept !== '*') {
    const allowedExts = config.accept.split(',').map(ext => ext.trim().toLowerCase());
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      showError(`Format file tidak didukung! Gunakan format: ${config.accept}`);
      return;
    }
  }

  selectedFile = file;

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  uploadArea.classList.add('hidden');
  filePreview.classList.remove('hidden');
}

function removeFile() {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  uploadArea.classList.remove('hidden');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function processFile() {
  if (!selectedFile || !currentTool) return;

  const config = toolConfig[currentTool];

  filePreview.classList.add('hidden');
  progressArea.classList.remove('hidden');
  progressText.textContent = config.progressText;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);

    if (currentTool === 'compress') {
      const qualitySlider = document.getElementById('quality-slider');
      if (qualitySlider) {
        formData.append('quality', qualitySlider.value);
      }
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Gagal memproses file');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let downloadFileName = 'output';

    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) downloadFileName = match[1].replace(/['"]/g, '');
    } else {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      if (currentTool === 'word-to-pdf') downloadFileName = baseName + '.pdf';
      else if (currentTool === 'pdf-to-word') downloadFileName = baseName + '.docx';
      else downloadFileName = baseName + '_compressed.zip';
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    progressArea.classList.add('hidden');
    successMessage.textContent = config.successText;
    successArea.classList.remove('hidden');

    if (currentTool === 'compress') {
      const origSize = response.headers.get('X-Original-Size');
      const compSize = response.headers.get('X-Compressed-Size');
      const savedPct = response.headers.get('X-Saved-Percent');

      if (origSize && compSize) {
        const compressResult = document.getElementById('compress-result');
        if (compressResult) {
          compressResult.classList.remove('hidden');
          document.getElementById('original-size-display').textContent = formatFileSize(Number(origSize));
          document.getElementById('compressed-size-display').textContent = formatFileSize(Number(compSize));
          document.getElementById('saved-percent-display').textContent = `${savedPct}%`;
        }
      }
    }

  } catch (error) {
    console.error('Processing error:', error);
    progressArea.classList.add('hidden');
    showError(error.message || 'Terjadi kesalahan saat memproses file.');
  }
}

function showError(message) {
  uploadArea.classList.add('hidden');
  filePreview.classList.add('hidden');
  progressArea.classList.add('hidden');
  successArea.classList.add('hidden');
  errorMessage.textContent = message;
  errorArea.classList.remove('hidden');
}

function resetTool() {
  resetToolState();
}

function resetToolState() {
  selectedFile = null;
  fileInput.value = '';

  uploadArea.classList.remove('hidden');
  filePreview.classList.add('hidden');
  progressArea.classList.add('hidden');
  successArea.classList.add('hidden');
  errorArea.classList.add('hidden');

  const compressResult = document.getElementById('compress-result');
  if (compressResult) compressResult.classList.add('hidden');

  if (progressBar) progressBar.style.width = '0%';
}

const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
if (qualitySlider && qualityValue) {
  qualitySlider.addEventListener('input', (e) => {
    const val = e.target.value;
    let label = 'Sedang';
    if (val <= 30) label = 'Tinggi';
    else if (val >= 70) label = 'Rendah';
    qualityValue.textContent = `${label} · Kualitas ${val}%`;
  });
}

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;

    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = target.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// ============================================
// PARALLAX EFFECT FOR HERO SHAPES
// ============================================
window.addEventListener('mousemove', (e) => {
  const shapes = document.querySelectorAll('.shape');
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;

  shapes.forEach((shape, i) => {
    const speed = (i + 1) * 8;
    shape.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
  });
});

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease';

  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});