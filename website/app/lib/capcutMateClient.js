/**
 * CapCut Mate API Client
 * Wraps the CapCut Mate REST API for programmatic video editing and rendering.
 * Docs: https://docs.jcaigc.cn
 */

const CAPCUT_MATE_BASE = process.env.CAPCUT_MATE_URL || 'http://localhost:30000';
const API_PREFIX = '/openapi/capcut-mate/v1';

class CapCutMateClient {
  constructor(baseUrl = CAPCUT_MATE_BASE) {
    this.baseUrl = baseUrl;
  }

  async _post(endpoint, body) {
    const url = `${this.baseUrl}${API_PREFIX}${endpoint}`;
    console.log(`[CapCut] POST ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`CapCut API error (${res.status}): ${err}`);
    }
    return res.json();
  }

  async _get(url) {
    console.log(`[CapCut] GET ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`CapCut API error (${res.status}): ${err}`);
    }
    return res.json();
  }

  /**
   * Check if CapCut Mate server is running
   */
  async healthCheck() {
    try {
      const res = await fetch(`${this.baseUrl}/docs`, { method: 'HEAD' });
      return res.ok || res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Create a new CapCut draft
   * @param {number} width - Canvas width (e.g., 1920)
   * @param {number} height - Canvas height (e.g., 1080)
   */
  async createDraft(width = 1920, height = 1080) {
    const result = await this._post('/create_draft', { width, height });
    console.log(`[CapCut] Draft created: ${result.draft_url}`);
    return result; // { draft_url, draft_id }
  }

  /**
   * Add video to draft
   * @param {string} draftUrl - Draft URL from createDraft
   * @param {Array} videoInfos - [{url, start, end, duration}]
   */
  async addVideos(draftUrl, videoInfos) {
    return this._post('/add_videos', {
      draft_url: draftUrl,
      video_infos: JSON.stringify(videoInfos),
    });
  }

  /**
   * Add audio tracks to draft
   * @param {string} draftUrl - Draft URL
   * @param {Array} audioInfos - [{audio_url, start, end, duration, volume, audio_effect}]
   */
  async addAudios(draftUrl, audioInfos) {
    return this._post('/add_audios', {
      draft_url: draftUrl,
      audio_infos: JSON.stringify(audioInfos),
    });
  }

  /**
   * Add captions/subtitles to draft
   * @param {string} draftUrl - Draft URL
   * @param {Array} captions - [{start, end, text, keyword?, keyword_color?}]
   * @param {Object} style - {text_color, font, font_size, alignment, alpha, ...}
   */
  async addCaptions(draftUrl, captions, style = {}) {
    return this._post('/add_captions', {
      draft_url: draftUrl,
      captions: JSON.stringify(captions),
      text_color: style.text_color || '#ffffff',
      border_color: style.border_color || null,
      alignment: style.alignment ?? 1,
      alpha: style.alpha ?? 1.0,
      font: style.font || null,
      font_size: style.font_size ?? 15,
      letter_spacing: style.letter_spacing || null,
      line_spacing: style.line_spacing || null,
      scale_x: style.scale_x ?? 1.0,
      scale_y: style.scale_y ?? 1.0,
      transform_x: style.transform_x ?? 0,
      transform_y: style.transform_y ?? 0,
      style_text: style.style_text ?? false,
    });
  }

  /**
   * Add effects to draft
   * @param {string} draftUrl - Draft URL
   * @param {Array} effectInfos - [{effect_name, start, end}]
   */
  async addEffects(draftUrl, effectInfos) {
    return this._post('/add_effects', {
      draft_url: draftUrl,
      effect_infos: JSON.stringify(effectInfos),
    });
  }

  /**
   * Add images (logo, sticker) to draft  
   * @param {string} draftUrl - Draft URL
   * @param {Array} imageInfos - [{url, start, end, ...}]
   */
  async addImages(draftUrl, imageInfos) {
    return this._post('/add_images', {
      draft_url: draftUrl,
      image_infos: JSON.stringify(imageInfos),
    });
  }

  /**
   * Save draft
   * @param {string} draftUrl - Draft URL
   */
  async saveDraft(draftUrl) {
    return this._post('/save_draft', { draft_url: draftUrl });
  }

  /**
   * Start video generation (async)
   * @param {string} draftUrl - Draft URL
   * @returns {{ message: string }}
   */
  async genVideo(draftUrl) {
    return this._post('/gen_video', { draft_url: draftUrl });
  }

  /**
   * Check video generation status
   * @param {string} draftUrl - Draft URL
   * @returns {{ status, progress, video_url? }}
   */
  async getGenVideoStatus(draftUrl) {
    return this._post('/gen_video_status', { draft_url: draftUrl });
  }

  /**
   * Get audio duration
   * @param {string} audioUrl - URL of audio file
   */
  async getAudioDuration(audioUrl) {
    return this._post('/get_audio_duration', { audio_url: audioUrl });
  }

  /**
   * High-level: Full render pipeline
   * Converts B2Vision editor state → CapCut draft → rendered video
   */
  async renderFull({
    videoUrl,
    videoDuration,    // in seconds
    subtitles = [],   // [{start, end, translation, original}]
    voiceoverUrl,
    bgmUrl,
    settings = {},    // {textColor, fontFamily, fontSize, ...}
    width = 1920,
    height = 1080,
    onProgress = null,
    // Blur settings
    blurEnabled = true,
    blurRegion = 'bottom',
    blurHeight = 15,
  }) {
    // 1. Create draft
    onProgress?.('Tạo dự án CapCut...', 5);
    const draft = await this.createDraft(width, height);
    const draftUrl = draft.draft_url;

    // 2. Add video
    onProgress?.('Thêm video...', 15);
    const durationUs = Math.round(videoDuration * 1_000_000);
    await this.addVideos(draftUrl, [{
      video_url: videoUrl,
      start: 0,
      end: durationUs,
      duration: durationUs,
    }]);

    // 3. Add captions (subtitles)
    if (subtitles.length > 0) {
      onProgress?.('Thêm phụ đề...', 30);
      const captions = subtitles.map(sub => ({
        start: Math.round(this._parseTimeToSeconds(sub.start) * 1_000_000),
        end: Math.round(this._parseTimeToSeconds(sub.end) * 1_000_000),
        text: sub.translation || sub.original || '',
      }));

      // Calculate transform_y to match preview position
      // CapCut: 0 = center, +half = bottom, -half = top
      let transformY;
      if (blurEnabled && blurHeight > 0) {
        if (blurRegion === 'bottom') {
          // Center of bottom blur zone: (1 - blurHeight/200 - 0.5) * height
          const centerRatio = 1 - (blurHeight / 200);
          transformY = Math.round((centerRatio - 0.5) * height);
        } else {
          const centerRatio = blurHeight / 200;
          transformY = Math.round((centerRatio - 0.5) * height);
        }
      } else {
        transformY = Math.round(0.4 * height); // bottom ~10%
      }

      await this.addCaptions(draftUrl, captions, {
        text_color: settings.textColor || '#ffffff',
        font: settings.fontFamily || null,
        font_size: settings.fontSize ? Math.round(settings.fontSize / 6) : 15,
        alignment: 1, // center
        alpha: 1.0,
        transform_y: transformY,
      });
    }

    // 4. Add voiceover
    if (voiceoverUrl) {
      onProgress?.('Thêm lồng tiếng...', 45);
      await this.addAudios(draftUrl, [{
        audio_url: voiceoverUrl,
        start: 0,
        end: durationUs,
        duration: durationUs,
        volume: 1.0,
      }]);
    }

    // 5. Add BGM
    if (bgmUrl) {
      onProgress?.('Thêm nhạc nền...', 50);
      await this.addAudios(draftUrl, [{
        audio_url: bgmUrl,
        start: 0,
        end: durationUs,
        duration: durationUs,
        volume: 0.3,
      }]);
    }

    // 6. Save & Generate
    onProgress?.('Lưu dự án...', 55);
    await this.saveDraft(draftUrl);

    onProgress?.('Bắt đầu render video...', 60);
    await this.genVideo(draftUrl);

    // 7. Poll status
    let status = null;
    let pollCount = 0;
    const maxPolls = 300; // 5 minutes at 1s intervals

    while (pollCount < maxPolls) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        status = await this.getGenVideoStatus(draftUrl);
        const progress = 60 + (status.progress || 0) * 0.4; // Scale 60-100
        onProgress?.(`Đang render... ${status.progress || 0}%`, Math.round(progress));

        if (status.status === 'completed' || status.video_url) {
          onProgress?.('Hoàn thành!', 100);
          return {
            success: true,
            videoUrl: status.video_url,
            draftUrl,
          };
        }
        if (status.status === 'failed') {
          throw new Error('CapCut render failed: ' + (status.error || 'Unknown error'));
        }
      } catch (e) {
        if (e.message.includes('CapCut render failed')) throw e;
        // Network error - continue polling
      }
      pollCount++;
    }

    throw new Error('CapCut render timeout (5 minutes)');
  }

  _parseTimeToSeconds(timeStr) {
    if (typeof timeStr === 'number') return timeStr;
    if (!timeStr) return 0;
    const parts = timeStr.replace(',', '.').split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return parseFloat(timeStr) || 0;
  }
}

module.exports = { CapCutMateClient };
