/**
 * main.js
 * Entry point for the whole engine.
 * Handling the boot sequence and audio context unlocking.
 */

import { createPageDefault } from "./ui/Ui.js";
import AudioPlayer from "./audio/AudioPlayer.js";
import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase.js";
import { bankService } from "./services/BankService.js";
import "../node_modules/pixelarticons/fonts/pixelart-icons-font.css"

let audioPlayer;

/** 
 * Initializes the application flow.
 * Handles the async sequence: Auth -> Data -> UI -> Audio. 
 */
async function initApp() {

  try {
    // signing in anonymously to allow firestore and storage access
    await signInAnonymously(auth);
    console.log("Logged in as:", auth.currentUser.uid);

    // loading all banks into local cache before rendering
    await bankService.loadAll();
    console.log("Banks loaded!");

    // building the user interface and dom structure
    createPageDefault();

    // instantiating the main audio engine
    audioPlayer = new AudioPlayer();

    // bypassing browser autoplay policies by resuming context on user gesture
    const unlockAudio = async () => {
      if (audioPlayer) {
        // initializing audio context and clearing the listener
        await audioPlayer.initAudio();
        audioPlayer.drawMeter();
        console.log("Audio Context Unlocked:", audioPlayer.audioContext.state);
        window.removeEventListener("click", unlockAudio);
      }
    };

    // listening for the first click to trigger the audio startup
    window.addEventListener("click", unlockAudio);
  } catch (error) {
    // catching boot errors and alerting the user
    console.error("Initialization failed:", error);
    alert("Errore di connessione al Database. Controlla la console.");
  }
}

// triggering init when dom is fully loaded
document.addEventListener("DOMContentLoaded", initApp);