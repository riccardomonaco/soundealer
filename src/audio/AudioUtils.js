/**
 * AudioUtils.js
 * DSP & Math helpers.
 */

// ===========================================================================
// 1. CONSTANTS
// ===========================================================================

/** @type {Object.<string, Array>} Local cache of sound banks */
export let soundBanks = {};

/** @type {number[]} Standard EQ Frequencies */
export const eqBands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// ===========================================================================
// 2. WAV & BUFFER 
// ===========================================================================

/**
 * Converts an AudioBuffer to a WAV formatted Blob.
 * @param {AudioBuffer} abuffer - The source audio buffer.
 * @param {number} [len] - Optional override for length.
 * @returns {Blob} The WAV file.
 */
export function bufferToWave(abuffer, len) {
  const numOfChan = abuffer.numberOfChannels;
  const length = len || abuffer.length;
  const lengthInBytes = length * numOfChan * 2;
  const buffer = new ArrayBuffer(44 + lengthInBytes);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // writing WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + lengthInBytes, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, abuffer.sampleRate, true);
  view.setUint32(28, abuffer.sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, lengthInBytes, true);

  // writing PCM data
  const dataView = new Int16Array(buffer, 44, length * numOfChan);
  const channels = [];
  for (let i = 0; i < numOfChan; i++) channels.push(abuffer.getChannelData(i));

  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let sample = channels[ch][i];
      // soft clipping to avoid digital distortion
      sample = Math.max(-1, Math.min(1, sample));
      // 16-bit conversion
      dataView[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Slices an AudioBuffer without affecting the original.
 * @param {AudioBuffer} buffer 
 * @param {number} startRatio 0.0 to 1.0
 * @param {number} endRatio 0.0 to 1.0
 * @param {AudioContext} context 
 * @returns {AudioBuffer|null}
 */
export function sliceBuffer(buffer, startRatio, endRatio, context) {
  const startFrame = Math.floor(startRatio * buffer.length);
  const endFrame = Math.floor(endRatio * buffer.length);
  const frameCount = endFrame - startFrame;

  if (frameCount <= 0) return null;

  const newBuffer = context.createBuffer(buffer.numberOfChannels, frameCount, buffer.sampleRate);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    newBuffer.copyToChannel(buffer.getChannelData(i).slice(startFrame, endFrame), i);
  }

  return newBuffer;
}

// ===========================================================================
// 3. DSP & MATH
// ===========================================================================

/**
 * Generates a sigmoid distortion curve.
 * @param {number} amount - Intensity of distortion.
 * @returns {Float32Array}
 */
export function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Applies Bit Reduction and Sample Rate Reduction (Downsampling).
 * Done purely via math loop for offline rendering accuracy.
 * @param {AudioBuffer} buffer 
 * @param {number} bits - Target bit depth
 * @param {number} normFreq - Normalized frequency (1 = full, 0.1 = decimated)
 * @returns {AudioBuffer}
 */
function applyMathBitcrush(buffer, bits, normFreq) {
  const channels = buffer.numberOfChannels;
  const len = buffer.length;
  const step = 1 / Math.pow(2, bits);
  const stepScale = 1 / step;
  const stepSize = Math.floor(1 / normFreq);

  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    let lastSample = 0;

    for (let i = 0; i < len; i++) {
      if (i % stepSize === 0) {
        let sample = data[i];
        sample = Math.round(sample * stepScale) * step;
        lastSample = sample;
      }
      data[i] = lastSample; // Sample & Hold
    }
  }
  return buffer;
}

// ===========================================================================
// 4. OFFLINE EFFECTS PROCESSING
// ===========================================================================

/**
 * Reverses a specific time range within a buffer.
 * @param {AudioBuffer} buffer 
 * @param {number} startTime 
 * @param {number} endTime 
 * @param {AudioContext} context 
 * @returns {AudioBuffer} New buffer with reversed section
 */
export function reverseRange(buffer, startTime, endTime, context) {
  const numChannels = buffer.numberOfChannels;
  const newBuffer = context.createBuffer(numChannels, buffer.length, buffer.sampleRate);
  const startFrame = Math.floor(startTime * buffer.sampleRate);
  const endFrame = Math.floor(endTime * buffer.sampleRate);

  for (let i = 0; i < numChannels; i++) {
    const originalData = buffer.getChannelData(i);
    const newData = newBuffer.getChannelData(i);
    newData.set(originalData);

    if (endFrame > startFrame) {
      const segment = newData.subarray(startFrame, endFrame);
      segment.reverse();
    }
  }
  return newBuffer;
}

/**
 * Renders complex time-based or non-linear effects using OfflineAudioContext.
 * This "freezes" the effect into the audio data.
 * @param {AudioBuffer} originalBuffer 
 * @param {number} regionStart 
 * @param {number} regionEnd 
 * @param {string} effectType 
 * @param {Object} params 
 * @returns {Promise<AudioBuffer>}
 */
export async function renderOfflineEffect(originalBuffer, regionStart, regionEnd, effectType, params) {
  const sampleRate = originalBuffer.sampleRate;
  const channels = originalBuffer.numberOfChannels;

  // calculating precise frames
  const startFrame = Math.floor(regionStart * sampleRate);
  const endFrame = Math.floor(regionEnd * sampleRate);
  const lengthFrame = endFrame - startFrame;

  if (lengthFrame <= 0) return originalBuffer;

  // setupping offline context
  const clipCtx = new OfflineAudioContext(channels, lengthFrame, sampleRate);
  const clipSource = clipCtx.createBufferSource();

  // extracting clip
  const tempBuffer = clipCtx.createBuffer(channels, lengthFrame, sampleRate);
  for (let c = 0; c < channels; c++) {
    tempBuffer.copyToChannel(originalBuffer.getChannelData(c).slice(startFrame, endFrame), c);
  }
  clipSource.buffer = tempBuffer;

  // building graph
  let inputNode = clipSource;
  let endNode = clipCtx.destination;

  if (effectType === 'distortion') {
    const dist = clipCtx.createWaveShaper();
    dist.curve = makeDistortionCurve(params.amount);
    dist.oversample = '4x';
    inputNode.connect(dist);
    dist.connect(endNode);
  }
  else if (effectType === 'delay') {
    const delay = clipCtx.createDelay();
    delay.delayTime.value = params.time || 0.3;

    const feedback = clipCtx.createGain();
    feedback.gain.value = params.feedback || 0.5;

    inputNode.connect(endNode); // Dry
    inputNode.connect(delay);   // Wet
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(endNode);
  }
  else if (effectType === 'bitcrush') {
    inputNode.connect(endNode);
  }

  // rendering
  clipSource.start(0);
  let processedClip = await clipCtx.startRendering();

  // post-processing (Bitcrush)
  if (effectType === 'bitcrush') {
    processedClip = applyMathBitcrush(processedClip, params.bits || 8, params.normFreq || 0.5);
  }

  // merging back 
  const finalBuffer = new OfflineAudioContext(channels, originalBuffer.length, sampleRate).createBuffer(channels, originalBuffer.length, sampleRate);

  for (let c = 0; c < channels; c++) {
    const data = finalBuffer.getChannelData(c);
    data.set(originalBuffer.getChannelData(c));
    data.set(processedClip.getChannelData(c), startFrame); 
  }

  return finalBuffer;
}

/**
 * Main Router for processing ranges.
 * Dispatches to Sync (Reverse) or Async (OfflineContext) handlers.
 */
export async function processRange(buffer, context, type, startTime, endTime, params = {}) {
  if (type === 'reverse') {
    return reverseRange(buffer, startTime, endTime, context);
  }

  if (['distortion', 'delay', 'bitcrush'].includes(type)) {
    return await renderOfflineEffect(buffer, startTime, endTime, type, params);
  }

  return buffer;
}

