/**
 * A Promise-based Modal system for Alerts, Confirms, and Prompts.
 * Replaces native browser alerts with custom DOM elements.
 */
class ModalSystem {
  constructor() {
    this.overlay = null;
    this.resolvePromise = null;
    this.els = {};
    
    // Bind keys globally only once
    this.setupGlobalListeners();
  }

  // ===========================================================================
  // DOM MANAGEMENT
  // ===========================================================================

  /** Initializes the Modal DOM structure if missing */
  ensureDom() {
    if (this.overlay && document.body.contains(this.overlay)) {
        return;
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    
    this.overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header" id="modal-title">SYSTEM MESSAGE</div>
        <div class="modal-body" id="modal-message"></div>
        <input type="text" class="modal-input" id="modal-input" style="display:none;">
        <div class="modal-footer" id="modal-footer"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    
    this.els = {
      title: this.overlay.querySelector('#modal-title'),
      msg: this.overlay.querySelector('#modal-message'),
      input: this.overlay.querySelector('#modal-input'),
      footer: this.overlay.querySelector('#modal-footer')
    };
  }

  setupGlobalListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.overlay || !this.overlay.classList.contains('active')) return;

      if (e.key === 'Escape') {
        this.close(null); // Cancel
      }
      if (e.key === 'Enter') {
          const confirmBtn = this.els.footer ? this.els.footer.querySelector('.btn-confirm') : null;
          if(confirmBtn) confirmBtn.click();
      }
    });
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Shows a modal.
   * @param {'alert'|'confirm'|'prompt'} type 
   * @param {string} message 
   * @param {string} [defaultValue=""] 
   * @returns {Promise<any>} Resolves with true/false or input string.
   */
  show(type, message, defaultValue = "") {
    return new Promise((resolve) => {
      this.ensureDom();

      this.resolvePromise = resolve;
      
      // Reset State
      this.els.msg.innerText = message;
      this.els.footer.innerHTML = '';
      this.els.input.style.display = 'none';
      this.els.input.value = '';

      // Configure Type
      if (type === 'alert') {
        this.els.title.innerText = "ATTENTION";
        this.createBtn("OK", "btn-confirm", () => this.close(true));
      } 
      else if (type === 'confirm') {
        this.els.title.innerText = "CONFIRMATION";
        this.createBtn("CANCEL", "btn-cancel", () => this.close(false));
        this.createBtn("YES", "btn-confirm", () => this.close(true));
      } 
      else if (type === 'prompt') {
        this.els.title.innerText = "INPUT REQUIRED";
        this.els.input.style.display = 'block';
        this.els.input.value = defaultValue;
        
        this.createBtn("CANCEL", "btn-cancel", () => this.close(null));
        this.createBtn("OK", "btn-confirm", () => this.close(this.els.input.value));
      }

      requestAnimationFrame(() => {
          this.overlay.classList.add('active');
          if(type === 'prompt') {
              setTimeout(() => {
                  this.els.input.focus();
                  this.els.input.select();
              }, 50);
          }
      });
    });
  }

  createBtn(text, className, onClick) {
    const btn = document.createElement('button');
    btn.className = `modal-btn ${className}`;
    btn.innerText = text;
    btn.onclick = onClick;
    this.els.footer.appendChild(btn);
  }

  close(value) {
    if (!this.overlay) return;
    this.overlay.classList.remove('active');
    
    if (this.resolvePromise) {
      this.resolvePromise(value);
      this.resolvePromise = null;
    }
  }
}

export const Modal = new ModalSystem();