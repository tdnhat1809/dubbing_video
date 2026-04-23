/**
 * Canvas Video Exporter - WYSIWYG video export using HTML5 Canvas + MediaRecorder
 * Captures video frames with overlaid subtitles, blur, and logo - exactly like the preview.
 */

export class CanvasVideoExporter {
  constructor({
    videoElement,        // <video> DOM element
    subtitles = [],      // Array of {start, end, original, translation}
    settings = {},       // {fontFamily, fontStyle, textColor, borderSize, bgColor, fontSize}
    blurEnabled = false,
    blurMode = 'manual',
    blurRegion = 'bottom',
    blurHeight = 15,
    blurWidth = 100,
    blurIntensity = 15,
    whiteSubBg = false,
    whiteSubBgColor = '#ffffff',
    whiteSubBgOpacity = 85,
    whiteSubTextColor = '#000000',
    logoSrc = null,
    logoPos = { x: 10, y: 10 },
    logoSize = 80,
    textAngle = 0,
    voiceoverSrc = null,
    bgmSrc = null,
    vocalsSrc = null,
    voiceoverVolume = 1.0,
    bgmVolume = 0.3,
    vocalsVolume = 0.5,
    targetWidth = 0,     // 0 = use original
    targetHeight = 0,
    fps = 30,
    onProgress = null,   // (progress: 0-100) => void
  }) {
    this.video = videoElement;
    this.subtitles = subtitles;
    this.settings = settings;
    this.blurEnabled = blurEnabled;
    this.blurMode = blurMode;
    this.blurRegion = blurRegion;
    this.blurHeight = blurHeight;
    this.blurWidth = blurWidth;
    this.blurIntensity = blurIntensity;
    this.whiteSubBg = whiteSubBg;
    this.whiteSubBgColor = whiteSubBgColor;
    this.whiteSubBgOpacity = whiteSubBgOpacity;
    this.whiteSubTextColor = whiteSubTextColor;
    this.logoSrc = logoSrc;
    this.logoPos = logoPos;
    this.logoSize = logoSize;
    this.textAngle = textAngle;
    this.voiceoverSrc = voiceoverSrc;
    this.bgmSrc = bgmSrc;
    this.vocalsSrc = vocalsSrc;
    this.voiceoverVolume = voiceoverVolume;
    this.bgmVolume = bgmVolume;
    this.vocalsVolume = vocalsVolume;
    this.fps = fps;
    this.onProgress = onProgress;
    this.cancelled = false;

    // Canvas dimensions
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    this.canvasWidth = targetWidth || vw;
    this.canvasHeight = targetHeight || vh;
    if (!this.canvasWidth || !this.canvasHeight) {
      this.canvasWidth = vw || 1920;
      this.canvasHeight = vh || 1080;
    }
  }

  /**
   * Get current subtitle at a given time
   */
  getSubtitleAt(time) {
    return this.subtitles.find(sub => {
      const start = this._parseTime(sub.start);
      const end = this._parseTime(sub.end);
      return time >= start && time <= end;
    });
  }

  _parseTime(timeStr) {
    if (typeof timeStr === 'number') return timeStr;
    if (!timeStr) return 0;
    // Parse "HH:MM:SS.mmm" or "HH:MM:SS,mmm"
    const parts = timeStr.replace(',', '.').split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return parseFloat(timeStr) || 0;
  }

  /**
   * Draw a single frame on the canvas
   */
  drawFrame(ctx, currentTime) {
    const { canvasWidth: w, canvasHeight: h } = this;

    // 1. Draw video frame
    ctx.drawImage(this.video, 0, 0, w, h);

    // 2. Draw blur overlay if enabled
    if (this.blurEnabled && this.blurMode === 'manual') {
      this._drawManualBlur(ctx, w, h);
    }

    // 3. Draw subtitle
    const sub = this.getSubtitleAt(currentTime);
    if (sub) {
      const text = sub.translation || sub.original || '';
      if (text) {
        this._drawSubtitle(ctx, text, w, h);
      }
    }

    // 4. Draw logo
    if (this._logoImage) {
      const lw = this.logoSize;
      const lh = (this._logoImage.height / this._logoImage.width) * lw;
      const lx = (this.logoPos.x / 100) * w;
      const ly = (this.logoPos.y / 100) * h;
      ctx.drawImage(this._logoImage, lx, ly, lw, lh);
    }
  }

  _drawManualBlur(ctx, w, h) {
    const blurH = (this.blurHeight / 100) * h;
    const blurW = (this.blurWidth / 100) * w;
    const blurX = (w - blurW) / 2;
    const blurY = this.blurRegion === 'bottom' ? h - blurH : 0;

    // Save the region, apply blur, redraw
    ctx.save();
    ctx.filter = `blur(${Math.min(this.blurIntensity, 30)}px)`;
    ctx.drawImage(
      ctx.canvas,
      blurX, blurY, blurW, blurH,  // source
      blurX, blurY, blurW, blurH   // dest
    );
    ctx.filter = 'none';
    ctx.restore();
  }

  _drawSubtitle(ctx, text, w, h) {
    const fontSize = Math.max(14, Math.round((this.settings.fontSize || 28) * Math.min(w, h) / 3000));
    const fontFamily = this.settings.fontFamily || 'Arial';
    const isBold = this.settings.fontStyle?.includes('Đậm') || this.settings.fontStyle?.includes('Bold');
    const fontWeight = isBold ? 'bold' : 'normal';

    ctx.save();

    // Font setup
    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Word wrap
    const blurWidthRatio = this.blurEnabled ? Math.max(0.45, (this.blurWidth / 100) * 0.82) : 0.85;
    const maxWidth = w * Math.min(0.85, blurWidthRatio);
    const lines = this._wrapText(ctx, text, maxWidth);
    const lineHeight = fontSize * 1.4;
    const totalHeight = lines.length * lineHeight;

    // Position inside blur zone when enabled, otherwise bottom center.
    const x = w / 2;
    const blurZoneHeight = (this.blurHeight / 100) * h;
    const blockCenterY = this.blurEnabled
      ? (this.blurRegion === 'bottom' ? h - (blurZoneHeight / 2) : (blurZoneHeight / 2))
      : (h - 40 - totalHeight / 2);
    const y = this.blurEnabled ? (blockCenterY + totalHeight / 2) : (h - 40);

    // Rotation
    if (this.textAngle) {
      ctx.translate(x, y - totalHeight / 2);
      ctx.rotate((this.textAngle * Math.PI) / 180);
      ctx.translate(-x, -(y - totalHeight / 2));
    }

    // Draw background
    if (this.blurEnabled && this.whiteSubBg) {
      const bgPadX = Math.max(18, Math.round(fontSize * 0.95));
      const bgPadY = Math.max(10, Math.round(fontSize * 0.5));
      const radius = Math.max(14, Math.round(fontSize * 0.75));
      let bgMaxW = 0;
      lines.forEach(line => {
        bgMaxW = Math.max(bgMaxW, ctx.measureText(line).width);
      });
      const opacity = Math.round((this.whiteSubBgOpacity / 100) * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = `${this.whiteSubBgColor}${opacity}`;
      ctx.beginPath();
      const bgX = x - bgMaxW / 2 - bgPadX;
      const bgY = y - totalHeight - bgPadY;
      const bgW = bgMaxW + bgPadX * 2;
      const bgH = totalHeight + bgPadY * 2;
      ctx.roundRect(bgX, bgY, bgW, bgH, radius);
      ctx.fill();

      // Text color for white bg mode
      ctx.fillStyle = this.whiteSubTextColor || '#000000';
    } else {
      // Semi-transparent background
      const bgPadX = 12;
      const bgPadY = 8;
      let bgMaxW = 0;
      lines.forEach(line => {
        bgMaxW = Math.max(bgMaxW, ctx.measureText(line).width);
      });
      const bgColor = this.settings.bgColor || 'rgba(0,0,0,0.5)';
      ctx.fillStyle = bgColor.startsWith('#')
        ? `${bgColor}80`
        : bgColor;
      ctx.beginPath();
      const bgX = x - bgMaxW / 2 - bgPadX;
      const bgY = y - totalHeight - bgPadY;
      ctx.roundRect(bgX, bgY, bgMaxW + bgPadX * 2, totalHeight + bgPadY * 2, 8);
      ctx.fill();

      // Text styling
      ctx.fillStyle = this.settings.textColor || '#ffffff';
      // Text shadow
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Draw text lines
    lines.forEach((line, i) => {
      const ly = y - totalHeight + (i + 1) * lineHeight;
      // Stroke (border)
      if (this.settings.borderSize && !this.whiteSubBg) {
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = this.settings.borderSize;
        ctx.strokeText(line, x, ly);
      }
      ctx.fillText(line, x, ly);
    });

    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    const words = text.split('');  // Character-level for CJK
    const lines = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [''];
  }

  /**
   * Load logo image
   */
  async _loadLogo() {
    if (!this.logoSrc) return;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this._logoImage = img;
        resolve();
      };
      img.onerror = () => resolve(); // Skip logo on error
      img.src = this.logoSrc;
    });
  }

  /**
   * Create audio mix using Web Audio API
   */
  async _createAudioMix(duration) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();

    const loadAudio = async (url, volume) => {
      if (!url) return null;
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(buffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        const gain = audioCtx.createGain();
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(dest);
        return source;
      } catch (e) {
        console.warn('Failed to load audio:', url, e);
        return null;
      }
    };

    const sources = [];

    // Load all audio sources
    const voiceover = await loadAudio(this.voiceoverSrc, this.voiceoverVolume);
    if (voiceover) sources.push(voiceover);

    const bgm = await loadAudio(this.bgmSrc, this.bgmVolume);
    if (bgm) sources.push(bgm);

    const vocals = await loadAudio(this.vocalsSrc, this.vocalsVolume);
    if (vocals) sources.push(vocals);

    // Also capture video audio
    const videoSource = audioCtx.createMediaElementSource(this.video);
    const videoGain = audioCtx.createGain();
    videoGain.gain.value = 0.5; // Default video volume
    videoSource.connect(videoGain);
    videoGain.connect(dest);
    // Also connect to speakers so video plays
    videoGain.connect(audioCtx.destination);

    return { audioCtx, dest, sources, start: () => sources.forEach(s => s?.start(0)) };
  }

  /**
   * Main export function
   */
  async export() {
    this.cancelled = false;

    // Setup canvas
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext('2d');

    // Load assets
    await this._loadLogo();

    // Get video duration
    const duration = this.video.duration;
    if (!duration || !isFinite(duration)) {
      throw new Error('Video duration not available');
    }

    const frameInterval = 1 / this.fps;
    const totalFrames = Math.ceil(duration * this.fps);

    // Setup MediaRecorder
    const stream = canvas.captureStream(this.fps);

    // Try to add audio
    let audioMix = null;
    try {
      audioMix = await this._createAudioMix(duration);
      if (audioMix?.dest?.stream) {
        audioMix.dest.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      }
    } catch (e) {
      console.warn('Audio mix failed, exporting video only:', e);
    }

    // Determine best codec
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    let mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000, // 8 Mbps
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      recorder.onerror = (e) => reject(e);
      recorder.start(100); // 100ms timeslice

      // Start audio
      if (audioMix) {
        try { audioMix.start(); } catch (e) { /* ignore */ }
      }

      // Frame-by-frame rendering
      let frameIndex = 0;
      this.video.currentTime = 0;
      this.video.muted = true;

      const renderNextFrame = () => {
        if (this.cancelled) {
          recorder.stop();
          reject(new Error('Export cancelled'));
          return;
        }

        if (frameIndex >= totalFrames) {
          // Done
          setTimeout(() => recorder.stop(), 200);
          return;
        }

        const currentTime = frameIndex * frameInterval;
        this.video.currentTime = currentTime;

        // Wait for video to seek to frame
        const onSeeked = () => {
          this.video.removeEventListener('seeked', onSeeked);

          // Draw frame
          this.drawFrame(ctx, currentTime);
          frameIndex++;

          // Report progress
          if (this.onProgress) {
            this.onProgress(Math.round((frameIndex / totalFrames) * 100));
          }

          // Use requestAnimationFrame for smooth rendering
          requestAnimationFrame(renderNextFrame);
        };

        this.video.addEventListener('seeked', onSeeked);
      };

      // Start rendering
      this.video.addEventListener('seeked', function onFirstSeek() {
        this.removeEventListener('seeked', onFirstSeek);
        renderNextFrame();
      });
      this.video.currentTime = 0;
    });
  }

  /**
   * Cancel ongoing export
   */
  cancel() {
    this.cancelled = true;
  }

  /**
   * Download the exported blob
   */
  static download(blob, filename = 'exported_video.webm') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
