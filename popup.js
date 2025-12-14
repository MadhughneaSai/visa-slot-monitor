// ============================================================================
// VISA SLOT MONITOR - Popup UI
// Communicates with background service worker
// ============================================================================

// State (synced from background)
let state = {
  isRunning: false,
  mode: 'FAST',
  phase: 1,
  checkCount: 0,
  logs: []
};

// DOM Elements
const elements = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Show instructions popup first
  showInstructions();
  
  initializeElements();
  setupEventListeners();
  await syncState();
  await loadEmailSettings();
  startLogPolling();
});

function showInstructions() {
  const instructions = `📋 INSTRUCTIONS

1️⃣ SELECT MODE:
• Fast Mode: Scrapes every 10 seconds. Should be used no more than 30 minutes - can trigger bot alert.
• Slow Mode: Safer option. Use this more often. Switch to Fast mode only when you notice lots of slots opening up.

2️⃣ SELECT PHASE:
• Only Biometric: Alerts only for VAC locations
• Both Slots: Alerts for any slot

3️⃣ IMPORTANT - TEST YOUR SETUP:
Enter your email → Click "Save" → Hit "Test Alert" to verify you receive email alerts and sound alerts. This confirms the extension is working properly.

4️⃣ BACKGROUND MONITORING:
The extension runs automatically in the background even if you switch tabs or close the popup.

5️⃣ ACTIVITY LOG:
View recently found slots at the bottom. See when the last check was made and when the next one will happen.

Click OK to continue.`;

  alert(instructions);
}

function initializeElements() {
  elements.fastMode = document.getElementById('fastMode');
  elements.slowMode = document.getElementById('slowMode');
  elements.phase0 = document.getElementById('phase0');
  elements.phase1 = document.getElementById('phase1');
  elements.startBtn = document.getElementById('startBtn');
  elements.stopBtn = document.getElementById('stopBtn');
  elements.statusDot = document.getElementById('statusDot');
  elements.statusText = document.getElementById('statusText');
  elements.checkCount = document.getElementById('checkCount');
  elements.resultsBody = document.getElementById('resultsBody');
  elements.logContainer = document.getElementById('logContainer');
  elements.lastCheck = document.getElementById('lastCheck');
  elements.nextCheck = document.getElementById('nextCheck');
  elements.modeInfo = document.getElementById('modeInfo');
  elements.phaseInfo = document.getElementById('phaseInfo');
}

function setupEventListeners() {
  elements.fastMode.addEventListener('click', () => setMode('FAST'));
  elements.slowMode.addEventListener('click', () => setMode('SLOW'));
  elements.phase0.addEventListener('click', () => setPhase(0));
  elements.phase1.addEventListener('click', () => setPhase(1));
  elements.startBtn.addEventListener('click', startMonitoring);
  elements.stopBtn.addEventListener('click', stopMonitoring);
  
  // Test button
  document.getElementById('testBtn').addEventListener('click', testAlert);
  
  // Email save button
  document.getElementById('saveEmailBtn').addEventListener('click', saveEmail);
  
  // Enter key on email input
  document.getElementById('emailInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEmail();
  });
}

async function testAlert() {
  const btn = document.getElementById('testBtn');
  btn.disabled = true;
  btn.textContent = '🔊 Testing...';
  
  await chrome.runtime.sendMessage({ type: 'TEST_ALERT' });
  
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = '🔔 Test Alert (Sound + Email)';
  }, 2000);
}

// Email functions
async function loadEmailSettings() {
  const result = await chrome.storage.local.get(['userEmail']);
  if (result.userEmail) {
    document.getElementById('emailInput').value = result.userEmail;
    showEmailStatus('✓ Email saved - will receive alerts', 'success');
  }
}

async function saveEmail() {
  const email = document.getElementById('emailInput').value.trim();
  
  if (!email) {
    showEmailStatus('Please enter an email', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showEmailStatus('Invalid email format', 'error');
    return;
  }
  
  await chrome.storage.local.set({ userEmail: email });
  await chrome.runtime.sendMessage({ type: 'SET_EMAIL', email });
  
  showEmailStatus('✓ Email saved! Will receive alerts.', 'success');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showEmailStatus(message, type) {
  const status = document.getElementById('emailStatus');
  status.textContent = message;
  status.className = 'email-status ' + type;
}

// Sync state from background
async function syncState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (response && response.state) {
      state = response.state;
      updateUI();
    }
  } catch (e) {
    console.log('Could not sync state:', e);
  }
}

// Poll for log updates
function startLogPolling() {
  setInterval(async () => {
    await syncState();
  }, 1000);
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATE') {
    state = message.state;
    updateUI();
  } else if (message.type === 'LOG_UPDATE') {
    state.logs = message.logs;
    updateLogs();
  }
});

async function setMode(mode) {
  // Show warning when switching to FAST mode
  if (mode === 'FAST') {
    alert('⚠️ WARNING\n\nFast mode should not be used for more than half an hour at a time.\n\nCan trigger bot alert from the website.');
  }
  
  state.mode = mode;
  await chrome.runtime.sendMessage({ type: 'SET_MODE', mode });
  updateUI();
}

async function setPhase(phase) {
  state.phase = phase;
  await chrome.runtime.sendMessage({ type: 'SET_PHASE', phase });
  updateUI();
}

async function startMonitoring() {
  elements.startBtn.disabled = true;
  elements.startBtn.textContent = '⏳ Starting...';
  
  await chrome.runtime.sendMessage({ 
    type: 'START_MONITORING',
    mode: state.mode,
    phase: state.phase
  });
  
  setTimeout(syncState, 500);
}

async function stopMonitoring() {
  await chrome.runtime.sendMessage({ type: 'STOP_MONITORING' });
  setTimeout(syncState, 500);
}

function updateUI() {
  // Mode buttons
  elements.fastMode.classList.toggle('active', state.mode === 'FAST');
  elements.slowMode.classList.toggle('active', state.mode === 'SLOW');
  
  // Phase buttons
  elements.phase0.classList.toggle('active', state.phase === 0);
  elements.phase1.classList.toggle('active', state.phase === 1);
  
  // Status
  elements.statusDot.className = 'status-dot ' + (state.isRunning ? 'running' : 'stopped');
  elements.statusText.textContent = state.isRunning ? 'Running (Background)' : 'Stopped';
  
  // Buttons
  elements.startBtn.disabled = state.isRunning;
  elements.startBtn.textContent = '▶ Start Monitoring';
  elements.stopBtn.disabled = !state.isRunning;
  
  // Check count
  elements.checkCount.textContent = state.checkCount || 0;
  
  // Last check and next check
  elements.lastCheck.textContent = state.lastCheckTime || '--';
  elements.nextCheck.textContent = state.isRunning ? (state.nextCheckIn || '--') : '--';
  
  // Info box
  updateInfoBox();
  
  // Logs
  updateLogs();
}

function updateInfoBox() {
  if (state.mode === 'FAST') {
    elements.modeInfo.textContent = '⚡ Fast: Fixed 10s interval';
  } else {
    elements.modeInfo.textContent = '🐢 Slow: Random 1-60s interval';
  }
  
  if (state.phase === 0) {
    elements.phaseInfo.textContent = '📋 Both Slots: Alert on ANY slot';
  } else {
    elements.phaseInfo.textContent = '📋 Only Biometric: VAC locations only';
  }
}

function updateLogs() {
  if (!state.logs || state.logs.length === 0) {
    elements.logContainer.innerHTML = '<div class="log-entry">Waiting to start...</div>';
    return;
  }
  
  elements.logContainer.innerHTML = state.logs.map(log => {
    return `<div class="log-entry ${log.type}">${log.message}</div>`;
  }).join('');
}
