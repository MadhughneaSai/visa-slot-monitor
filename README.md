# 🔍 Visa Slot Monitor

A Chrome extension that monitors H-1B visa slot availability on checkvisaslots.com and sends instant alerts when slots become available.

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow)

## ✨ Features

- **Real-time Monitoring** - Automatically checks for new visa slots
- **Background Alerts** - Runs even when the popup is closed
- **Email Notifications** - Get instant email alerts when slots are found
- **Voice Alerts** - Audio notification with "Slots found" voice announcement
- **Two Modes:**
  - ⚡ **Fast Mode** - Checks every 10 seconds (use for max 30 mins)
  - 🐢 **Slow Mode** - Random 1-60 second intervals (safer, recommended)
- **Two Phases:**
  - **Both Slots** - Alert on any slot
  - **Only Biometric** - Alert only for VAC locations

## 📦 Installation

1. **Download ZIP:** Click the green **"Code"** button above → **"Download ZIP"**

2. **Extract:** Unzip the downloaded file

3. **Open Chrome:** Go to `chrome://extensions/`

4. **Enable Developer Mode:** Toggle the switch in the top-right corner

5. **Load Extension:** Click **"Load unpacked"** → Select the extracted folder

6. **Pin it:** Click the puzzle icon 🧩 in Chrome toolbar → Pin "Visa Slot Monitor"

✅ **Done!** Click the extension icon to start.

### 🎬 Video Guide

<a href="https://youtu.be/odOWI37qYmw" target="_blank">
  <img src="https://img.youtube.com/vi/odOWI37qYmw/maxresdefault.jpg" alt="Watch Installation Video" width="600">
</a>

**👆 Click to watch the installation video**

## 🚀 Quick Start

1. **Click the extension icon** in your toolbar
2. **Read the instructions** popup and click OK
3. **Enter your email** and click Save
4. **Click "Test Alert"** to verify sound and email work
5. **Select your mode** (Slow recommended)
6. **Select your phase** (Both Slots or Only Biometric)
7. **Click "Start Monitoring"**

That's it! The extension will run in the background and alert you when slots are found.

## ⚙️ Configuration

### Modes

| Mode | Interval | Best For |
|------|----------|----------|
| ⚡ Fast | Every 10 seconds | Active monitoring (max 30 mins) |
| 🐢 Slow | Random 1-60 seconds | Long-term monitoring |

### Phases

| Phase | Alerts When |
|-------|-------------|
| Both Slots | Any recent slot detected |
| Only Biometric | Only VAC locations detected |

## 📧 Email Setup

Email notifications are pre-configured. Simply:
1. Enter your email address
2. Click Save
3. Click "Test Alert" to verify

## ⚠️ Important Notes

- **Fast Mode Warning:** Don't use for more than 30 minutes continuously - may trigger bot detection
- **Keep a tab open:** The extension opens a background tab for monitoring
- **Email limits:** Free tier allows ~200 emails/month (shared)

## 🛠️ Technical Details

- **Manifest Version:** 3
- **Permissions:** storage, alarms, notifications, tabs, scripting, offscreen
- **Monitored URL:** checkvisaslots.com

## 📁 Project Structure

```
visa-slot-extension/
├── manifest.json       # Extension configuration
├── popup.html          # UI layout
├── popup.js            # UI logic
├── background.js       # Background monitoring service
├── content.js          # Page scraping script
├── offscreen.html      # Audio playback document
├── offscreen.js        # Voice/sound alerts
├── styles.css          # Styling
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [checkvisaslots.com](https://checkvisaslots.com) for visa slot data
- [EmailJS](https://www.emailjs.com/) for email notifications

## 📞 Support

If you encounter any issues, please open a GitHub issue.

---

**⭐ If this helped you get a visa slot, consider giving it a star!**

