# SOUNDEALER | Web-based Audio Sampler & DSP

**SOUNDEALER** is a browser-based audio sampling workstation designed for real-time DSP processing, and cloud-synced sample management. The engine uses the **Web Audio API** for high-fidelity rendering and **Wavesurfer.js** for an interactive waveform interface.

<img width="1919" height="944" alt="Screenshot 2026-01-14 200729" src="https://github.com/user-attachments/assets/fc19be95-a64d-4000-885a-0866af41aac6" />




---

## Live Demo
Try the sampler live at: **[https://soundealer.web.app/](https://soundealer.web.app/)**

---

## Core Features

### 1. Waveform Manipulation
* **Trimming:** A dual-curtain system for trimming of the original buffer with dynamic reloading.
* **Region-Based FX:** Isolate audio portions to apply effects like reverse or distortion without affecting the global file.
* **Dynamic Zoom:** Waveform navigation via scroll for editing of transients and start points.

<img width="1080" height="638" alt="image" src="https://github.com/user-attachments/assets/b9bfdeaa-2a8b-4848-9f22-bd43ab27703b" />


### 2. DSP & Effects Engine (Real-time & Offline)
The sampler utilizes a flexible signal chain: `Source -> Preview FX -> 10-Band EQ -> Master Gain`.
* **Bitcrusher:** Custom algorithm for bit-depth reduction and sample rate decimation.
* **Analog Distortion:** Saturation curve for harmonic warmth.
* **Feedback Delay:** Delay line with adjustable feedback and time parameters.
* **Graphic EQ:** 10-band equalizer (32Hz - 16kHz) for frequency shaping.
* **The "Freeze" Mechanic:** Commit real-time effects and local gain permanently into the audio buffer using an `OfflineAudioContext`.

<img width="1340" height="878" alt="image" src="https://github.com/user-attachments/assets/e0307f48-47e5-4411-b65e-bff72a685398" />


### 3. Cloud Integration & BPM Tools
* **Firebase Backend:** Metadata storage via Firestore and binary storage via Firebase Cloud Storage.
* **BPM Analysis:** Automatic BPM detection via `BeatDetect.js` and Tap-Tempo logic.
* **Drag & Drop Workflow:** Load local files or samples directly from soundbanks into the player.

---

## Project Structure

* **Core Logic:** JavaScript (ES6+) with a modular singleton architecture.
* **Audio Engine:** Web Audio API (AudioContext, OfflineAudioContext, ScriptProcessorNode).
* **UI/UX:** Vanilla DOM & CSS3 using HSL Custom Properties for theming.
* **Bundler:** Vite.js.
* **Backend:** Firebase (Auth, Firestore, Cloud Storage).

---

## Software Architecture

The project follows a separation of concerns to ensure scalability:

* **`AudioPlayer.js`**: The central class managing the audio node graph, region events, and Wavesurfer integration.
* **`AudioUtils.js`**: The DSP class containing mathematical logic for distortion curves, 16-bit PCM WAV conversion, and buffer slicing.
* **`BankService.js`**: Data layer class handling asynchronous cloud sync and local sample caching.
* **`Ui.js`**: Dynamic GUI rendering class that builds the interface components.

---

## Getting Started

### 1. Installation
```bash
# Clone the repository
git clone [https://github.com/your-username/soundealer.git](https://github.com/your-username/soundealer.git)

# Enter the directory
cd soundealer

# Install dependencies
npm install
```

### 2. Firebase

Ensure **`src/firebase.js`** is populated with your specific API keys to enable Soundbank saving and cloud storage.

### 2. Run developement server

```bash
npm run dev
```

--- 

## Shortcuts
* **Space**: Play/Pause.
* **Double Click (Region)**: Select and Loop region.
* **Right Click (BPM LED)**: Manually input BPM value.

---

## How to use

### Select samples from soundbanks/local files and drag and drop them into the player

<img width="1919" height="945" alt="image" src="https://github.com/user-attachments/assets/a6ea2d55-fbd9-44ff-a8ab-da03a5fff470" />

### Highlight regions, drag and drop floppy disks to apply effects

<img width="1919" height="945" alt="image" src="https://github.com/user-attachments/assets/02a8eac0-18fb-4709-901b-f82f68fc43f8" />

### Draw EQ curve by holding and dragging mouse pointer over the EQ section

<img width="1064" height="620" alt="image" src="https://github.com/user-attachments/assets/abb295df-0ebc-4b97-ac84-87790ad2eebd" />

---

## Hotbar commands

<img width="1055" height="113" alt="image" src="https://github.com/user-attachments/assets/d02d71f7-c6e0-4b84-b8fc-3dba26e4dfa2" />

### PLAYBACK
* **Play**
* **Pause**
* **Stop**

### LOOP
* **Halve Loop size**
* **Toggle Looping**
* **Double Loop size**

### UTILS
* **Trim according to trim curtains**
* **Save sample into bank**
* **Download sample as WAV**
