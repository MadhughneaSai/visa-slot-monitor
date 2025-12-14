// Offscreen document for playing audio alerts with voice

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PLAY_SOUND') {
    playAlertWithVoice();
  }
});

function playAlertWithVoice() {
  try {
    const audioContext = new AudioContext();
    
    function beep(frequency, duration, delay) {
      return new Promise(resolve => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.4;
          
          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
            resolve();
          }, duration);
        }, delay);
      });
    }
    
    // Sequence: beep beep beep beep → "Slots found" → beep beep
    async function playSequence() {
      // Initial beeps
      beep(800, 150, 0);
      beep(800, 150, 200);
      beep(800, 150, 400);
      beep(800, 150, 600);
      
      // Wait then speak
      setTimeout(() => {
        speakMessage('Slots found');
        
        // Final beeps after speech
        setTimeout(() => {
          beep(800, 150, 0);
          beep(800, 150, 200);
        }, 1200);
      }, 900);
    }
    
    playSequence();
    
  } catch (e) {
    console.error('Audio error:', e);
    // Fallback to just speech
    speakMessage('Slots found');
  }
}

function speakMessage(text) {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    const voices = speechSynthesis.getVoices();
    
    // Try to find a female English voice
    const femaleVoice = voices.find(v => 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('samantha') ||
       v.name.toLowerCase().includes('victoria') ||
       v.name.toLowerCase().includes('karen') ||
       v.name.toLowerCase().includes('moira') ||
       v.name.toLowerCase().includes('tessa') ||
       v.name.toLowerCase().includes('fiona') ||
       v.name.includes('Google UK English Female') ||
       v.name.includes('Microsoft Zira'))
      && v.lang.startsWith('en')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    
    speechSynthesis.speak(utterance);
    console.log('Spoke:', text);
  } catch (e) {
    console.error('Speech error:', e);
  }
}

// Load voices (needed for some browsers)
speechSynthesis.getVoices();
