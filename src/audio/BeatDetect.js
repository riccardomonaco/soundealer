/**
 * Beat detection library
 * Analyzes audio buffer to find peaks and estimate BPM.
 * Based on the work of Joe Sullivan and José M. Pérez.
 */
class BeatDetect {
  constructor(options) {
    // API Check
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    
    if (!window.AudioContext || !window.OfflineContext) {
      console.error(`BeatDetect.ERROR : Browser does not support WebAudio API.`);
      return; 
    }

    // Settings
    this.VERSION = '1.0.0';
    this._log = options.log || false;
    this._sampleRate = options.sampleRate || 44100;
    this._lowPassFreq = options.lowPassFreq || 150;
    this._highPassFreq = options.highPassFreq || 100;
    this._bpmRange = options.bpmRange || [90, 180];
    
    // Tap BPM State
		this.count = 0;
		this._ts = { current: 0, previous: 0, first: 0 };
		this._tapResetId = -1;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Analyzes an audio file from URL to find BPM.
   * @param {Object} options { url: string, name?: string }
   * @returns {Promise<Object>} { bpm, offset, firstBar }
   */
  getBeatInfo(options) {
    return new Promise((resolve, reject) => {
      this._fetchRawTrack(options)
        .then(this._buildOfflineCtx.bind(this))
        .then(this._processRenderedBuffer.bind(this))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Attaches Tap BPM logic to a DOM element.
   * @param {Object} options { element, callback }
   */
  tapBpm(options) {
		options.element.addEventListener('click', this._tapBpm.bind(this, options), false);
	}

  // ===========================================================================
  // INTERNAL PIPELINE
  // ===========================================================================

  _fetchRawTrack(options) {
    this._logEvent('log', `Fetching track ${options.name || ''}`);
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', options.url, true);
      request.responseType = 'arraybuffer';
      request.onload = () => resolve(Object.assign(request, options));
      request.onerror = reject;
      request.send();
    });
  }

  _buildOfflineCtx(options) {
    this._logEvent('log', 'Rendering Offline for analysis...');
    return new Promise((resolve, reject) => {
      const audioCtx = new AudioContext();
      
      audioCtx.decodeAudioData(options.response, buffer => {
        // Create context just for the Low end
        const offlineCtx = new window.OfflineContext(2, buffer.duration * this._sampleRate, this._sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;

        // Lowpass + Highpass to isolate Kick/Snare region
        const lowpass = offlineCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = this._lowPassFreq;
        lowpass.Q.value = 1;

        const highpass = offlineCtx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = this._highPassFreq;
        highpass.Q.value = 1;

        source.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(offlineCtx.destination);
        
        source.start(0);
        offlineCtx.startRendering();
        
        offlineCtx.oncomplete = result => resolve(Object.assign(result, options));
        offlineCtx.onerror = reject;
      });
    });
  }

  _processRenderedBuffer(options) {
    this._logEvent('log', 'Collecting beat info...');
    return new Promise(resolve => {
      const dataL = options.renderedBuffer.getChannelData(0);
      const dataR = options.renderedBuffer.getChannelData(1);
      
      // 1. Find Peaks
      const peaks = this._getPeaks([dataL, dataR]);
      
      // 2. Group Peaks into Intervals
      const groups = this._getIntervals(peaks);
      
      // 3. Sort by occurrence count
      const top = groups.sort((intA, intB) => intB.count - intA.count).splice(0, 5); 

      resolve({
        bpm: top[0].tempo,
        // Additional offset logic could go here
      });
    });
  }

  // ===========================================================================
  // MATH & ALGORITHMS
  // ===========================================================================

  _getPeaks(data) {
    const partSize = this._sampleRate / 2;
    const parts = data[0].length / partSize;
    let peaks = [];

    // Divide audio into parts and find max volume in each
    for (let i = 0; i < parts; ++i) {
      let max = 0;
      for (let j = i * partSize; j < (i + 1) * partSize; ++j) {
        const volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
        if (!max || (volume > max.volume)) {
          max = { position: j, volume: volume };
        }
      }
      peaks.push(max);
    }

    // Sort by volume and take top 50%
    peaks.sort((a, b) => b.volume - a.volume);
    peaks = peaks.splice(0, peaks.length * 0.5);
    
    // Re-sort by time (position)
    peaks.sort((a, b) => a.position - b.position);
    return peaks;
  }

  _getIntervals(peaks) {
    const groups = [];
    peaks.forEach((peak, index) => {
      // Compare with next 10 peaks
      for (let i = 1; (index + i) < peaks.length && i < 10; ++i) {
        const group = {
          tempo: (60 * this._sampleRate) / (peaks[index + i].position - peak.position),
          count: 1,
          peaks: []
        };

        // Normalize BPM to range
        while (group.tempo <= this._bpmRange[0]) group.tempo *= 2;
        while (group.tempo > this._bpmRange[1]) group.tempo /= 2;
        
        group.tempo = Math.round(group.tempo);

        // Check if this tempo group exists
        const exists = groups.some(interval => {
          if (interval.tempo === group.tempo) {
            interval.peaks.push(peak);
            ++interval.count;
            return true;
          }
          return false;
        });

        if (!exists) groups.push(group);
      }
    });
    return groups;
  }

	_tapBpm(options) {
		window.clearTimeout(this._tapResetId);

		this._ts.current = Date.now();
		if (this._ts.first === 0) {
			this._ts.first = this._ts.current;
		}

		if (this._ts.previous !== 0) {
			let bpm = 60000 * this.count / (this._ts.current - this._ts.first);
      // Simple smoothing
			options.callback(Math.round(bpm));
		}

		this._ts.previous = this._ts.current;
		++this.count;

    // Reset after 5s of inactivity
		this._tapResetId = window.setTimeout(() => {
			this.count = 0;
			this._ts.current = 0;
			this._ts.previous = 0;
			this._ts.first = 0;
			options.callback('--');
		}, 5000);
	}

  _logEvent(level, string) {
    if (this._log) console[level](`BeatDetect : ${string}`);
  }
}

export default BeatDetect;