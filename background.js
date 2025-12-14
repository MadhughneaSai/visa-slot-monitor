// ============================================================================
// VISA SLOT MONITOR - Background Service Worker
// Runs continuously even when popup is closed
// ============================================================================

const CONFIG = {
  URL: 'https://checkvisaslots.com/latest-us-visa-availability/',
  FAST_MODE_INTERVAL: 10,
  SLOW_MODE_MIN: 1,
  SLOW_MODE_MAX: 60
};

// EmailJS Configuration - HARDCODED
const EMAILJS_CONFIG = {
  serviceId: 'service_y740zfh',
  templateId: 'template_d21ofbi',
  publicKey: 'k6d-KOTwt434GVhOH'
};

// User's email
let userEmail = null;

// State
let state = {
  isRunning: false,
  mode: 'FAST',
  phase: 1,
  checkCount: 0,
  previousLocations: [],
  tabId: null,
  logs: [],
  lastCheckTime: null,
  nextCheckIn: null
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('Visa Slot Monitor installed');
  loadState();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, loading state');
  loadState();
});

// Load state from storage
async function loadState() {
  const result = await chrome.storage.local.get(['visaMonitorState', 'userEmail']);
  if (result.visaMonitorState) {
    state = { ...state, ...result.visaMonitorState };
    // Don't auto-resume monitoring on browser restart
    state.isRunning = false;
    state.tabId = null;
  }
  if (result.userEmail) {
    userEmail = result.userEmail;
  }
}

// Save state to storage
async function saveState() {
  await chrome.storage.local.set({ visaMonitorState: state });
}

// Add log entry
function addLog(message, type = '') {
  const entry = {
    time: new Date().toLocaleTimeString(),
    message,
    type
  };
  state.logs.unshift(entry);
  
  // Keep only last 100 logs
  if (state.logs.length > 100) {
    state.logs = state.logs.slice(0, 100);
  }
  
  // Notify popup if it's open
  chrome.runtime.sendMessage({ type: 'LOG_UPDATE', logs: state.logs }).catch(() => {});
  
  console.log(`[VSM] ${message}`);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received:', message.type);
  
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({ state });
      break;
      
    case 'START_MONITORING':
      state.mode = message.mode || state.mode;
      state.phase = message.phase ?? state.phase;
      startMonitoring();
      sendResponse({ success: true });
      break;
      
    case 'STOP_MONITORING':
      stopMonitoring();
      sendResponse({ success: true });
      break;
      
    case 'SET_MODE':
      state.mode = message.mode;
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'SET_PHASE':
      state.phase = message.phase;
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'GET_LOGS':
      sendResponse({ logs: state.logs });
      break;
      
    case 'TEST_ALERT':
      testAlertTrigger();
      sendResponse({ success: true });
      break;
      
    case 'SET_EMAIL':
      userEmail = message.email;
      sendResponse({ success: true });
      break;
      
    case 'CONTENT_READY':
      console.log('Content script ready on:', message.url);
      break;
  }
  
  return true;
});

// Start monitoring
async function startMonitoring() {
  if (state.isRunning) {
    addLog('Already running', 'warning');
    return;
  }
  
  state.isRunning = true;
  state.previousLocations = [];
  state.checkCount = 0;
  state.logs = [];
  
  addLog('🚀 Starting background monitoring...', 'success');
  addLog(`📋 Mode: ${state.mode}, Phase: ${state.phase}`);
  
  try {
    // Open the website in a new tab
    const tab = await chrome.tabs.create({ 
      url: CONFIG.URL,
      active: false
    });
    state.tabId = tab.id;
    addLog(`✓ Tab opened (ID: ${tab.id})`, 'success');
    
    await saveState();
    
    // Wait for page to load, then start checking
    setTimeout(() => {
      runCheck();
    }, 4000);
    
  } catch (error) {
    addLog(`❌ Failed: ${error.message}`, 'error');
    state.isRunning = false;
    await saveState();
  }
}

// Stop monitoring
async function stopMonitoring() {
  state.isRunning = false;
  
  // Clear any pending alarms
  await chrome.alarms.clear('visaCheck');
  
  // Close the tab
  if (state.tabId) {
    try {
      await chrome.tabs.remove(state.tabId);
    } catch (e) {}
    state.tabId = null;
  }
  
  addLog('🛑 Monitoring stopped', 'warning');
  await saveState();
  
  // Notify popup
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state }).catch(() => {});
}

// Schedule next check
function scheduleNextCheck() {
  if (!state.isRunning) return;
  
  const interval = getCheckInterval();
  state.nextCheckIn = interval;
  addLog(`⏸️ Next check in ${interval}s (${state.mode} mode)`);
  
  // Notify popup of state update
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state }).catch(() => {});
  
  // Countdown timer
  const countdownInterval = setInterval(() => {
    if (state.nextCheckIn > 0) {
      state.nextCheckIn--;
      chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state }).catch(() => {});
    } else {
      clearInterval(countdownInterval);
    }
  }, 1000);
  
  // Use setTimeout for precise timing (alarms have 1-min minimum)
  setTimeout(() => {
    clearInterval(countdownInterval);
    if (state.isRunning) {
      runCheck();
    }
  }, interval * 1000);
}

function getCheckInterval() {
  if (state.mode === 'SLOW') {
    return Math.floor(Math.random() * (CONFIG.SLOW_MODE_MAX - CONFIG.SLOW_MODE_MIN + 1)) + CONFIG.SLOW_MODE_MIN;
  }
  return CONFIG.FAST_MODE_INTERVAL;
}

// Run a check
async function runCheck() {
  if (!state.isRunning || !state.tabId) {
    return;
  }
  
  state.checkCount++;
  state.lastCheckTime = new Date().toLocaleTimeString();
  
  addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  addLog(`[${state.lastCheckTime}] Check #${state.checkCount}`);
  
  try {
    // Refresh the tab
    addLog('🔄 Refreshing page...');
    await chrome.tabs.reload(state.tabId);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Send message to content script
    addLog('📡 Scraping...');
    
    let response;
    try {
      response = await chrome.tabs.sendMessage(state.tabId, {
        type: 'SCRAPE_PAGE',
        mode: state.mode
      });
    } catch (msgError) {
      addLog('⚠️ Retrying...', 'warning');
      await new Promise(resolve => setTimeout(resolve, 2000));
      response = await chrome.tabs.sendMessage(state.tabId, {
        type: 'SCRAPE_PAGE',
        mode: state.mode
      });
    }
    
    if (response && response.success) {
      addLog(`✓ Checked H-1B section successfully`, 'success');
      addLog(`📊 ${response.slots.length} slot(s) match pattern`);
      
      if (response.slots.length > 0) {
        response.slots.forEach((slot) => {
          addLog(`│ ${slot.location} │ ${slot.earliestDate} │ ${slot.relativeTime}`);
        });
      }
      
      await processSlots(response.slots);
    } else {
      addLog(`⚠️ ${response?.error || 'Error'}`, 'warning');
    }
    
  } catch (error) {
    addLog(`❌ ${error.message}`, 'error');
  }
  
  // Notify popup of state update
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state }).catch(() => {});
  
  // Schedule next check
  scheduleNextCheck();
}

// Process slots
async function processSlots(slots) {
  if (!slots || slots.length === 0) {
    addLog('✓ No recent slots');
    return;
  }
  
  const currentLocations = slots.map(s => s.location);
  const isNewTrigger = JSON.stringify(currentLocations) !== JSON.stringify(state.previousLocations);
  
  addLog(`📍 Prev: [${state.previousLocations.join(', ') || 'none'}]`);
  addLog(`📍 Curr: [${currentLocations.join(', ')}]`);
  addLog(`🔄 New trigger: ${isNewTrigger ? 'YES' : 'NO'}`);
  
  if (!isNewTrigger) {
    addLog('ℹ️ Same locations - no alert');
    return;
  }
  
  state.previousLocations = currentLocations;
  await saveState();
  
  const { shouldNotify, reason } = checkPhaseConditions(slots);
  addLog(`📋 Phase ${state.phase}: ${reason}`);
  
  if (shouldNotify) {
    addLog(`🚨 ALERT TRIGGERED!`, 'alert');
    await triggerAlert(slots);
  } else {
    addLog(`⏭️ Alert skipped`, 'warning');
  }
}

function checkPhaseConditions(slots) {
  if (state.phase === 0) {
    return { shouldNotify: true, reason: 'Any slot → ALERT' };
  }
  
  // Phase 1: Only check for VAC locations
  const hasVac = slots.some(s => s.location.includes('VAC'));
  
  addLog(`   └─ Has VAC: ${hasVac ? '✓' : '✗'}`);
  
  if (!hasVac) return { shouldNotify: false, reason: 'No VAC' };
  
  return { shouldNotify: true, reason: 'VAC found → ALERT' };
}

function isValidDateRange(dateStr) {
  try {
    const upper = dateStr.toUpperCase();
    const hasJan = upper.includes('JAN');
    const hasFeb = upper.includes('FEB');
    
    if (!hasJan && !hasFeb) return false;
    
    const dayMatch = dateStr.match(/(\d+)/);
    if (!dayMatch) return false;
    const day = parseInt(dayMatch[1]);
    
    const yearMatch = dateStr.match(/[,\s](\d{2,4})(?:\s|$)/);
    if (!yearMatch) return false;
    let year = parseInt(yearMatch[1]);
    if (year < 100) year += 2000;
    
    if (year === 2026) {
      if (hasJan && day >= 15) return true;
      if (hasFeb) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Test alert function
async function testAlertTrigger() {
  addLog('🔔 Testing alert...', 'alert');
  
  // Create test notification
  chrome.notifications.create('visa-test-' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '🔔 TEST ALERT',
    message: 'This is a test notification. Sound should play!',
    priority: 2,
    requireInteraction: false,
    silent: false
  });
  
  // Play sound
  await playAlertSound();
  addLog('✓ Sound played!', 'success');
  
  // Send test email
  if (userEmail) {
    addLog(`📧 Sending test email to ${userEmail}...`);
    const emailSent = await sendEmailNotification(
      'TEST: Visa Slot Monitor',
      'This is a test email from Visa Slot Monitor. If you received this, email notifications are working!',
      true
    );
    if (emailSent) {
      addLog('✓ Test email sent!', 'success');
    }
  } else {
    addLog('⚠️ No email configured', 'warning');
  }
}

// Trigger alert with notification and sound
async function triggerAlert(slots) {
  const locations = slots.map(s => s.location).join(', ');
  const slotDetails = slots.map(s => 
    `• ${s.location}: ${s.earliestDate} (${s.totalDates} dates) - ${s.relativeTime}`
  ).join('\n');
  
  // Create notification with sound
  chrome.notifications.create('visa-alert-' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '🚨 VISA SLOT FOUND!',
    message: `Found ${slots.length} slot(s): ${locations}`,
    priority: 2,
    requireInteraction: true,
    silent: false  // This enables notification sound
  });
  
  // Play sound
  await playAlertSound();
  
  // Send email notification
  if (userEmail) {
    addLog(`📧 Sending email to ${userEmail}...`);
    const subject = `🚨 VISA SLOT ALERT: ${slots.length} slot(s) found!`;
    const body = `
VISA SLOT FOUND!

Locations: ${locations}

Details:
${slotDetails}

Check now: ${CONFIG.URL}

Time: ${new Date().toLocaleString()}
    `.trim();
    
    const emailSent = await sendEmailNotification(subject, body, false);
    if (emailSent) {
      addLog('✓ Email sent!', 'success');
    }
  }
}

// Send email notification using EmailJS
async function sendEmailNotification(subject, body, isTest = false) {
  if (!userEmail) {
    addLog('⚠️ No email address configured', 'warning');
    return false;
  }
  
  if (!EMAILJS_CONFIG.serviceId || EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID') {
    addLog('⚠️ EmailJS not configured by developer', 'warning');
    return false;
  }
  
  try {
    // Using EmailJS REST API
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_CONFIG.serviceId,
        template_id: EMAILJS_CONFIG.templateId,
        user_id: EMAILJS_CONFIG.publicKey,
        template_params: {
          to_email: userEmail,
          subject: subject,
          message: body,
          is_test: isTest ? 'Yes' : 'No'
        }
      })
    });
    
    if (response.ok) {
      return true;
    } else {
      const errorText = await response.text();
      addLog(`⚠️ Email failed: ${errorText}`, 'warning');
      return false;
    }
  } catch (error) {
    addLog(`⚠️ Email error: ${error.message}`, 'warning');
    return false;
  }
}

// Play sound using offscreen document
async function playAlertSound() {
  try {
    // Check if we already have an offscreen document
    let hasOffscreen = false;
    try {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      hasOffscreen = existingContexts.length > 0;
    } catch (e) {
      // getContexts not available
    }
    
    if (!hasOffscreen) {
      // Create offscreen document for audio
      try {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'Play alert sound when visa slot is found'
        });
      } catch (e) {
        console.log('Could not create offscreen document:', e);
      }
    }
    
    // Send message to play sound
    chrome.runtime.sendMessage({ type: 'PLAY_SOUND' }).catch(() => {});
    
    // Also create notification with sound as fallback
    chrome.notifications.create('sound-alert-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🔊 Alert Sound',
      message: 'Playing alert...',
      priority: 2,
      silent: false
    });
    
    addLog('🔊 Sound alert triggered');
    
  } catch (e) {
    console.log('Sound error:', e);
  }
}

// Handle tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.tabId) {
    addLog('⚠️ Monitor tab was closed', 'warning');
    state.tabId = null;
    state.isRunning = false;
    saveState();
    chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state }).catch(() => {});
  }
});

// Keep service worker alive
setInterval(() => {
  if (state.isRunning) {
    console.log('[VSM] Heartbeat - running');
  }
}, 20000);
