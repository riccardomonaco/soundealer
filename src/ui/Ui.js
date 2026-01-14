import { eqBands } from "../audio/AudioUtils";
import { bankService } from "../services/BankService.js";
import { Modal } from "../ui/Modal.js";

// ===========================================================================
// 1. HELPER COMPONENTS
// ===========================================================================

/**
 * Creates the hotbar commands buttons.
 *
 * @return {*} 
 */
function createCommandsButtons() {
  const container = document.createElement("div");
  container.className = "command-buttons";

  // definition of main transport buttons
  const buttons = [
    { id: "play-button", icon: "pixelart-icons-font-play" },
    { id: "pause-button", icon: "pixelart-icons-font-pause" },
    { id: "stop-button", isStop: true }
  ];

  buttons.forEach(btn => {
    const div = document.createElement("div");
    div.className = "old-button";
    div.id = btn.id;

    // using SVG for the stop square, font-icons for the others
    if (btn.isStop) {
      div.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="15" height="15" />
      </svg>
    `;
    } else {
      div.innerHTML = `<i class="${btn.icon}"></i>`;
    }

    container.appendChild(div);
  });

  return container;
}

/**
 * Creates a physical-style knob with labels and indicators.
 */
function createKnob(id, label) {
  const wrapper = document.createElement("div");
  wrapper.className = "knob-wrapper";

  const lbl = document.createElement("div");
  lbl.className = "knob-label";
  lbl.innerText = label;
  lbl.id = `label-${id}`;

  const body = document.createElement("div");
  body.className = "knob-body";
  body.id = `knob-${id}`;
  // default volume is 80% to avoid clipping on startup
  body.dataset.value = (id === 'vol') ? 0.8 : 0.0;

  const indicator = document.createElement("div");
  indicator.className = "knob-indicator";
  const startDeg = (id === 'vol') ? 81 : -135; // mapping volume start position
  indicator.style.transform = `translate(-50%, -100%) rotate(${startDeg}deg)`;

  const valDisplay = document.createElement("div");
  valDisplay.className = "knob-value";
  valDisplay.id = `val-${id}`;
  valDisplay.innerText = (id === 'vol') ? "80%" : "--";

  body.appendChild(indicator);
  wrapper.append(lbl, body, valDisplay);
  return wrapper;
}

/**
 * Generates the effects grid with draggable floppy disk icons.
 */
function createFloppyDeck() {
  const wrapper = document.createElement("div");
  wrapper.className = "fx-buttons-wrapper";

  const container = document.createElement("div");
  container.className = "fx-buttons";

  const effects = [
    { id: "reverse", img: "reverse.png", alt: "Reverse FX" },
    { id: "delay", img: "delay.png", alt: "Delay FX" },
    { id: "distortion", img: "distort.png", alt: "Distort FX" },
    { id: "bitcrush", img: "bitcrush.png", alt: "Bitcrush FX" }
  ];

  effects.forEach(fx => {
    const img = document.createElement("img");
    img.src = `./assets/img/${fx.img}`;
    img.className = "fx-img";
    img.draggable = true; // fundamental for drag&drop logic
    img.setAttribute("data-effect", fx.id);
    img.alt = fx.alt;

    img.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("effectType", fx.id);
      e.dataTransfer.effectAllowed = "copy";
    });

    container.appendChild(img);
  });

  wrapper.appendChild(container);
  return wrapper;
}

/**
 * Creates the BPM LED display.
 */
function createBpmSection() {
  const wrapper = document.createElement("div");
  wrapper.className = "bpm-led-wrapper";

  const led = document.createElement("div");
  led.id = "bpm-led";
  led.className = "bpm-led";
  led.innerText = "tap BPM";
  wrapper.appendChild(led);
  return wrapper;
}

// ===========================================================================
// 2. MAIN SECTIONS BUILDERS
// ===========================================================================

/**
 * Main Sampler UI Builder.
 * Includes Waveform, EQ Grid, and Transport controls.
 */
function createSampler() {
  const wrapper = document.createElement("div");
  wrapper.className = "sampler-wrapper";

  const sampler = document.createElement("div");
  sampler.className = "sampler border-shadow";
  sampler.id = "sample-drop";

  // Waveform Container
  const waveform = document.createElement("div");
  waveform.id = "waveform";
  const plus = document.createElement("div");
  plus.className = "plus-wrapper";
  plus.id = "plus-wrapper";
  plus.innerText = "DROP A SAMPLE...";
  waveform.appendChild(plus);

  // EQ Grid initialization
  const eqGrid = document.createElement("div");
  eqGrid.className = "eq-grid";
  eqGrid.appendChild(createEqualizer());

  sampler.append(waveform, eqGrid);

  // Commands and Transport section
  const commands = document.createElement("div");
  commands.className = "commands border-shadow";

  // Playback block
  const pbLabel = document.createElement("div"); pbLabel.className = "loop-label"; pbLabel.innerText = "PLAYBACK";
  const cmdBtns = createCommandsButtons();

  // Loop control block
  const loopLabel = document.createElement("div");
  loopLabel.className = "loop-label";
  loopLabel.innerText = "LOOP";

  const loopBtns = document.createElement("div");
  loopBtns.className = "loop-buttons";

  const loopControls = [
    { id: "d2-button", icon: "pixelart-icons-font-prev" },
    { id: "loop-button", icon: "pixelart-icons-font-reload" },
    { id: "x2-button", icon: "pixelart-icons-font-next" }
  ];

  loopControls.forEach(b => {
    const d = document.createElement("div");
    d.className = "old-button";
    d.id = b.id;
    d.innerHTML = `<i class="${b.icon}"></i>`;
    loopBtns.appendChild(d);
  });

  // Utils block (Trim, Export, Save)
  const utilsLabel = document.createElement("div");
  utilsLabel.className = "loop-label";
  utilsLabel.innerText = "UTILS";

  const utilsBtns = document.createElement("div");
  utilsBtns.className = "rec-buttons";

  // Trim tool
  const cutBtn = document.createElement("div");
  cutBtn.className = "old-button";
  cutBtn.id = "trim-btn";
  cutBtn.title = "Trim Audio";
  cutBtn.innerHTML = '<i class="pixelart-icons-font-cut"></i>';

  // WAV Export tool
  const exportBtn = document.createElement("div");
  exportBtn.className = "old-button";
  exportBtn.id = "export-btn";
  exportBtn.title = "Export to WAV";
  exportBtn.innerHTML = '<i class="pixelart-icons-font-download"></i>';

  // Bank Save tool
  const saveBtn = document.createElement("div");
  saveBtn.className = "old-button";
  saveBtn.id = "save-bank-btn";
  saveBtn.title = "Save to Current Bank";
  saveBtn.innerHTML = '<i class="pixelart-icons-font-save"></i>';

  utilsBtns.append(cutBtn, saveBtn, exportBtn);

  commands.append(pbLabel, cmdBtns, loopLabel, loopBtns, utilsLabel, utilsBtns);

  const master = document.createElement("div");
  master.className = "master-strip border-shadow";
  master.innerHTML = `
  <div class="master-label">MASTER OUT</div>
  <div class="meter-container">
    <div id="meter-fill" class="meter-fill"></div>
  </div>
  <input type="range" id="master-vol-fader" class="master-fader" min="0" max="1.5" step="0.01" value="0.8">
`;

  wrapper.append(sampler, commands);
  wrapper.append(master);

  return wrapper;
}

/**
 * Effects section builder.
 * Combines Floppy Deck, Control Knobs, and BPM LED.
 */
function createEffects() {
  const wrapper = document.createElement("div");
  wrapper.className = "effects border-shadow";

  const label = document.createElement("div");
  label.className = "fx-label";
  label.textContent = "EFFECTS";

  // 1. Floppy deck for Drag&Drop effects
  const floppyDeck = createFloppyDeck();

  // 2. Real-time parameters Knobs (initially hidden)
  const knobsRack = document.createElement("div");
  knobsRack.className = "knobs-rack hidden";
  knobsRack.id = "knobs-rack";

  knobsRack.appendChild(createKnob("p1", "PARAM 1"));
  knobsRack.appendChild(createKnob("p2", "PARAM 2"));
  knobsRack.appendChild(createKnob("vol", "FX LEVEL"));

  // 3. BPM monitor
  const bpmSection = createBpmSection();

  wrapper.append(label, floppyDeck, knobsRack, bpmSection);
  return wrapper;
}

/**
 * Creates the skeleton for the Soundbanks area.
 * Populated dynamically via BankService.
 */
function createBanksWrapper() {
  const wrapper = document.createElement("div");
  wrapper.className = "banks border-shadow";

  const menu = document.createElement("div");
  menu.className = "banks-menu";

  const label = document.createElement("div");
  label.className = "banks-label";
  label.innerText = "CHOOSE A SOUNDBANK";

  const select = document.createElement("select");
  select.name = "banks";
  select.id = "banks";
  select.className = "banks-dropdown";

  // handling bank selection and creation logic
  select.addEventListener("change", async (e) => {
    const value = e.target.value;

    // show delete button only for existing banks
    if (value && value !== "__NEW_BANK__") {
      delBtn.style.display = "flex";
    } else {
      delBtn.style.display = "none";
    }

    if (value === "__NEW_BANK__") {
      const newName = await Modal.show('prompt', "Enter new Sound Bank name:");

      if (newName && newName.trim() !== "") {
        const success = await bankService.createBank(newName);

        if (success) {
          initBankMenu();
          select.value = newName;
          createBank(newName);
        } else {
          await Modal.show('alert', "Bank already exists or invalid name.");
          select.value = "";
          delBtn.style.display = "none";
        }
      } else {
        select.value = "";
        delBtn.style.display = "none";
      }
    } else {
      createBank(value);
    }
  });

  menu.append(label, select);

  const content = document.createElement("div");
  content.className = "banks-content";

  const footer = document.createElement("div");
  footer.className = "banks-footer";

  // bank deletion button
  const delBtn = document.createElement("div");
  delBtn.id = "delete-bank-btn";
  delBtn.className = "old-button delete-bank-btn";
  delBtn.innerText = "DELETE BANK";
  delBtn.style.display = "none";

  delBtn.addEventListener("click", async () => {
    const currentBank = select.value;
    if (!currentBank || currentBank === "__NEW_BANK__") return;

    const confirmed = await Modal.show('confirm', `PERMANENTLY DELETE\n"${currentBank}"?`);

    if (confirmed) {
      const success = await bankService.deleteBank(currentBank);
      if (success) {
        initBankMenu();
        createBank(null);
        delBtn.style.display = "none";
        await Modal.show('alert', "Bank deleted successfully.");
      } else {
        await Modal.show('alert', "Error deleting bank.");
      }
    }
  });

  footer.appendChild(delBtn);

  wrapper.append(menu, content, footer);
  return wrapper;
}

// ===========================================================================
// 3. LOGIC & EXPORT (Equalizer & Bank Population)
// ===========================================================================

/**
 * Generates the vertical sliders for the Graphic EQ.
 */
export default function createEqualizer() {
  const slidersContainer = document.createElement('div');
  slidersContainer.id = "sliders-wrapper";
  slidersContainer.className = "sliders-wrapper";

  eqBands.map((e) => {
    const eqBand = document.createElement("div");
    eqBand.classList.add("eq-band");

    const slider = document.createElement("input");
    slider.classList.add("slider-eq");
    slider.type = "range";
    slider.min = -12;
    slider.max = 12;
    slider.value = 0;
    slider.step = 0.1;
    slider.style.pointerEvents = "none";

    // quick reset to 0dB
    slider.addEventListener("dblclick", () => {
      slider.value = 0;
      slider.dispatchEvent(new Event("input"));
    });

    const eqLabel = document.createElement("div");
    eqBand.classList.add("eq-label");
    eqLabel.textContent = formatFreqLabel(e);

    eqBand.appendChild(slider);
    eqBand.appendChild(eqLabel);
    slidersContainer.appendChild(eqBand);
  });
  return slidersContainer;
}

/**
 * Frequency label formatting (Hz/kHz).
 */
function formatFreqLabel(freq) {
  return freq >= 1000 ? `${freq / 1000}kHz` : `${freq} Hz`;
}

/**
 * Populates the bank content area with sample pads.
 */
export function createBank(bankName) {
  const banksContent = document.querySelector(".banks-content");
  if (!banksContent) return;

  banksContent.innerHTML = "";
  if (!bankName || bankName === "__NEW_BANK__") return;

  const samples = bankService.localCache[bankName] || [];

  samples.forEach((sample) => {
    const pad = document.createElement("div");
    pad.classList.add("sample-pad");
    pad.textContent = sample.name;
    pad.style.borderBottom = `4px solid ${sample.color}`;

    // draggable pads to load into the player
    pad.draggable = true;
    pad.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("type", "sample");
      e.dataTransfer.setData("audioUrl", sample.url);
      e.dataTransfer.effectAllowed = "copy";
    });

    // small delete button for individual pads
    const delBtn = document.createElement("div");
    delBtn.className = "pad-delete-btn";
    delBtn.innerHTML = '<i class="pixelart-icons-font-trash"></i>';
    delBtn.title = "Delete Sample";

    delBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // preventing pad selection on button press
    });

    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const confirmed = await Modal.show('confirm', `Delete "${sample.name}"?`);

      if (confirmed) {
        pad.style.opacity = "0.5";
        pad.style.pointerEvents = "none";

        try {
          await bankService.deleteSample(bankName, sample);
          createBank(bankName); // re-rendering the bank
        } catch (err) {
          console.error(err);
          alert("Errore durante l'eliminazione");
          pad.style.opacity = "1";
        }
      }
    });

    pad.appendChild(delBtn);
    banksContent.appendChild(pad);
  });

  // special '+' pad for local file upload
  const addPad = document.createElement("div");
  addPad.classList.add("sample-pad", "add-sample-pad");
  addPad.innerHTML = `<span>+</span>`;
  addPad.title = "Add Sample from Disk";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";
  fileInput.style.display = "none";

  addPad.addEventListener("click", () => {
    if (!addPad.classList.contains("loading")) {
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const originalName = file.name.replace(/\.[^/.]+$/, "");
    let chosenName = await Modal.show('prompt', "Rename your sample:", originalName);

    if (chosenName === null) {
      fileInput.value = "";
      return;
    }

    chosenName = chosenName.trim();
    if (chosenName === "") chosenName = originalName;

    // UI-friendly name truncation
    let displayName = chosenName;
    if (displayName.length > 9) {
      displayName = displayName.substring(0, 9) + ".";
    }

    addPad.classList.add("loading");
    addPad.innerHTML = `<i class="pixelart-icons-font-clock"></i>`;

    try {
      const colors = ["var(--color-red)", "var(--color-ambra)", "var(--color-green)", "var(--color-blu)"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      await bankService.addSample(bankName, displayName, file, randomColor);
      createBank(bankName);
    } catch (err) {
      console.error(err);
      alert("Upload fallito");
      addPad.classList.remove("loading");
      addPad.innerHTML = `<span>+</span>`;
    }
  });

  banksContent.appendChild(addPad);
}

/**
 * Synchronizes the dropdown menu with the BankService cache.
 */
export function initBankMenu() {
  const bankSelect = document.getElementById("banks");
  if (!bankSelect) return;

  bankSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- SELECT SOUND BANK --";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  defaultOption.hidden = true;
  bankSelect.appendChild(defaultOption);

  // loading banks from cache
  Object.keys(bankService.localCache).forEach((bankName) => {
    const option = document.createElement("option");
    option.value = bankName;
    option.textContent = bankName;
    bankSelect.appendChild(option);
  });

  // footer option for creating new banks
  const addOption = document.createElement("option");
  addOption.value = "__NEW_BANK__";
  addOption.textContent = "+ CREATE NEW BANK";
  addOption.style.fontWeight = "bold";
  addOption.style.color = "var(--color-green)";
  bankSelect.appendChild(addOption);
}

/**
 * creating the info section with tutorial text.
 * handling the toggle logic for the info overlay.
 */
function createInfoSection() {
  const wrapper = document.createElement("div");
  wrapper.className = "info-wrapper";

  // creating the info button (the "i")
  const infoBtn = document.createElement("div");
  infoBtn.className = "info-btn";
  infoBtn.id = "info-btn";
  infoBtn.innerHTML = '<i class="pixelart-icons-font-info-box"></i>';

  // creating the hidden content panel
  const infoPanel = document.createElement("div");
  infoPanel.className = "info-panel border-shadow hidden";
  infoPanel.id = "info-panel";

  infoPanel.innerHTML = `
    <div class="info-header">QUICK TUTORIAL</div>
    <div class="info-body">
      <p>> Select a Sound Bank, drag 'n drop sample to load it.</p>
      <p>> Highlight regions, drag 'n drop floppies to apply effects, use lateral curtains to define trim.</p>
      <p>> Double click to select and loop region.</p>
      <p>> Tap or insert BPM.</p>
      <hr class="info-divider">
      <div class="info-item"><i class="pixelart-icons-font-reload"></i> <span> toggle loop mode</span></div>
      <div class="info-item"><i class="pixelart-icons-font-prev"></i> <span> halve loop length</span></div>
      <div class="info-item"><i class="pixelart-icons-font-next"></i> <span> double loop length</span></div>
      <div class="info-item"><i class="pixelart-icons-font-cut"></i> <span> trim to curtains</span></div>
      <div class="info-item"><i class="pixelart-icons-font-save"></i> <span> save to current bank</span></div>
      <div class="info-item"><i class="pixelart-icons-font-download"></i> <span> export wav file</span></div>
      <div class="info-item"><i class="pixelart-icons-font-trash"></i> <span> delete sample</span></div>

    </div>
  `;

  // toggling visibility on click
  infoBtn.addEventListener("click", () => {
    infoPanel.classList.toggle("hidden");
    infoBtn.classList.toggle("active");
  });

  wrapper.append(infoBtn, infoPanel);
  return wrapper;
}

// ===========================================================================
// MAIN BUILDER
// ===========================================================================

/**
 * Main application UI entry point.
 */
export function createPageDefault() {
  const wrapper = document.createElement("div");
  wrapper.className = "wrapper";

  wrapper.appendChild(createSampler());
  wrapper.appendChild(createEffects());
  wrapper.appendChild(createBanksWrapper());
  wrapper.appendChild(createInfoSection());

  const root = document.getElementById("root") || document.body;
  root.innerHTML = "";
  root.appendChild(wrapper);

  initBankMenu();
}