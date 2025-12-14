// Content Script - Runs on checkvisaslots.com
// This script monitors the page directly, avoiding rate limiting

console.log('[VSM] Content script loaded');

const CONFIG = {
  VALID_LOCATIONS: [
    'CHENNAI', 'CHENNAI VAC',
    'HYDERABAD', 'HYDERABAD VAC',
    'KOLKATA', 'KOLKATA VAC',
    'MUMBAI', 'MUMBAI VAC',
    'NEW DELHI', 'NEW DELHI VAC',
    'DELHI', 'DELHI VAC'
  ]
};

// Time patterns
const FAST_MODE_PATTERNS = [];
const SLOW_MODE_PATTERNS = [];

for (let i = 1; i <= 59; i++) {
  const pattern = i === 1 ? '1 second ago' : `${i} seconds ago`;
  FAST_MODE_PATTERNS.push(pattern);
  SLOW_MODE_PATTERNS.push(pattern);
}
SLOW_MODE_PATTERNS.push('1 minute ago');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'SCRAPE_PAGE') {
      const result = scrapePage(message.mode);
      sendResponse(result);
    }
  } catch (e) {
    sendResponse({ success: false, error: e.message, slots: [] });
  }
  return true;
});

function scrapePage(mode) {
  const slots = [];
  const patterns = mode === 'SLOW' ? SLOW_MODE_PATTERNS : FAST_MODE_PATTERNS;
  
  try {
    // Find H-1B section heading
    const allElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p, strong');
    let h1bHeading = null;
    
    for (const el of allElements) {
      const text = el.textContent.trim();
      if (text === 'Last H-1B (Regular) Availability' && text.length < 50) {
        h1bHeading = el;
        break;
      }
    }
    
    if (!h1bHeading) {
      return { success: false, error: 'H-1B section not found', slots: [] };
    }
    
    // Find the table
    let table = null;
    let current = h1bHeading.nextElementSibling;
    
    // Search siblings
    for (let i = 0; i < 10 && current; i++) {
      if (current.tagName === 'TABLE') {
        table = current;
        break;
      }
      const innerTable = current.querySelector('table');
      if (innerTable) {
        table = innerTable;
        break;
      }
      current = current.nextElementSibling;
    }
    
    // If not found in siblings, try parent's children
    if (!table) {
      const parent = h1bHeading.parentElement;
      if (parent) {
        table = parent.querySelector('table');
      }
    }
    
    // Try finding any table containing Indian locations as fallback
    if (!table) {
      const allTables = document.querySelectorAll('table');
      for (const t of allTables) {
        if (t.textContent.includes('CHENNAI') || t.textContent.includes('MUMBAI')) {
          table = t;
          break;
        }
      }
    }
    
    if (!table) {
      return { success: false, error: 'H-1B table not found', slots: [] };
    }
    
    // Parse the table
    const rows = table.querySelectorAll('tr');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const location = cells[0].textContent.trim().toUpperCase();
        const earliestDate = cells.length >= 3 ? cells[2].textContent.trim() : '';
        const totalDates = cells.length >= 4 ? cells[3].textContent.trim() : '';
        const relativeTime = cells[cells.length - 1].textContent.trim();
        
        // Skip invalid locations
        if (!CONFIG.VALID_LOCATIONS.includes(location)) {
          continue;
        }
        
        // Check if time matches patterns
        if (patterns.includes(relativeTime)) {
          slots.push({
            location,
            earliestDate,
            totalDates,
            relativeTime
          });
        }
      }
    }
    
    return { success: true, slots, pageTitle: document.title };
    
  } catch (error) {
    return { success: false, error: error.message, slots: [] };
  }
}

// Auto-report when page loads (with error handling)
setTimeout(() => {
  try {
    chrome.runtime.sendMessage({ type: 'CONTENT_READY', url: window.location.href });
  } catch (e) {
    // Extension context invalidated - this is normal after extension reload
  }
}, 1000);
