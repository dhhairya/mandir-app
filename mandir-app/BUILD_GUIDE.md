# 🛕 Mandir Receipt Manager — APK Build Guide

## What's in this package

```
mandir-app/
├── www/                  ← Mobile frontend (HTML + CSS + JS)
│   ├── index.html        ← Mobile-adapted UI with bottom navigation
│   ├── styles.css        ← Original styles
│   └── app.js            ← Original app logic
├── backend/              ← Node.js backend server
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── capacitor.config.json ← Capacitor app configuration
├── package.json          ← App dependencies
└── BUILD_GUIDE.md        ← This file
```

---

## Prerequisites (install these once)

| Tool | Download |
|------|----------|
| **Node.js** (v18+) | https://nodejs.org |
| **Android Studio** | https://developer.android.com/studio |
| **Java JDK 17** | Installed automatically with Android Studio |

---

## Step 1 — Install Android Studio

1. Download and install Android Studio from the link above
2. On first launch, go through the setup wizard (it installs the Android SDK automatically)
3. In Android Studio → **SDK Manager** → install:
   - Android SDK Platform 34 (Android 14)
   - Android SDK Build-Tools 34.0.0
   - Android Emulator (optional, for testing without a phone)

4. Set environment variables (add to your `~/.bashrc` or Windows System Environment):

   **Windows:**
   ```
   ANDROID_HOME = C:\Users\YourName\AppData\Local\Android\Sdk
   Add to PATH: %ANDROID_HOME%\tools  and  %ANDROID_HOME%\platform-tools
   ```

   **Mac/Linux:**
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk   # Mac
   export ANDROID_HOME=$HOME/Android/Sdk            # Linux
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

---

## Step 2 — Build the APK

Open a terminal inside the `mandir-app/` folder and run:

```bash
# 1. Install Capacitor dependencies
npm install

# 2. Add Android platform (creates the android/ folder)
npx cap add android

# 3. Sync web files into the Android project
npx cap sync

# 4. Build the APK
cd android
./gradlew assembleDebug         # Mac/Linux
gradlew.bat assembleDebug       # Windows
```

✅ Your APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 3 — Install on your Android phone

**Option A — USB:**
1. On your phone: Settings → Developer Options → Enable USB Debugging
2. Connect phone via USB
3. Run: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

**Option B — File transfer:**
1. Copy `app-debug.apk` to your phone (WhatsApp, Google Drive, USB cable, etc.)
2. On your phone, open the file → Allow installation from unknown sources → Install

---

## Step 4 — Use the app

### Core features (no backend needed)
- Create receipts using default fields ✅
- View dashboard and history ✅
- Export CSV ✅
- Print / share receipts ✅
- Works fully offline ✅

### AI template scanning (optional, needs backend)
The AI scan feature (photo → auto-detect fields) requires the backend server running on a PC on the same Wi-Fi network.

**To run the backend:**
```bash
cd backend/
npm install
cp .env.example .env
# Edit .env — add your Anthropic API key
node server.js
# Server runs on port 3000
```

**In the app:**
1. Go to Settings (or the "Backend Server" section in New Receipt)
2. Enter your PC's local IP: `http://192.168.1.XX:3000`
   - Find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Tap Save

---

## Build a Release APK (for distribution)

For a release-signed APK (smaller, faster, no "debug" label):

```bash
# Generate a keystore (one-time)
keytool -genkey -v -keystore mandir-release.keystore -alias mandir -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
cd android
./gradlew assembleRelease

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore ../mandir-release.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk mandir

# Align (optional but recommended)
zipalign -v 4 app/build/outputs/apk/release/app-release-unsigned.apk mandir-release.apk
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ANDROID_HOME not set` | Set the environment variable (Step 1) |
| `SDK not found` | Open Android Studio → SDK Manager → install SDK 34 |
| `gradlew: permission denied` | Run `chmod +x android/gradlew` |
| `Could not resolve @capacitor/android` | Run `npm install` again with internet connection |
| App shows blank screen | Check `www/index.html` exists; run `npx cap sync` again |
| AI scan not working | Make sure backend is running and IP is correct; both devices on same Wi-Fi |

---

## Quick command reference

```bash
# After changing www/ files, re-sync to Android:
npx cap sync

# Open in Android Studio (to run on emulator):
npx cap open android

# Run directly on connected device:
npx cap run android
```
