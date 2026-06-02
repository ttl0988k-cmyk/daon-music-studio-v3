// AceStep 1.5 XL Studio JS Logic
let API_URL = "";
let activeTaskId = null;
let statusInterval = null;
let timerInterval = null;
let timerSeconds = 0;

// DOM Elements
const apiUrlInput = document.getElementById("api-url-input");
const connectBtn = document.getElementById("connect-btn");
const connectionBadge = document.getElementById("connection-badge");
const serverStats = document.getElementById("server-stats");
const vramVal = document.getElementById("vram-val");
const ramVal = document.getElementById("ram-val");
const modelVal = document.getElementById("model-val");
const generateBtn = document.getElementById("generate-btn");

const audioTaskSelect = document.getElementById("audio_task");
const refAudioPanel = document.getElementById("ref-audio-panel");
const sourceAudioGroup = document.getElementById("source-audio-group");
const timbreAudioGroup = document.getElementById("timbre-audio-group");

const durationInput = document.getElementById("duration");
const durationVal = document.getElementById("duration-val");
const numTracksInput = document.getElementById("num_tracks");
const tracksVal = document.getElementById("tracks-val");

const accordion = document.querySelector(".accordion");
const accordionTrigger = document.querySelector(".accordion-trigger");

// File uploads
const sourceDropZone = document.getElementById("source-drop-zone");
const sourceFileInput = document.getElementById("audio_ref");
const sourcePreview = document.getElementById("source-preview");
const sourceFileName = document.getElementById("source-file-name");
const sourceAudioPlayer = document.getElementById("source-audio-player");
const removeSourceBtn = document.getElementById("remove-source-btn");

const timbreDropZone = document.getElementById("timbre-drop-zone");
const timbreFileInput = document.getElementById("audio_ref_timbre");
const timbrePreview = document.getElementById("timbre-preview");
const timbreFileName = document.getElementById("timbre-file-name");
const timbreAudioPlayer = document.getElementById("timbre-audio-player");
const removeTimbreBtn = document.getElementById("remove-timbre-btn");

// Progress Panel
const progressPanel = document.getElementById("progress-panel");
const generationTimer = document.getElementById("generation-timer");
const progressPercentLabel = document.getElementById("progress-percent-label");
const statusDescText = document.getElementById("status-desc-text");
const progressTrackIndicator = document.getElementById("progress-track-indicator");
const progressBarFill = document.getElementById("progress-bar-fill");
const cancelBtn = document.getElementById("cancel-btn");

// Results
const emptyResults = document.getElementById("empty-results");
const tracksList = document.getElementById("tracks-list");
const clearAllBtn = document.getElementById("clear-all-btn");
const generatorForm = document.getElementById("generator-form");

// 1. Initialize API URL from localStorage
window.addEventListener("DOMContentLoaded", () => {
  const savedUrl = localStorage.getItem("acestep_api_url") || "https://landing-automated-precision.ngrok-free.dev";
  apiUrlInput.value = savedUrl;
  // Auto check server status
  checkConnection(savedUrl);
});

// 2. Connect Server Button
connectBtn.addEventListener("click", () => {
  let url = apiUrlInput.value.trim();
  if (!url) return alert("API Server URL을 입력해주세요!");
  // Remove trailing slash if present
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  checkConnection(url);
});

async function checkConnection(url) {
  connectionBadge.className = "badge badge-orange";
  connectionBadge.textContent = "연결 중...";
  serverStats.classList.add("hidden");
  generateBtn.disabled = true;

  try {
    const res = await fetch(`${url}/health`, {
      method: "GET",
      mode: "cors",
      headers: {
        "ngrok-skip-browser-warning": "69420"
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      API_URL = url;
      localStorage.setItem("acestep_api_url", url);
      
      connectionBadge.className = "badge badge-green";
      connectionBadge.textContent = "연결됨";
      
      vramVal.textContent = data.vram_free_gb !== undefined ? `${data.vram_free_gb} GB` : "N/A";
      ramVal.textContent = data.ram_free_gb !== undefined ? `${data.ram_free_gb} GB` : "N/A";
      modelVal.textContent = data.model || "다온 음악 생성 스튜디오";
      
      serverStats.classList.remove("hidden");
      generateBtn.disabled = false;
    } else {
      throw new Error(`Server returned status ${res.status}`);
    }
  } catch (err) {
    console.error("Connection error:", err);
    connectionBadge.className = "badge badge-red";
    connectionBadge.textContent = "연결 실패";
    generateBtn.disabled = true;
  }
}

// 3. Audio Task toggling reference panels
audioTaskSelect.addEventListener("change", updateAudioTaskLayout);

function updateAudioTaskLayout() {
  const task = audioTaskSelect.value;
  if (task === "Text (Lyrics) ➔ Audio") {
    refAudioPanel.classList.add("hidden");
    sourceAudioGroup.classList.add("hidden");
    timbreAudioGroup.classList.add("hidden");
  } else if (task === "Cover Mode of Source Audio") {
    refAudioPanel.classList.remove("hidden");
    sourceAudioGroup.classList.remove("hidden");
    timbreAudioGroup.classList.add("hidden");
  } else if (task === "Transfer Reference Audio Timbre") {
    refAudioPanel.classList.remove("hidden");
    sourceAudioGroup.classList.add("hidden");
    timbreAudioGroup.classList.remove("hidden");
  } else if (task === "Cover + Transfer Timbre") {
    refAudioPanel.classList.remove("hidden");
    sourceAudioGroup.classList.remove("hidden");
    timbreAudioGroup.classList.remove("hidden");
  }
}

// 4. Accordion Toggle
accordionTrigger.addEventListener("click", () => {
  accordion.classList.toggle("active");
});

// 5. Update slider labels
durationInput.addEventListener("input", (e) => {
  durationVal.textContent = e.target.value;
});
numTracksInput.addEventListener("input", (e) => {
  tracksVal.textContent = e.target.value;
});

// 6. Drag and drop file uploads helper
function setupDragAndDrop(dropZone, fileInput, previewContainer, fileNameLabel, audioPlayer, removeBtn) {
  dropZone.addEventListener("click", () => fileInput.click());
  
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelected(fileInput.files[0], dropZone, previewContainer, fileNameLabel, audioPlayer);
    }
  });
  
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      handleFileSelected(fileInput.files[0], dropZone, previewContainer, fileNameLabel, audioPlayer);
    }
  });
  
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.value = "";
    previewContainer.classList.add("hidden");
    dropZone.classList.remove("hidden");
    audioPlayer.src = "";
  });
}

function handleFileSelected(file, dropZone, previewContainer, fileNameLabel, audioPlayer) {
  fileNameLabel.textContent = file.name;
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  dropZone.classList.add("hidden");
  previewContainer.classList.remove("hidden");
}

setupDragAndDrop(sourceDropZone, sourceFileInput, sourcePreview, sourceFileName, sourceAudioPlayer, removeSourceBtn);
setupDragAndDrop(timbreDropZone, timbreFileInput, timbrePreview, timbreFileName, timbreAudioPlayer, removeTimbreBtn);

// 7. Form Submission
generatorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!API_URL) return alert("서버가 연결되어 있지 않습니다. 먼저 연결을 확인하세요.");

  // Build FormData
  const formData = new FormData();
  
  // Normal inputs
  formData.append("lyrics", document.getElementById("lyrics").value);
  
  let captionText = document.getElementById("caption").value.trim();
  const vocalGender = document.getElementById("vocal_gender").value;
  if (vocalGender === "female" && !captionText.toLowerCase().includes("female vocal")) {
    captionText = "female vocal, " + captionText;
  } else if (vocalGender === "male" && !captionText.toLowerCase().includes("male vocal")) {
    captionText = "male vocal, " + captionText;
  } else if (vocalGender === "choir" && !captionText.toLowerCase().includes("choir")) {
    captionText = "choir, chorus, " + captionText;
  } else if (vocalGender === "none" && !captionText.toLowerCase().includes("instrumental")) {
    captionText = "instrumental, " + captionText;
  }
  formData.append("caption", captionText);
  
  formData.append("duration", parseInt(durationInput.value));
  formData.append("num_tracks", parseInt(numTracksInput.value));
  
  formData.append("bpm", document.getElementById("bpm").value);
  formData.append("keyscale", document.getElementById("keyscale").value);
  formData.append("timesignature", document.getElementById("timesignature").value);
  formData.append("language", document.getElementById("language").value);
  
  // Advanced Settings
  formData.append("seed", parseInt(document.getElementById("seed").value));
  formData.append("num_steps", parseInt(document.getElementById("num_steps").value));
  formData.append("guidance_scale", parseFloat(document.getElementById("guidance_scale").value));
  formData.append("temperature", parseFloat(document.getElementById("temperature").value));
  formData.append("audio_scale", parseFloat(document.getElementById("audio_scale").value));
  formData.append("shift", parseFloat(document.getElementById("shift").value));
  
  const inferMethodVal = document.querySelector('input[name="infer_method"]:checked').value;
  formData.append("infer_method", inferMethodVal);
  formData.append("negative_prompt", document.getElementById("negative_prompt").value);
  formData.append("audio_task", audioTaskSelect.value);

  // File inputs
  const task = audioTaskSelect.value;
  if ((task.includes("Cover") || task.includes("Timbre")) && sourceFileInput.files.length > 0) {
    formData.append("audio_ref", sourceFileInput.files[0]);
  }
  if ((task.includes("Timbre")) && timbreFileInput.files.length > 0) {
    formData.append("audio_ref_timbre", timbreFileInput.files[0]);
  }

  // Lock UI
  generateBtn.disabled = true;
  generateBtn.querySelector("span").textContent = "음악 생성 진행 중...";
  
  try {
    const res = await fetch(`${API_URL}/generate`, {
      method: "POST",
      body: formData,
      mode: "cors",
      headers: {
        "ngrok-skip-browser-warning": "69420"
      }
    });
    
    if (!res.ok) {
      throw new Error(`Generation API request failed with status ${res.status}`);
    }
    
    const data = await res.json();
    if (data.task_id) {
      startProgressTracking(data.task_id);
    } else {
      throw new Error("No task_id returned from API.");
    }
    
  } catch (err) {
    alert(`음악 생성 중 에러가 발생했습니다: ${err.message}`);
    unlockUI();
  }
});

// 8. Progress Tracking
function startProgressTracking(taskId) {
  activeTaskId = taskId;
  progressPanel.classList.remove("hidden");
  
  // Reset progress labels
  progressPercentLabel.textContent = "0%";
  progressBarFill.style.width = "0%";
  statusDescText.textContent = "서버 대기열 대기 중...";
  progressTrackIndicator.textContent = "";
  
  // Start Timer
  timerSeconds = 0;
  generationTimer.textContent = "00:00";
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
    const secs = String(timerSeconds % 60).padStart(2, "0");
    generationTimer.textContent = `${mins}:${secs}`;
  }, 1000);
  
  // Start Polling status
  clearInterval(statusInterval);
  statusInterval = setInterval(() => pollTaskStatus(taskId), 1500);
}

async function pollTaskStatus(taskId) {
  try {
    const res = await fetch(`${API_URL}/status/${taskId}`, {
      method: "GET",
      mode: "cors",
      headers: {
        "ngrok-skip-browser-warning": "69420"
      }
    });
    
    if (!res.ok) return;
    
    const data = await res.json();
    
    // Update progress bar & label
    const progress = data.progress || 0;
    progressPercentLabel.textContent = `${progress}%`;
    progressBarFill.style.width = `${progress}%`;
    
    // Update description text
    statusDescText.textContent = data.desc || "Generating...";
    
    if (data.status === "completed") {
      finishGeneration(data);
    } else if (data.status === "error") {
      alert(`생성 실패: ${data.error || "알 수 없는 에러"}`);
      stopProgressTracking();
      unlockUI();
    }
    
  } catch (err) {
    console.error("Failed to poll status:", err);
  }
}

function stopProgressTracking() {
  clearInterval(statusInterval);
  clearInterval(timerInterval);
  progressPanel.classList.add("hidden");
  activeTaskId = null;
}

function unlockUI() {
  generateBtn.disabled = false;
  generateBtn.querySelector("span").textContent = "AI 음악 생성 시작";
}

// Cancel generation button handler
cancelBtn.addEventListener("click", () => {
  if (confirm("정말 음악 생성을 중단하시겠습니까?")) {
    stopProgressTracking();
    unlockUI();
  }
});

// 9. Finish generation & render tracks
function finishGeneration(taskData) {
  stopProgressTracking();
  unlockUI();
  
  // Append new tracks to the list (top of the list)
  const results = taskData.results || [];
  
  results.forEach(track => {
    const downloadUrl = `${API_URL}/result/${taskData.task_id}/${track.track_num}`;
    const trackCard = createTrackCard(track.track_num, track.seed, downloadUrl);
    tracksList.insertBefore(trackCard, tracksList.firstChild);
  });

  updateClearAllButtonVisibility();
}

function updateClearAllButtonVisibility() {
  const hasTracks = tracksList.querySelectorAll(".track-item").length > 0;
  if (hasTracks) {
    if (clearAllBtn) clearAllBtn.classList.remove("hidden");
    emptyResults.classList.add("hidden");
    tracksList.classList.remove("hidden");
  } else {
    if (clearAllBtn) clearAllBtn.classList.add("hidden");
    emptyResults.classList.remove("hidden");
    tracksList.classList.add("hidden");
  }
}

// 10. Custom Audio Player Card Generation
function createTrackCard(trackNum, seed, downloadUrl) {
  const card = document.createElement("div");
  card.className = "track-item animate-fade-in";
  
  // Capture current album cover and lyrics state at creation time
  const coverResultImg = document.getElementById("cover-result-img");
  const lyricsTextarea = document.getElementById("lyrics");
  const coverUrl = (coverResultImg && !coverResultImg.classList.contains("hidden")) ? coverResultImg.src : null;
  const lyricsText = lyricsTextarea ? lyricsTextarea.value.trim() : "";

  // Header HTML
  const header = document.createElement("div");
  header.className = "track-info-header";
  header.innerHTML = `
    <span class="track-title">🎵 생성된 트랙 ${trackNum}</span>
    <span class="track-seed-tag" title="클릭하여 시드 복사">시드: ${seed}</span>
  `;
  
  // Seed copy listener
  header.querySelector(".track-seed-tag").addEventListener("click", () => {
    navigator.clipboard.writeText(seed);
    alert(`시드 번호(${seed})가 복사되었습니다!`);
  });

  // Main Card Body Container (Stunning 2-column grid layout!)
  const cardBody = document.createElement("div");
  cardBody.className = "track-card-body";
  cardBody.style.display = "grid";
  cardBody.style.gridTemplateColumns = "120px 1fr";
  cardBody.style.gap = "16px";
  cardBody.style.alignItems = "start";
  cardBody.style.marginTop = "8px";

  // Left Column: Cover Image / Vinyl Placeholder
  const coverCol = document.createElement("div");
  coverCol.className = "track-cover-column";
  if (coverUrl) {
    coverCol.innerHTML = `
      <img class="track-card-cover" src="${coverUrl}" alt="Jacket Cover" style="width: 120px; height: 120px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.4); flex-shrink: 0; transition: var(--transition-smooth); cursor: pointer;">
    `;
    const img = coverCol.querySelector("img");
    img.addEventListener("mouseenter", () => img.style.transform = "scale(1.05) rotate(1deg)");
    img.addEventListener("mouseleave", () => img.style.transform = "");
  } else {
    coverCol.innerHTML = `
      <div class="track-card-cover-placeholder" style="width: 120px; height: 120px; border-radius: 12px; background: linear-gradient(135deg, #1e130c 0%, #07040e 100%); border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.4); flex-shrink: 0;">
        <svg width="40" height="40" viewBox="0 0 24 24" style="color: #f6c754; opacity: 0.65;"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z"/></svg>
      </div>
    `;
  }

  // Right Column: Player & Actions
  const contentCol = document.createElement("div");
  contentCol.className = "track-content-column";
  contentCol.style.display = "flex";
  contentCol.style.flexDirection = "column";
  contentCol.style.gap = "12px";
  
  // Custom Player HTML structure
  const player = document.createElement("div");
  player.className = "custom-audio-player";
  player.style.marginBottom = "0"; // Reset margin to align nicely
  player.innerHTML = `
    <button class="play-pause-btn" aria-label="Play">
      <svg class="play-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>
      <svg class="pause-icon hidden" viewBox="0 0 24 24"><path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z"/></svg>
    </button>
    <div class="player-seekbar-wrapper">
      <input type="range" class="player-seekbar" min="0" max="100" value="0">
      <div class="player-time-row">
        <span class="curr-time">0:00</span>
        <span class="tot-time">0:00</span>
      </div>
    </div>
    <div class="player-volume-wrapper">
      <svg class="volume-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>
      <input type="range" class="volume-slider" min="0" max="100" value="80">
    </div>
  `;
  
  // Action Buttons (Including lyrics viewing button)
  const actions = document.createElement("div");
  actions.className = "track-actions";
  actions.innerHTML = `
    <button class="btn-action-lyrics">🎤 가사 보기</button>
    <button class="btn-action-download">
      <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
      다운로드
    </button>
    <button class="btn-action-copy">주소 복사</button>
    <button class="btn-action-delete">삭제 🗑️</button>
  `;

  contentCol.appendChild(player);
  contentCol.appendChild(actions);

  cardBody.appendChild(coverCol);
  cardBody.appendChild(contentCol);
  
  // Parsing lyrics into list of lines
  const rawLines = lyricsText.split("\n").map(line => line.trim());
  const lines = rawLines.filter(line => line.length > 0);

  // Setup Lyrics Panel
  const lyricsPanel = document.createElement("div");
  lyricsPanel.className = "track-lyrics-panel hidden";

  const blurBg = document.createElement("div");
  blurBg.className = "lyrics-blur-bg";
  if (coverUrl) {
    blurBg.style.backgroundImage = `url('${coverUrl}')`;
  } else {
    blurBg.style.background = "linear-gradient(135deg, #1e130c 0%, #07040e 100%)";
  }
  lyricsPanel.appendChild(blurBg);

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "lyrics-scroll-container";

  lines.forEach((lineText, idx) => {
    const lineEl = document.createElement("div");
    lineEl.className = "lyric-line";
    if (idx === 0) lineEl.className = "lyric-line active";
    lineEl.textContent = lineText;
    scrollContainer.appendChild(lineEl);
  });

  lyricsPanel.appendChild(scrollContainer);

  // Create Lyrics Sync Control Panel
  const syncControls = document.createElement("div");
  syncControls.className = "lyrics-sync-controls";
  
  syncControls.innerHTML = `
    <div class="lyrics-sync-header">
      <span>⏱️ 실시간 가사 싱크 미세조정</span>
      <button class="lyrics-sync-btn-reset">싱크 초기화</button>
    </div>
    <div class="lyrics-sync-rows">
      <div class="lyrics-sync-row">
        <span class="lyrics-sync-label">🎸 전주 대기시간</span>
        <input type="range" class="lyrics-sync-slider slider-intro" min="0" max="30" step="0.5" value="6">
        <span class="lyrics-sync-value val-intro">6.0초</span>
      </div>
      <div class="lyrics-sync-row">
        <span class="lyrics-sync-label">⏱️ 싱크 미세 보정</span>
        <input type="range" class="lyrics-sync-slider slider-offset" min="-10" max="10" step="0.5" value="0">
        <span class="lyrics-sync-value val-offset">0.0초</span>
      </div>
    </div>
  `;
  
  lyricsPanel.appendChild(syncControls);

  const sliderIntro = syncControls.querySelector(".slider-intro");
  const sliderOffset = syncControls.querySelector(".slider-offset");
  const valIntro = syncControls.querySelector(".val-intro");
  const valOffset = syncControls.querySelector(".val-offset");
  const btnReset = syncControls.querySelector(".lyrics-sync-btn-reset");
  
  let introDelay = parseFloat(sliderIntro.value);
  let syncOffset = parseFloat(sliderOffset.value);
  const outroMargin = 8.0; // Outro instrumental margin
  
  sliderIntro.addEventListener("input", (e) => {
    introDelay = parseFloat(e.target.value);
    valIntro.textContent = `${introDelay.toFixed(1)}초`;
  });
  
  sliderOffset.addEventListener("input", (e) => {
    syncOffset = parseFloat(e.target.value);
    valOffset.textContent = `${syncOffset >= 0 ? "+" : ""}${syncOffset.toFixed(1)}초`;
  });
  
  btnReset.addEventListener("click", () => {
    sliderIntro.value = 6;
    sliderOffset.value = 0;
    introDelay = 6.0;
    syncOffset = 0.0;
    valIntro.textContent = "6.0초";
    valOffset.textContent = "0.0초";
  });

  // Playback logic setup
  const audio = new Audio(downloadUrl);
  card.audioObj = audio;
  const playBtn = player.querySelector(".play-pause-btn");
  const playIcon = playBtn.querySelector(".play-icon");
  const pauseIcon = playBtn.querySelector(".pause-icon");
  const seekbar = player.querySelector(".player-seekbar");
  const currTimeSpan = player.querySelector(".curr-time");
  const totTimeSpan = player.querySelector(".tot-time");
  const volSlider = player.querySelector(".volume-slider");
  const volIcon = player.querySelector(".volume-icon");
  
  // Audio state
  let isMuted = false;
  let preMuteVolume = 0.8;
  audio.volume = 0.8;

  // Handle Play/Pause Click
  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      // Pause all other audio players on page
      document.querySelectorAll("audio").forEach(a => a.pause());
      // Play this
      audio.play();
      playIcon.classList.add("hidden");
      pauseIcon.classList.remove("hidden");

      // Auto open lyrics panel if cover exists and panel is currently hidden
      if (coverUrl && lyricsPanel.classList.contains("hidden")) {
        lyricsPanel.classList.remove("hidden");
        lyricsBtn.innerHTML = "🎤 가사 닫기";
        lyricsBtn.style.background = "rgba(246, 199, 84, 0.25)";
      }
    } else {
      audio.pause();
      playIcon.classList.remove("hidden");
      pauseIcon.classList.add("hidden");
    }
  });

  // Time & progress update with Spotify-style lyrics scroll sync
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    seekbar.value = progress;
    currTimeSpan.textContent = formatTime(audio.currentTime);

    // Sync Lyrics Scroll with custom delay and offset settings
    if (lines.length > 0) {
      const d = audio.duration;
      const t = audio.currentTime;
      const tAdj = t + syncOffset;
      
      let singingRatio = 0;
      const singingDuration = d - introDelay - outroMargin;
      
      if (singingDuration > 0) {
        if (tAdj < introDelay) {
          singingRatio = 0;
        } else if (tAdj > d - outroMargin) {
          singingRatio = 1.0;
        } else {
          singingRatio = (tAdj - introDelay) / singingDuration;
        }
      } else {
        singingRatio = t / d;
      }
      
      // Clamp singingRatio between 0 and 1
      singingRatio = Math.max(0, Math.min(1, singingRatio));
      
      const lineIndex = Math.min(Math.floor(singingRatio * lines.length), lines.length - 1);
      const activeEl = scrollContainer.querySelector(`.lyric-line:nth-child(${lineIndex + 1})`);
      
      if (activeEl && !activeEl.classList.contains("active")) {
        scrollContainer.querySelectorAll(".lyric-line").forEach(el => el.classList.remove("active"));
        activeEl.classList.add("active");
        
        const containerHeight = scrollContainer.clientHeight;
        const elemTop = activeEl.offsetTop;
        const elemHeight = activeEl.clientHeight;
        // Smoothly center the active lyric line in viewport
        scrollContainer.scrollTop = elemTop - (containerHeight / 2) + (elemHeight / 2);
      }
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    totTimeSpan.textContent = formatTime(audio.duration);
  });

  // Seekbar change
  seekbar.addEventListener("input", (e) => {
    if (!audio.duration) return;
    const time = (e.target.value / 100) * audio.duration;
    audio.currentTime = time;
  });

  // Volume slider change
  volSlider.addEventListener("input", (e) => {
    const vol = e.target.value / 100;
    audio.volume = vol;
    if (vol === 0) {
      volIcon.innerHTML = `<path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18 14.83,18.4 14,18.7V20.77C15.39,20.45 16.65,19.74 17.68,18.95L20.73,22L22,20.73L4.27,3M19,12C19,12.9 18.82,13.75 18.5,14.54L19.97,16C20.63,14.81 21,13.45 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M14,7.97V11L15.93,12.93C15.97,12.63 16,12.32 16,12C16,10.23 15,8.71 14,7.97Z"/>`;
    } else if (vol < 0.5) {
      volIcon.innerHTML = `<path fill="currentColor" d="M5,9V15H9L14,20V4L9,9H5M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.77 18.5,12M5,9H9L14,4V20L9,15H5V9Z"/>`;
    } else {
      volIcon.innerHTML = `<path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>`;
    }
  });

  // Mute toggle on speaker icon click
  volIcon.addEventListener("click", () => {
    if (isMuted) {
      audio.volume = preMuteVolume;
      volSlider.value = preMuteVolume * 100;
      isMuted = false;
    } else {
      preMuteVolume = audio.volume;
      audio.volume = 0;
      volSlider.value = 0;
      isMuted = true;
    }
    // trigger input event to update speaker icon
    volSlider.dispatchEvent(new Event("input"));
  });

  // Reset play state when finished
  audio.addEventListener("ended", () => {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    seekbar.value = 0;
    currTimeSpan.textContent = "0:00";

    // Reset lyrics scroll to top and set first line active
    if (lines.length > 0) {
      scrollContainer.querySelectorAll(".lyric-line").forEach(el => el.classList.remove("active"));
      const firstEl = scrollContainer.querySelector(".lyric-line:first-child");
      if (firstEl) firstEl.classList.add("active");
      scrollContainer.scrollTop = 0;
    }
  });

  // Lyrics toggle click handler
  const lyricsBtn = actions.querySelector(".btn-action-lyrics");
  lyricsBtn.addEventListener("click", () => {
    const isHidden = lyricsPanel.classList.contains("hidden");
    if (isHidden) {
      lyricsPanel.classList.remove("hidden");
      lyricsBtn.innerHTML = "🎤 가사 닫기";
      lyricsBtn.style.background = "rgba(246, 199, 84, 0.25)";
    } else {
      lyricsPanel.classList.add("hidden");
      lyricsBtn.innerHTML = "🎤 가사 보기";
      lyricsBtn.style.background = "rgba(246, 199, 84, 0.08)";
    }
  });

  // Action Buttons behavior
  actions.querySelector(".btn-action-download").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `Daon_Track_${trackNum}_Seed_${seed}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  actions.querySelector(".btn-action-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(downloadUrl);
    alert("오디오 다운로드 주소가 복사되었습니다!");
  });

  actions.querySelector(".btn-action-delete").addEventListener("click", () => {
    if (confirm(`트랙 ${trackNum}(시드: ${seed})을 삭제하시겠습니까?`)) {
      audio.pause();
      card.remove();
      updateClearAllButtonVisibility();
    }
  });

  // Append elements to card
  card.appendChild(header);
  card.appendChild(cardBody);
  card.appendChild(lyricsPanel);
  
  return card;
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// 11. Preset Buttons Click Handler
document.querySelectorAll(".preset-btn:not(.cover-style-preset)").forEach(btn => {
  btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-value");
    if (val) {
      document.getElementById("caption").value = val;
      
      // Automatically synchronize cover prompt to match music style!
      const btnText = btn.textContent.trim();
      const coverPromptInput = document.getElementById("cover-prompt");
      if (coverPromptInput) {
        if (btnText.includes("어반 팝")) {
          coverPromptInput.value = "modern urban pop music album cover art, colorful, neon synth lights, stylish fashion, highly detailed, 8k";
        } else if (btnText.includes("영화 OST")) {
          coverPromptInput.value = "dreamy surrealism fantasy landscape, oil painting, texture, rich gold details, starry sky, emotional vibe, masterpiece";
        } else if (btnText.includes("로파이")) {
          coverPromptInput.value = "cozy lofi bedroom, warm lighting, anime style, flat colors, aesthetic, retro nostalgic, 8k resolution";
        } else if (btnText.includes("강렬한 록")) {
          coverPromptInput.value = "retro vintage vinyl cover art, 1980s rock aesthetic, high contrast electric guitar silhouette, bold typography, grunge texture";
        }
        coverPromptInput.dispatchEvent(new Event("input"));
      }
    }
  });
});

// 12. Instrumental Mode Toggle Handler
const instModeBtn = document.getElementById("inst-mode-btn");
const lyricsTextarea = document.getElementById("lyrics");
const negativePromptInput = document.getElementById("negative_prompt");
let prevLyrics = "";
let prevNegative = "";
let prevVocalGender = "";

// Smart Focus Auto-Clear for default inputs (Lyrics & Caption)
const defaultLyricsStr = `[Verse]\nI wake up every morning, feeling alive\nThe world outside is bright, the sun is on my side\n\n[Chorus]\nWe're dancing through the fire\nRising ever higher\nNothing's gonna stop us now`;
const defaultCaptionStr = `Dreamy synth-pop with shimmering pads, soft vocals, and a slow dance groove.`;

if (lyricsTextarea) {
  lyricsTextarea.addEventListener("focus", () => {
    const val = lyricsTextarea.value.trim().replace(/\r\n/g, "\n");
    const cleanDefault = defaultLyricsStr.trim().replace(/\r\n/g, "\n");
    if (val === cleanDefault) {
      lyricsTextarea.value = "";
    }
  });
}

const captionInput = document.getElementById("caption");
if (captionInput) {
  captionInput.addEventListener("focus", () => {
    const val = captionInput.value.trim();
    if (val === defaultCaptionStr.trim()) {
      captionInput.value = "";
    }
  });
}

if (instModeBtn) {
  instModeBtn.addEventListener("click", () => {
    const isInst = lyricsTextarea.value.trim() === "[Instrumental]";
    const vocalGenderSelect = document.getElementById("vocal_gender");
    if (!isInst) {
      // Save current inputs
      prevLyrics = lyricsTextarea.value;
      prevNegative = negativePromptInput.value;
      prevVocalGender = vocalGenderSelect ? vocalGenderSelect.value : "";

      // Set to Instrumental Mode
      lyricsTextarea.value = "[Instrumental]";
      if (vocalGenderSelect) vocalGenderSelect.value = "none";
      
      // Add vocals to negative prompt if not already there
      let currentNeg = negativePromptInput.value.trim();
      if (!currentNeg) {
        negativePromptInput.value = "vocals, vocal, singing, humming, voice";
      } else if (!currentNeg.includes("vocals") && !currentNeg.includes("vocal")) {
        negativePromptInput.value = currentNeg + ", vocals, vocal, singing, humming, voice";
      }
      
      // Style changes to indicate active state
      instModeBtn.textContent = "🎤 보컬 모드로 복원";
      instModeBtn.style.background = "rgba(168, 85, 247, 0.15)";
      instModeBtn.style.borderColor = "rgba(168, 85, 247, 0.4)";
      instModeBtn.style.color = "#d8b4fe";
    } else {
      // Restore previous inputs or default
      lyricsTextarea.value = prevLyrics || `[Verse]\nI wake up every morning, feeling alive\nThe world outside is bright, the sun is on my side\n\n[Chorus]\nWe're dancing through the fire\nRising ever higher\nNothing's gonna stop us now`;
      negativePromptInput.value = prevNegative || "";
      if (vocalGenderSelect) vocalGenderSelect.value = prevVocalGender || "";
      
      // Reset styles
      instModeBtn.textContent = "🎹 연주곡(반주) 모드 켜기";
      instModeBtn.style.background = "rgba(6, 182, 212, 0.1)";
      instModeBtn.style.borderColor = "rgba(6, 182, 212, 0.3)";
      instModeBtn.style.color = "#06b6d4";
    }
  });
}

// 13. Clear All Tracks Click Handler
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    if (confirm("생성 완료된 모든 트랙을 정말로 삭제하시겠습니까?")) {
      // Pause all playing audios cleanly
      tracksList.querySelectorAll(".track-item").forEach(card => {
        if (card.audioObj) {
          card.audioObj.pause();
        }
      });
      // Clear tracks and update panel states
      tracksList.innerHTML = "";
      updateClearAllButtonVisibility();
    }
  });
}

// 14. Initial empty state visibility check
updateClearAllButtonVisibility();

// 15. AI Album Cover Maker Handlers
const generateCoverBtn = document.getElementById("generate-cover-btn");
const downloadCoverBtn = document.getElementById("download-cover-btn");
const coverSkeleton = document.getElementById("cover-skeleton");
const coverPlaceholder = document.getElementById("cover-placeholder");
const coverResultImg = document.getElementById("cover-result-img");

if (generateCoverBtn) {
  generateCoverBtn.addEventListener("click", () => {
    const lyricsText = document.getElementById("lyrics").value.trim().toLowerCase();
    const captionText = document.getElementById("caption").value.trim().toLowerCase();
    const styleSelect = document.getElementById("cover-style-select");
    const selectedStyle = styleSelect ? styleSelect.value : "auto";

    // 1. Analyze lyrics to determine key theme (English/Korean keywords)
    let themePrompt = "";
    let detectedTheme = "";

    // If custom style is selected (not "auto"), we dynamically extract lyrics
    if (selectedStyle !== "auto") {
      const lines = lyricsText.split("\n")
        .map(l => l.trim().replace(/[\[\]]/g, ""))
        .filter(l => l.length > 0 && !l.includes("chorus") && !l.includes("verse") && !l.includes("instrumental") && !l.includes("intro") && !l.includes("outro"));
      
      if (lines.length > 0) {
        // Use first two clean lines directly as the visual concept
        const cleanContext = lines.slice(0, 2).join(", ");
        themePrompt = `artistic representation of the poetic emotion in: "${cleanContext}"`;
      } else {
        themePrompt = "conceptual abstract beauty";
      }
    } else {
      // Auto mapping by keyword
      if (lyricsText.includes("rain") || lyricsText.includes("storm") || lyricsText.includes("cloud") || lyricsText.includes("비가") || lyricsText.includes("우산") || lyricsText.includes("빗방울")) {
        detectedTheme = "빗방울과 슬픔 (Rainy / Melancholic)";
        themePrompt = "melancholic rainy day aesthetic, soft raindrops on a window pane, reflections of warm streetlights, watercolor style, cozy longing";
      } else if (lyricsText.includes("night") || lyricsText.includes("star") || lyricsText.includes("moon") || lyricsText.includes("dark") || lyricsText.includes("밤하늘") || lyricsText.includes("별") || lyricsText.includes("어둠")) {
        detectedTheme = "밤하늘과 달빛 (Starry / Cosmic Night)";
        themePrompt = "dreamy starry night sky with a shining crescent moon, deep cosmic purple and gold nebula hues, fantasy flat illustration style, serene silhouette";
      } else if (lyricsText.includes("sun") || lyricsText.includes("morning") || lyricsText.includes("bright") || lyricsText.includes("light") || lyricsText.includes("태양") || lyricsText.includes("아침") || lyricsText.includes("햇살")) {
        detectedTheme = "찬란한 아침 (Sunny / Bright)";
        themePrompt = "bright sunny morning sky, warm golden sun rays pouring down, hopeful flat color illustration, vibrant and inspiring layout";
      } else if (lyricsText.includes("fire") || lyricsText.includes("burn") || lyricsText.includes("flame") || lyricsText.includes("dance") || lyricsText.includes("불꽃") || lyricsText.includes("타오르") || lyricsText.includes("춤")) {
        detectedTheme = "열정적인 불꽃 (Fire / Dance)";
        themePrompt = "dramatic warm aesthetic, glowing fire embers and flames rising, abstract high contrast paint strokes, deep orange and gold gradients";
      } else if (lyricsText.includes("sea") || lyricsText.includes("ocean") || lyricsText.includes("wave") || lyricsText.includes("blue") || lyricsText.includes("바다") || lyricsText.includes("파도") || lyricsText.includes("푸른")) {
        detectedTheme = "푸른 바다 (Ocean Waves)";
        themePrompt = "serene deep blue ocean waves, calm horizon, gentle breeze, minimalist design, clean layouts, refreshing watercolor aesthetic";
      } else if (lyricsText.includes("sad") || lyricsText.includes("cry") || lyricsText.includes("lonely") || lyricsText.includes("tears") || lyricsText.includes("슬픈") || lyricsText.includes("눈물") || lyricsText.includes("혼자") || lyricsText.includes("아픔")) {
        detectedTheme = "애절함과 외로움 (Moody / Emotional)";
        themePrompt = "deeply emotional moody abstract art, clean minimal vector graphics, muted cool color palette with single gold glowing highlight line";
      } else if (lyricsText.includes("love") || lyricsText.includes("heart") || lyricsText.includes("sweet") || lyricsText.includes("together") || lyricsText.includes("사랑") || lyricsText.includes("마음") || lyricsText.includes("영원")) {
        detectedTheme = "달콤한 사랑 (Romantic / Sweet)";
        themePrompt = "sweet warm romantic aesthetic design, pastel color palette, soft glowing hearts, cozy dreamlike flat vector illustration";
      } else if (lyricsText.includes("dream") || lyricsText.includes("fly") || lyricsText.includes("heaven") || lyricsText.includes("magic") || lyricsText.includes("꿈") || lyricsText.includes("하늘") || lyricsText.includes("마법")) {
        detectedTheme = "몽환적인 하늘 (Dreamy / Fantasy)";
        themePrompt = "surrealism dreamlike fantasy scene, floating pastel clouds, stairs climbing to the heaven, ethereal lighting, masterpiece";
      }

      if (!themePrompt) {
        const lines = lyricsText.split("\n")
          .map(l => l.trim().replace(/[\[\]]/g, ""))
          .filter(l => l.length > 0 && !l.includes("chorus") && !l.includes("verse") && !l.includes("instrumental") && !l.includes("intro") && !l.includes("outro"));
        
        if (lines.length > 0) {
          const cleanContext = lines.slice(0, 2).join(", ");
          themePrompt = `artistic abstract oil painting representing the poetic emotion of: "${cleanContext}", textured canvas, beautiful rich colors with glowing highlights`;
        } else {
          themePrompt = "beautiful conceptual abstract art, aesthetic shapes, modern layouts, rich color harmony";
        }
      }
    }

    // 2. Map select style to exact visual rules
    let stylePrompt = "album cover art, highly aesthetic, masterpiece, 8k resolution, flat graphic design";
    
    if (selectedStyle === "photo") {
      stylePrompt = "emotional cinematic photography album art, high dynamic range, warm volumetric light, shot on 35mm lens, vintage analog grain, aesthetic composition";
    } else if (selectedStyle === "watercolor") {
      stylePrompt = "warm cozy watercolor illustration style album cover art, soft pastel hues, hand-drawn textures, peaceful aesthetic, masterpiece";
    } else if (selectedStyle === "oil") {
      stylePrompt = "classic textured oil painting, rich canvas brush strokes, vintage vinyl record cover style, warm lighting, timeless masterpiece art";
    } else if (selectedStyle === "vector") {
      stylePrompt = "clean minimalist flat vector graphic design album cover art, modern geometric shapes, elegant color palette, high fidelity";
    } else if (selectedStyle === "pop") {
      stylePrompt = "neon synthwave electropop album cover art, vibrant retro lights, glowing cyber textures, stylish pop art style, highly aesthetic";
    } else if (selectedStyle === "fantasy") {
      stylePrompt = "surreal fantasy scene album cover, starry cosmic clouds, ethereal magical glowing lights, starry nebula background, dreamlike masterpiece";
    } else if (selectedStyle === "ink") {
      stylePrompt = "modern minimal black ink drawing album cover art, brush calligraphy strokes, rich golden splash accents, high contrast paper texture, highly aesthetic";
    } else {
      // "auto" style - infer from caption
      if (captionText.includes("pop") || captionText.includes("synth-pop") || captionText.includes("catchy")) {
        stylePrompt = "modern pop album cover art, colorful, neon synthwave lights, stylish design, 8k resolution";
      } else if (captionText.includes("cinematic") || captionText.includes("orchestral") || captionText.includes("epic")) {
        stylePrompt = "epic movie poster style album art, dramatic symphonic lighting, cinematic landscape, masterpiece";
      } else if (captionText.includes("lo-fi") || captionText.includes("chill") || captionText.includes("mellow")) {
        stylePrompt = "lofi aesthetic album cover art, warm ambient lighting, beautiful flat vector anime style, retro nostalgic vibe";
      } else if (captionText.includes("rock") || captionText.includes("metal") || captionText.includes("guitar")) {
        stylePrompt = "grunge rock album cover design, high contrast graphic, retro vinyl sleeve texture, bold and raw aesthetic";
      } else if (captionText.includes("jazz") || captionText.includes("classic")) {
        stylePrompt = "classic jazz vinyl record cover, minimal monochrome photography with elegant gold typography, warm shadows";
      }
    }

    // Set UI states to loading
    generateCoverBtn.disabled = true;
    generateCoverBtn.style.opacity = "0.7";
    generateCoverBtn.textContent = "🎨 커버 그리는 중...";
    
    if (coverPlaceholder) coverPlaceholder.classList.add("hidden");
    if (coverResultImg) coverResultImg.classList.add("hidden");
    if (coverSkeleton) coverSkeleton.classList.remove("hidden");
    if (downloadCoverBtn) downloadCoverBtn.classList.add("hidden");

    // Generate random seed to force new generation
    const randomSeed = Math.floor(Math.random() * 9999999);
    
    // Pick a random style modifier to inject infinite variety
    const randomModifiers = [
      "highly textured details, stunning ambient shadows",
      "minimalist aesthetic layouts, clean empty spaces",
      "rich glowing ambiance, volumetric dreamlike haze",
      "dramatic side lighting, deep shadows and intense mood",
      "vibrant retro analog color tones, warm highlights",
      "vintage vinyl sleeve texture, subtle record wear grain"
    ];
    const pickedModifier = randomModifiers[randomSeed % randomModifiers.length];

    const promptText = `${themePrompt}, ${stylePrompt}, ${pickedModifier}`;
    const encodedPrompt = encodeURIComponent(promptText);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}`;
    
    // Pre-load image in browser memory
    const imgObj = new Image();
    imgObj.onload = () => {
      coverResultImg.src = imageUrl;
      coverResultImg.classList.remove("hidden");
      coverSkeleton.classList.add("hidden");
      downloadCoverBtn.classList.remove("hidden");
      
      generateCoverBtn.disabled = false;
      generateCoverBtn.style.opacity = "1";
      generateCoverBtn.textContent = "🎨 가사 기반 AI 커버 생성";

      let infoMsg = "가사 감성을 반영하여 고화질 아트를 매칭했습니다!";
      if (selectedStyle !== "auto") {
        const styleText = styleSelect.options[styleSelect.selectedIndex].text.split(" (")[0];
        infoMsg = `선택하신 [${styleText}] 화풍과 가사 의미를 조합하여 고화질 자켓을 그렸습니다! 마음에 들 때까지 여러 번 다시 그려보세요.`;
      } else if (detectedTheme) {
        infoMsg = `가사에서 [${detectedTheme}] 분위기를 감지하여 맞춤형 자켓을 매칭했습니다!`;
      }
      alert(infoMsg);
    };
    
    imgObj.onerror = () => {
      alert("이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      coverPlaceholder.classList.remove("hidden");
      coverSkeleton.classList.add("hidden");
      generateCoverBtn.disabled = false;
      generateCoverBtn.style.opacity = "1";
      generateCoverBtn.textContent = "🎨 가사 기반 AI 커버 생성";
    };
    
    imgObj.src = imageUrl;
  });
}

// Download Button Click Handler
if (downloadCoverBtn && coverResultImg) {
  downloadCoverBtn.addEventListener("click", async () => {
    const imageUrl = coverResultImg.src;
    if (!imageUrl) return;
    
    try {
      downloadCoverBtn.disabled = true;
      downloadCoverBtn.textContent = "다운로드 중...";
      
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `Daon_AI_Cover_${Math.floor(Math.random() * 10000)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download cover image:", err);
      // Fallback: open in new tab
      window.open(imageUrl, "_blank");
    } finally {
      downloadCoverBtn.disabled = false;
      downloadCoverBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
        커버 다운로드
      `;
    }
  });
}

// 17. Global Last.fm Artist Sound Matcher Engine
const artistSearchInput = document.getElementById("artist-search-input");
const artistSearchBtn = document.getElementById("artist-search-btn");
const artistTagsPreview = document.getElementById("artist-tags-preview");
const detectedTagsList = document.getElementById("detected-tags-list");
const lastfmApiKeyInput = document.getElementById("lastfm_api_key");
const captionTextarea = document.getElementById("caption");
const vocalGenderSelect = document.getElementById("vocal_gender");

// Local Artist Presets Database for K-pop/Domestic singers that might not have high global Last.fm scrobbles
const LOCAL_ARTIST_DB = {
  "임영웅": {
    artist: "임영웅 (Lim Young Woong)",
    tags: ["ballad", "trot", "male vocalists", "korean", "emotional"],
    gender: "male"
  },
  "lim young woong": {
    artist: "임영웅 (Lim Young Woong)",
    tags: ["ballad", "trot", "male vocalists", "korean", "emotional"],
    gender: "male"
  },
  "아이유": {
    artist: "아이유 (IU)",
    tags: ["k-pop", "ballad", "female vocalists", "korean", "acoustic", "pop"],
    gender: "female"
  },
  "iu": {
    artist: "아이유 (IU)",
    tags: ["k-pop", "ballad", "female vocalists", "korean", "acoustic", "pop"],
    gender: "female"
  },
  "성시경": {
    artist: "성시경 (Sung Si Kyung)",
    tags: ["ballad", "korean", "male vocalists", "emotional", "romantic"],
    gender: "male"
  },
  "sung si kyung": {
    artist: "성시경 (Sung Si Kyung)",
    tags: ["ballad", "korean", "male vocalists", "emotional", "romantic"],
    gender: "male"
  },
  "태연": {
    artist: "태연 (Taeyeon)",
    tags: ["k-pop", "female vocalists", "ballad", "r&b", "korean"],
    gender: "female"
  },
  "taeyeon": {
    artist: "태연 (Taeyeon)",
    tags: ["k-pop", "female vocalists", "ballad", "r&b", "korean"],
    gender: "female"
  },
  "장윤정": {
    artist: "장윤정 (Jang Yoon Jeong)",
    tags: ["trot", "korean", "female vocalists", "dance trot"],
    gender: "female"
  },
  "송가인": {
    artist: "송가인 (Song Ga In)",
    tags: ["trot", "korean", "female vocalists", "traditional trot"],
    gender: "female"
  },
  "이선희": {
    artist: "이선희 (Lee Sun Hee)",
    tags: ["legendary", "female vocalists", "korean", "ballad", "powerful"],
    gender: "female"
  },
  "조용필": {
    artist: "조용필 (Cho Yong Pil)",
    tags: ["legendary", "male vocalists", "korean", "rock", "pop"],
    gender: "male"
  }
};

if (artistSearchBtn) {
  artistSearchBtn.addEventListener("click", async () => {
    const artist = artistSearchInput.value.trim();
    if (!artist) return alert("분석할 아티스트명을 입력해주세요!");
    
    artistSearchBtn.disabled = true;
    artistSearchBtn.textContent = "분석 중... 🔍";
    
    let tags = [];
    let detectedGender = "auto";
    let displayArtist = artist;
    let isLocalMatch = false;

    // 1. Check local preset database first
    const searchKey = artist.toLowerCase();
    if (LOCAL_ARTIST_DB[searchKey]) {
      const match = LOCAL_ARTIST_DB[searchKey];
      tags = match.tags;
      detectedGender = match.gender;
      displayArtist = match.artist;
      isLocalMatch = true;
    }

    try {
      if (!isLocalMatch) {
        const apiKey = (lastfmApiKeyInput ? lastfmApiKeyInput.value.trim() : "") || "75d20fb472be99275392aefa2760ea09";
        const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data = await res.json();
          if (data.toptags && data.toptags.tag && data.toptags.tag.length > 0) {
            const rawTags = data.toptags.tag.slice(0, 6);
            tags = rawTags.map(t => t.name.toLowerCase());
            if (data.toptags["@attr"] && data.toptags["@attr"].artist) {
              displayArtist = data.toptags["@attr"].artist;
            }
          }
        }
      }
      
      // 2. Intelligent Graceful Fallback if still empty (neither local preset nor Last.fm result)
      if (tags.length === 0) {
        // If the search artist name has Korean syllables
        if (/[\uac00-\ud7a3]/.test(artist)) {
          displayArtist = `${artist} (국내 보컬)`;
          tags = ["ballad", "korean", "emotional", "romantic", "pop"];
          // Guess gender based on common Korean names or defaults
          detectedGender = "male"; // default
          if (artist.endsWith("희") || artist.endsWith("경") || artist.endsWith("아") || artist.endsWith("은") || artist.endsWith("연") || artist.endsWith("영") || artist.endsWith("우")) {
            detectedGender = "female";
          }
        } else {
          // English unknown artist fallback
          displayArtist = `${artist} (인디 아티스트)`;
          tags = ["indie", "pop", "acoustic", "lo-fi", "chill"];
          detectedGender = "auto";
        }
      }

      // Render tag chips
      detectedTagsList.innerHTML = "";
      tags.forEach(tag => {
        const chip = document.createElement("span");
        chip.className = "artist-tag-chip";
        chip.textContent = tag;
        detectedTagsList.appendChild(chip);
      });
      artistTagsPreview.classList.remove("hidden");
      
      // 1. Detect vocal gender/type if not already locally set
      if (detectedGender === "auto") {
        if (tags.some(t => t.includes("female") || t.includes("girl") || t === "diva" || t.includes("woman"))) {
          detectedGender = "female";
        } else if (tags.some(t => t.includes("male") || t.includes("boy") || t === "baritone" || t === "tenor" || t.includes("man"))) {
          detectedGender = "male";
        } else if (tags.some(t => t.includes("choir") || t.includes("chorus"))) {
          detectedGender = "choir";
        }
      }
      
      // Synchronize vocal gender selection
      if (vocalGenderSelect) {
        if (detectedGender === "female") {
          vocalGenderSelect.value = "female";
        } else if (detectedGender === "male") {
          vocalGenderSelect.value = "male";
        } else if (detectedGender === "choir") {
          vocalGenderSelect.value = "choir";
        }
      }
      
      // 2. Map tags to premium production prompt style
      let genre = "pop";
      let tempo = "120 BPM";
      let instruments = "acoustic piano, synth pads, smooth bass groove";
      let mood = "polished production, highly aesthetic";
      
      if (tags.some(t => t.includes("ballad") || t.includes("melancholic") || t.includes("sad") || t === "soul")) {
        genre = "emotional ballad";
        tempo = "75 BPM";
        instruments = "grand piano intro, warm emotional string orchestra, acoustic guitar chords";
        mood = "heartfelt, intimate vibe, polished stereo mix";
      } else if (tags.some(t => t.includes("rock") || t.includes("metal") || t.includes("grunge") || t.includes("guitar") || t.includes("punk"))) {
        genre = "alternative indie rock";
        tempo = "125 BPM";
        instruments = "driving drums, bright electric guitar chords, powerful bassline";
        mood = "energetic stadium rock atmosphere, punchy mix";
      } else if (tags.some(t => t.includes("lo-fi") || t.includes("chill") || t.includes("jazz") || t.includes("mellow"))) {
        genre = "lo-fi hip hop chillout";
        tempo = "85 BPM";
        instruments = "intimate jazzy piano chords, warm vinyl crackle textures, smooth electric bass";
        mood = "mellow and cozy nostalgic atmosphere";
      } else if (tags.some(t => t.includes("dance") || t.includes("electronic") || t.includes("garage") || t.includes("synth") || t.includes("r&b") || t.includes("house") || t.includes("hip-hop") || t.includes("pop"))) {
        genre = "trendy synth electropop and R&B";
        tempo = "120 BPM";
        instruments = "catchy electronic synth pads, groovy retro bass synth, bright drum machine beat";
        mood = "modern dance groove, highly polished production, 8k audio";
      } else if (tags.some(t => t.includes("cinematic") || t.includes("orchestral") || t.includes("classical") || t.includes("instrumental"))) {
        genre = "cinematic orchestral film score";
        tempo = "80 BPM";
        instruments = "dramatic strings ensemble, majestic brass, cinematic woodwinds, orchestral percussion";
        mood = "epic, deeply emotional soundtrack atmosphere";
      } else if (tags.some(t => t.includes("trot"))) {
        // Special local preset for trot!
        genre = "emotional trot-ballad";
        tempo = "72 BPM";
        instruments = "acoustic grand piano chords, slow warm strings pads, gentle nylon guitar riffs";
        mood = "deeply emotional adult contemporary production, polished vocal focus mix";
      } else {
        // Fallback to combining their tags directly
        genre = tags.slice(0, 3).join(" and ") + " music";
        tempo = "115 BPM";
        instruments = "premium synthesizer pads, acoustic guitar, tight rhythm drums";
        mood = "modern studio production style, highly aesthetic";
      }
      
      // Add gender to prompt to make it perfect
      let genderPrompt = "";
      if (detectedGender === "female") genderPrompt = "female vocal, ";
      else if (detectedGender === "male") genderPrompt = "male vocal, ";
      else if (detectedGender === "choir") genderPrompt = "choir harmony vocal, ";
      
      const finalPrompt = `${genre}, ${genderPrompt}${instruments}, ${tempo}, ${mood}, high fidelity, masterpiece`;
      
      // Smoothly pre-fill and flash the caption textarea
      if (captionTextarea) {
        captionTextarea.value = finalPrompt;
        
        captionTextarea.style.borderColor = "#f6c754";
        captionTextarea.style.boxShadow = "0 0 15px rgba(246, 199, 84, 0.35)";
        setTimeout(() => {
          captionTextarea.style.borderColor = "";
          captionTextarea.style.boxShadow = "";
        }, 1000);
      }
      
      // Notify user
      const tagString = tags.join(", ");
      const matchType = isLocalMatch ? "스튜디오 프리셋" : "글로벌 사운드";
      alert(`[${displayArtist}]의 ${matchType} 태그(${tagString})를 성공적으로 분석하여 최적의 오디오 편곡 캡션을 매칭했습니다!`);
      
    } catch (err) {
      console.error("Last.fm analysis error:", err);
      alert(`아티스트 분석 실패: ${err.message || "Last.fm 연결 에러"}`);
    } finally {
      artistSearchBtn.disabled = false;
      artistSearchBtn.textContent = "스타일 분석 🔍";
    }
  });
}

