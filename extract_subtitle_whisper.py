"""
Extract subtitles from video/audio using Whisper ASR
=====================================================
Two engines supported:
  - faster-whisper (default, free, CTranslate2-based, 4x faster)
  - openai-whisper (original OpenAI implementation)

Outputs:
  - text_ocr.srt: Subtitle text with timing (same format as YOLO pipeline)

Usage:
  python extract_subtitle_whisper.py video.mp4
  python extract_subtitle_whisper.py video.mp4 --model large-v3 --language zh
  python extract_subtitle_whisper.py video.mp4 --engine openai --model medium
"""

import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import re
import time
import argparse
import subprocess
import tempfile

# =========================
# CONFIGURATION
# =========================
OUTPUT_SRT = "text_ocr.srt"
SAMPLE_RATE = 16000  # Whisper expects 16kHz mono audio

# Model recommendations:
# tiny   - fastest, lowest accuracy (~1GB VRAM)
# base   - fast, decent accuracy (~1GB VRAM)  
# small  - balanced (~2GB VRAM)
# medium - good accuracy (~5GB VRAM)
# large-v3 - best accuracy (~10GB VRAM)
DEFAULT_MODEL = "large-v3"


# =========================
# AUDIO EXTRACTION
# =========================
def extract_audio(video_path, output_wav):
    """Extract audio from video using ffmpeg, output 16kHz mono WAV."""
    print(f"  Extracting audio from video...")
    cmd = [
        'ffmpeg', '-y', '-i', video_path,
        '-vn',           # no video
        '-ar', str(SAMPLE_RATE),  # 16kHz
        '-ac', '1',      # mono
        '-f', 'wav',
        output_wav
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=300)
    if result.returncode != 0:
        print(f"  ERROR: ffmpeg failed: {result.stderr.decode('utf-8', errors='replace')[:500]}")
        return False
    
    size_mb = os.path.getsize(output_wav) / 1024 / 1024
    print(f"  Audio extracted: {output_wav} ({size_mb:.1f} MB)")
    return True


# =========================
# CJK / sentence boundary detection
# =========================
# Chinese/Japanese sentence-ending punctuation
CJK_SENTENCE_ENDS = set('。！？；…!?;')
# Pause punctuation (comma-level)
CJK_PAUSE_MARKS = set('，、,：:')
# All CJK ranges
CJK_RE = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]')

def is_cjk_text(text):
    """Check if text is primarily CJK (Chinese/Japanese/Korean)."""
    cjk_count = len(CJK_RE.findall(text))
    return cjk_count > len(text) * 0.3


# =========================
# FASTER-WHISPER ENGINE
# =========================
def transcribe_faster_whisper(audio_path, model_name, language=None, device='auto'):
    """Transcribe audio using faster-whisper (CTranslate2)."""
    from faster_whisper import WhisperModel
    
    # Auto-detect device
    if device == 'auto':
        try:
            import torch
            if torch.cuda.is_available():
                device = 'cuda'
                compute_type = 'float16'
            else:
                device = 'cpu'
                compute_type = 'int8'
        except ImportError:
            device = 'cpu'
            compute_type = 'int8'
    elif device == 'cuda':
        compute_type = 'float16'
    else:
        compute_type = 'int8'
    
    print(f"  Loading faster-whisper model: {model_name} ({device}, {compute_type})")
    t0 = time.time()
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    print(f"  Model loaded in {time.time() - t0:.1f}s")
    
    # Transcribe with fine-grained settings for better timeline
    print(f"  Transcribing...")
    transcribe_kwargs = {
        'beam_size': 5,
        'word_timestamps': True,
        'vad_filter': True,
        'vad_parameters': {
            'min_silence_duration_ms': 250,     # Shorter silence = more splits
            'speech_pad_ms': 80,
        },
        'condition_on_previous_text': False,    # Each segment independent (more accurate timestamps)
        'no_speech_threshold': 0.6,
    }
    if language:
        transcribe_kwargs['language'] = language
    
    segments_raw, info = model.transcribe(audio_path, **transcribe_kwargs)
    
    detected_lang = info.language
    lang_prob = info.language_probability
    print(f"  Detected language: {detected_lang} ({lang_prob:.1%})")
    print(f"  Audio duration: {info.duration:.1f}s")
    
    is_cjk = language in ('zh', 'ja', 'ko') if language else False
    
    # Collect segments with their word-level data
    raw_segments = []
    for segment in segments_raw:
        text = segment.text.strip()
        if not text:
            continue
        
        if not is_cjk and is_cjk_text(text):
            is_cjk = True
        
        seg_words = []
        if segment.words:
            for w in segment.words:
                wt = w.word.strip() if hasattr(w, 'word') else ''
                if wt:
                    seg_words.append({
                        'word': wt,
                        'start': w.start,
                        'end': w.end,
                    })
        
        raw_segments.append({
            'text': text,
            'start': segment.start,
            'end': segment.end,
            'words': seg_words,
        })
        
        # Progress
        pct = min(segment.end / max(info.duration, 1) * 100, 100)
        print(f"  [{pct:5.1f}%] {seconds_to_timecode(segment.start)} | {text[:50]}")
    
    print(f"  Total segments: {len(raw_segments)}")
    
    # Convert segments to subtitle entries
    # Strategy: Use Whisper's natural segments, only split segments that are too long
    if is_cjk:
        subtitle_entries = split_long_segments_cjk(raw_segments, max_chars=20, max_duration=4.0)
    else:
        subtitle_entries = split_long_segments_latin(raw_segments, max_chars=50, max_duration=5.0)
    
    return subtitle_entries, detected_lang


# =========================
# STABLE-TS ENGINE (Best for CJK + accurate timestamps)
# =========================
def transcribe_stable_ts(audio_path, model_name, language=None, device='auto'):
    """
    Transcribe audio using stable-ts (stabilized Whisper timestamps).
    
    stable-ts provides:
    - suppress_silence: Auto-adjusts timestamps to exclude silent gaps
    - regroup: Smart regrouping of words into natural subtitle segments
    - Better word-level timestamps via cross-attention pattern refinement
    
    This is the BEST engine for CJK languages because it handles
    sentence segmentation natively through silence detection + regrouping.
    """
    import stable_whisper
    
    # Auto-detect device
    if device == 'auto':
        try:
            import torch
            if torch.cuda.is_available():
                device = 'cuda'
            else:
                device = 'cpu'
        except ImportError:
            device = 'cpu'
    
    print(f"  Loading stable-ts model: {model_name} ({device})")
    t0 = time.time()
    model = stable_whisper.load_model(model_name, device=device)
    print(f"  Model loaded in {time.time() - t0:.1f}s")
    
    # Transcribe with stable-ts enhanced options
    print(f"  Transcribing with stable-ts...")
    transcribe_kwargs = {
        'verbose': None,
        'word_timestamps': True,
        'regroup': True,                # Auto-regroup into natural segments
        'suppress_silence': True,       # Remove silent gaps from timestamps
        'suppress_word_ts': True,       # Also suppress word-level timestamps at silence
        'vad': True,                    # Use Silero VAD for better silence detection
        'vad_threshold': 0.35,          # Threshold for voice activity
        'min_word_dur': 0.1,            # Min duration per word
        'only_voice_freq': False,       # Use full frequency range
        'condition_on_previous_text': False,  # Each segment independent
        'no_speech_threshold': 0.6,
        'prepend_punctuations': "\"'([{-",
        'append_punctuations': "\"'.,!?:)]}",  # simplified for compatibility
    }
    if language:
        transcribe_kwargs['language'] = language
    
    result = model.transcribe(str(audio_path), **transcribe_kwargs)
    
    detected_lang = result.language if hasattr(result, 'language') else (language or 'unknown')
    
    # stable-ts segments are already well-segmented via regroup + suppress_silence
    is_cjk = language in ('zh', 'ja', 'ko') if language else False
    
    entries = []
    seg_count = 0
    for segment in result.segments:
        text = segment.text.strip()
        if not text:
            continue
        
        if not is_cjk and is_cjk_text(text):
            is_cjk = True
        
        seg_count += 1
        pct = min(segment.end / max(result.duration, 1) * 100, 100) if hasattr(result, 'duration') else 0
        print(f"  [{pct:5.1f}%] {seconds_to_timecode(segment.start)} | {text[:50]}")
        
        # Collect word data for potential re-splitting
        seg_words = []
        if hasattr(segment, 'words') and segment.words:
            for w in segment.words:
                wt = w.word.strip() if hasattr(w, 'word') else ''
                if wt:
                    seg_words.append({
                        'word': wt,
                        'start': w.start,
                        'end': w.end,
                    })
        
        entries.append({
            'text': text,
            'start': segment.start,
            'end': segment.end,
            'words': seg_words,
        })
    
    print(f"  Total segments from stable-ts: {seg_count}")
    
    # stable-ts segments are usually well-sized, but split any that are too long
    if is_cjk:
        subtitle_entries = split_long_segments_cjk(entries, max_chars=20, max_duration=4.0)
    else:
        subtitle_entries = split_long_segments_latin(entries, max_chars=50, max_duration=5.0)
    
    return subtitle_entries, detected_lang

def split_long_segments_cjk(segments, max_chars=20, max_duration=4.0):
    """
    Use Whisper's natural segment boundaries as subtitle lines.
    Only split segments that are too long.
    
    Whisper already segments audio into sentences/phrases - we trust that.
    We only intervene when a segment has too many characters or is too long.
    """
    entries = []
    
    for seg in segments:
        text = seg['text'].strip()
        duration = seg['end'] - seg['start']
        words = seg.get('words', [])
        
        # Short enough segment → keep as-is
        if len(text) <= max_chars and duration <= max_duration:
            entries.append({
                'start': seg['start'],
                'end': seg['end'],
                'text': text,
            })
            continue
        
        # Segment is too long → split using word timestamps
        if words:
            # Try to split at natural break points within the segment
            sub_entries = _split_words_at_breaks(words, max_chars, max_duration)
            entries.extend(sub_entries)
        else:
            # No word data - split text evenly by time
            n_chunks = max(2, len(text) // max_chars + 1)
            chunk_len = len(text) // n_chunks
            chunk_dur = duration / n_chunks
            for i in range(n_chunks):
                start_idx = i * chunk_len
                end_idx = (i + 1) * chunk_len if i < n_chunks - 1 else len(text)
                chunk_text = text[start_idx:end_idx]
                if chunk_text.strip():
                    entries.append({
                        'start': seg['start'] + i * chunk_dur,
                        'end': seg['start'] + (i + 1) * chunk_dur,
                        'text': chunk_text.strip(),
                    })
    
    return entries


def _split_words_at_breaks(words, max_chars=20, max_duration=4.0):
    """Split a list of words into subtitle entries at natural break points."""
    entries = []
    buf = []
    buf_text = ""
    
    for i, w in enumerate(words):
        wt = w['word'].strip()
        if not wt:
            continue
        
        # Check gap before this word (natural pause)
        gap = (w['start'] - buf[-1]['end']) if buf else 0
        buf_duration = (buf[-1]['end'] - buf[0]['start']) if buf else 0
        
        # Flush before adding if there's a natural break
        if buf and buf_text:
            should_break = False
            
            # Time gap indicates natural pause
            if gap >= 0.15 and len(buf_text) >= 5:
                should_break = True
            # Previous word ended with sentence-ending punctuation
            elif buf_text and buf_text[-1] in CJK_SENTENCE_ENDS:
                should_break = True
            # Previous word ended with pause mark and buffer is getting full
            elif buf_text and buf_text[-1] in CJK_PAUSE_MARKS and len(buf_text) >= max_chars * 0.6:
                should_break = True
            # Hard char limit
            elif len(buf_text) >= max_chars:
                should_break = True
            # Duration limit
            elif buf_duration >= max_duration:
                should_break = True
            
            if should_break:
                entries.append({
                    'start': buf[0]['start'],
                    'end': buf[-1]['end'],
                    'text': buf_text.strip(),
                })
                buf = []
                buf_text = ""
        
        buf.append(w)
        buf_text += wt
    
    # Flush remainder
    if buf and buf_text.strip():
        entries.append({
            'start': buf[0]['start'],
            'end': buf[-1]['end'],
            'text': buf_text.strip(),
        })
    
    return entries


def split_long_segments_latin(segments, max_chars=50, max_duration=5.0):
    """
    Use Whisper's natural segment boundaries for Latin/alphabetic languages.
    Only split segments that are too long.
    """
    entries = []
    
    for seg in segments:
        text = seg['text'].strip()
        duration = seg['end'] - seg['start']
        words = seg.get('words', [])
        
        # Short enough → keep as-is
        if len(text) <= max_chars and duration <= max_duration:
            entries.append({
                'start': seg['start'],
                'end': seg['end'],
                'text': text,
            })
            continue
        
        # Split using word boundaries
        if words:
            buf = []
            buf_text = ""
            for w in words:
                wt = w['word'].strip()
                if not wt:
                    continue
                
                test_text = (buf_text + " " + wt).strip() if buf_text else wt
                buf_duration = (w['end'] - buf[0]['start']) if buf else 0
                
                if buf and (len(test_text) >= max_chars or buf_duration >= max_duration):
                    entries.append({
                        'start': buf[0]['start'],
                        'end': buf[-1]['end'],
                        'text': buf_text.strip(),
                    })
                    buf = []
                    buf_text = ""
                
                buf.append(w)
                buf_text = (buf_text + " " + wt).strip() if buf_text else wt
            
            if buf and buf_text.strip():
                entries.append({
                    'start': buf[0]['start'],
                    'end': buf[-1]['end'],
                    'text': buf_text.strip(),
                })
        else:
            entries.append({
                'start': seg['start'],
                'end': seg['end'],
                'text': text,
            })
    
    return entries


def segment_words_cjk(words, max_chars=15, max_duration=3.5):
    """
    Segment word list into subtitle entries for CJK languages.
    
    Strategy: Since Whisper's base model rarely outputs punctuation for Chinese,
    we use TIME GAPS between words as the primary sentence boundary signal.
    - Gap >= 300ms = sentence boundary (strong break)
    - Gap >= 150ms = phrase boundary (soft break, only if buffer is getting long)
    - Punctuation (。！？) = always break
    - Hard limit at max_chars to prevent over-long lines
    """
    entries = []
    buf_words = []
    buf_text = ""
    
    # Pre-compute gaps for all words
    gaps = [0.0]  # first word has no gap
    for i in range(1, len(words)):
        gaps.append(words[i]['start'] - words[i-1]['end'])
    
    for idx, w in enumerate(words):
        wt = w['word'].strip()
        if not wt:
            continue
        
        # Check for time gap BEFORE adding this word (= break before this word)
        gap = gaps[idx] if idx < len(gaps) else 0.0
        
        # If there's a significant gap and buffer has content, flush BEFORE adding this word
        if buf_words and buf_text:
            buf_duration = buf_words[-1]['end'] - buf_words[0]['start']
            
            # Strong break: gap >= 300ms (clear sentence boundary)
            if gap >= 0.3 and len(buf_text) >= 3:
                entries.append({
                    'start': buf_words[0]['start'],
                    'end': buf_words[-1]['end'],
                    'text': buf_text.strip(),
                })
                buf_words = []
                buf_text = ""
            # Medium break: gap >= 150ms + buffer is getting long
            elif gap >= 0.15 and len(buf_text) >= 10:
                entries.append({
                    'start': buf_words[0]['start'],
                    'end': buf_words[-1]['end'],
                    'text': buf_text.strip(),
                })
                buf_words = []
                buf_text = ""
            # Duration limit reached + any gap
            elif buf_duration >= max_duration and gap >= 0.05:
                entries.append({
                    'start': buf_words[0]['start'],
                    'end': buf_words[-1]['end'],
                    'text': buf_text.strip(),
                })
                buf_words = []
                buf_text = ""
        
        # Add word to buffer
        buf_words.append(w)
        buf_text += wt
        
        # Detect punctuation at end of this word
        last_char = wt[-1] if wt else ''
        is_sentence_end = last_char in CJK_SENTENCE_ENDS
        is_pause = last_char in CJK_PAUSE_MARKS
        
        # Post-add flush: punctuation or hard char limit
        should_flush = False
        
        if is_sentence_end:
            should_flush = True
        elif is_pause and len(buf_text) >= 8:
            should_flush = True
        elif len(buf_text) >= 25:
            # Hard limit - find best break point within buffer
            should_flush = True
        
        if should_flush and buf_words:
            entries.append({
                'start': buf_words[0]['start'],
                'end': buf_words[-1]['end'],
                'text': buf_text.strip(),
            })
            buf_words = []
            buf_text = ""
    
    # Flush remainder
    if buf_words and buf_text.strip():
        entries.append({
            'start': buf_words[0]['start'],
            'end': buf_words[-1]['end'],
            'text': buf_text.strip(),
        })
    
    return entries


def segment_words_latin(words, max_chars=45, max_duration=5.0):
    """
    Segment word list into subtitle entries for Latin-script languages.
    Split at sentence boundaries (. ! ?), natural pauses, or when limits exceeded.
    """
    entries = []
    buf_words = []
    buf_text = ""
    
    for w in words:
        wt = w['word']
        wt_stripped = wt.strip()
        if not wt_stripped:
            continue
        
        # Build text with original spacing
        new_text = (buf_text + wt).strip() if buf_text else wt_stripped
        
        # Detect sentence boundary
        last_char = wt_stripped[-1] if wt_stripped else ''
        is_sentence_end = last_char in '.!?'
        is_comma = last_char in ',;:'
        
        # Time gap
        time_gap = (w['start'] - buf_words[-1]['end']) if buf_words else 0
        has_gap = time_gap > 0.5
        
        buf_words.append(w)
        buf_text = new_text
        new_duration = (w['end'] - buf_words[0]['start']) if buf_words else 0
        
        should_flush = False
        
        if is_sentence_end and len(buf_text) >= 8:
            should_flush = True
        elif has_gap and len(buf_text) >= 10:
            should_flush = True
        elif is_comma and len(buf_text) >= max_chars * 0.7:
            should_flush = True
        elif len(buf_text) >= max_chars:
            should_flush = True
        elif new_duration >= max_duration:
            should_flush = True
        
        if should_flush and buf_words:
            entries.append({
                'start': buf_words[0]['start'],
                'end': buf_words[-1]['end'],
                'text': buf_text.strip(),
            })
            buf_words = []
            buf_text = ""
    
    if buf_words and buf_text.strip():
        entries.append({
            'start': buf_words[0]['start'],
            'end': buf_words[-1]['end'],
            'text': buf_text.strip(),
        })
    
    return entries


# =========================
# OPENAI-WHISPER ENGINE
# =========================
def transcribe_openai_whisper(audio_path, model_name, language=None, device='auto'):
    """Transcribe audio using openai-whisper (original)."""
    import whisper
    
    # Auto-detect device
    if device == 'auto':
        try:
            import torch
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
        except ImportError:
            device = 'cpu'
    
    print(f"  Loading openai-whisper model: {model_name} ({device})")
    t0 = time.time()
    model = whisper.load_model(model_name, device=device)
    print(f"  Model loaded in {time.time() - t0:.1f}s")
    
    # Transcribe
    print(f"  Transcribing...")
    transcribe_kwargs = {
        'word_timestamps': True,
        'verbose': False,
    }
    if language:
        transcribe_kwargs['language'] = language
    
    result = model.transcribe(audio_path, **transcribe_kwargs)
    
    detected_lang = result.get('language', 'unknown')
    print(f"  Detected language: {detected_lang}")
    
    # Collect segments
    subtitle_entries = []
    for segment in result['segments']:
        text = segment['text'].strip()
        if not text:
            continue
        
        start = segment['start']
        end = segment['end']
        
        # Split long segments
        if 'words' in segment and segment['words'] and len(text) > 50:
            # Create word objects compatible with split function
            class WordObj:
                def __init__(self, w):
                    self.word = w.get('word', '')
                    self.start = w.get('start', 0)
                    self.end = w.get('end', 0)
            
            word_objs = [WordObj(w) for w in segment['words']]
            sub_entries = split_segment_by_words(word_objs, max_chars=40)
            subtitle_entries.extend(sub_entries)
        else:
            subtitle_entries.append({
                'start': start,
                'end': end,
                'text': text,
            })
        
        # Progress
        print(f"  {seconds_to_timecode(start)} | {text[:50]}")
    
    return subtitle_entries, detected_lang


# =========================
# SRT OUTPUT
# =========================
def seconds_to_timecode(sec):
    """Convert seconds to SRT timecode (HH:MM:SS,mmm)."""
    sec = max(0, sec)
    hours = int(sec // 3600)
    minutes = int((sec % 3600) // 60)
    secs = int(sec % 60)
    millis = int((sec - int(sec)) * 1000)
    return f'{hours:02}:{minutes:02}:{secs:02},{millis:03}'


def write_srt(entries, output_path):
    """Write subtitle entries to SRT file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, entry in enumerate(entries, 1):
            start_tc = seconds_to_timecode(entry['start'])
            end_tc = seconds_to_timecode(entry['end'])
            text = entry['text'].strip()
            f.write(f"{i}\n{start_tc} --> {end_tc}\n{text}\n\n")
    
    print(f"\n  SRT written: {output_path} ({len(entries)} subtitles)")


# =========================
# POST-PROCESSING
# =========================
def merge_short_subs(entries, min_duration=0.15, min_gap=0.05):
    """Merge only very short noise subtitles. Keep most entries separate for timeline accuracy."""
    if not entries:
        return entries
    
    merged = []
    for entry in entries:
        duration = entry['end'] - entry['start']
        text = entry['text'].strip()
        
        # Skip very short noise (< 150ms or single char)
        if duration < 0.1 or len(text) < 2:
            continue
        
        # Only merge VERY short entries (< 300ms) with previous if gap is tiny
        if merged and duration < 0.3 and len(text) <= 4:
            prev = merged[-1]
            gap = entry['start'] - prev['end']
            
            # Only merge if gap < 50ms AND combined text stays short
            if gap < min_gap and len(prev['text'] + text) < 25:
                prev['end'] = entry['end']
                prev['text'] = prev['text'] + text
                continue
        
        merged.append(dict(entry))
    
    return merged


def clean_whisper_text(text):
    """Clean common Whisper artifacts."""
    # Remove repeated characters/phrases
    text = re.sub(r'(.{3,}?)\1{2,}', r'\1', text)
    # Remove music notation
    text = re.sub(r'[♪♫🎵🎶]+', '', text)
    # Remove parenthetical noise descriptions
    text = re.sub(r'\(.*?(music|applause|laughter|silence).*?\)', '', text, flags=re.IGNORECASE)
    # Trim
    text = text.strip()
    return text


# =========================
# MAIN
# =========================
def main():
    parser = argparse.ArgumentParser(description="Extract subtitles from audio using Whisper")
    parser.add_argument('video', help="Input video or audio file")
    parser.add_argument('--engine', choices=['faster', 'stable', 'openai'], default='stable',
                       help="Whisper engine: 'stable' (stable-ts, best timestamps, default), 'faster' (faster-whisper), or 'openai' (original)")
    parser.add_argument('--model', default=DEFAULT_MODEL,
                       help=f"Model size: tiny, base, small, medium, large-v3 (default: {DEFAULT_MODEL})")
    parser.add_argument('--language', default=None,
                       help="Language code (e.g. zh, en, vi, ja). Auto-detect if not specified.")
    parser.add_argument('--device', choices=['auto', 'cpu', 'cuda'], default='auto',
                       help="Device: auto (detect GPU), cpu, cuda")
    parser.add_argument('--output', default=OUTPUT_SRT, help=f"Output SRT file (default: {OUTPUT_SRT})")
    parser.add_argument('--task-id', default=None, help="Task ID for progress tracking")
    args = parser.parse_args()
    
    if not os.path.exists(args.video):
        print(f"Error: File not found: {args.video}")
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print(f"  WHISPER SUBTITLE EXTRACTION")
    print(f"{'='*60}")
    print(f"  Input:    {args.video}")
    print(f"  Engine:   {args.engine}")
    print(f"  Model:    {args.model}")
    print(f"  Language: {args.language or 'auto-detect'}")
    print(f"  Device:   {args.device}")
    print(f"  Output:   {args.output}")
    print(f"{'='*60}\n")
    
    t0 = time.time()
    
    # Step 1: Extract audio if video
    audio_path = args.video
    temp_wav = None
    
    # Check if input is video (not pure audio)
    ext = os.path.splitext(args.video)[1].lower()
    if ext in ('.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm', '.ts', '.wmv'):
        temp_wav = tempfile.mktemp(suffix='.wav', prefix='whisper_audio_')
        if not extract_audio(args.video, temp_wav):
            print("ERROR: Failed to extract audio")
            sys.exit(1)
        audio_path = temp_wav
    
    # Step 2: Transcribe
    print(f"\n  TRANSCRIPTION ({args.engine})")
    print(f"  {'='*45}")
    
    try:
        if args.engine == 'stable':
            entries, detected_lang = transcribe_stable_ts(
                audio_path, args.model, args.language, args.device
            )
        elif args.engine == 'faster':
            entries, detected_lang = transcribe_faster_whisper(
                audio_path, args.model, args.language, args.device
            )
        else:
            entries, detected_lang = transcribe_openai_whisper(
                audio_path, args.model, args.language, args.device
            )
    except ImportError as e:
        print(f"\n  ERROR: Required package not installed for engine '{args.engine}'!")
        if args.engine == 'stable':
            print(f"  Run: pip install stable-ts")
        elif args.engine == 'faster':
            print(f"  Run: pip install faster-whisper")
        else:
            print(f"  Run: pip install openai-whisper")
        sys.exit(1)
    
    # Cleanup temp audio
    if temp_wav and os.path.exists(temp_wav):
        os.unlink(temp_wav)
    
    transcribe_time = time.time() - t0
    print(f"\n  Transcription done in {transcribe_time:.1f}s")
    print(f"  Raw segments: {len(entries)}")
    
    # Step 3: Post-process
    print(f"\n  POST-PROCESSING")
    print(f"  {'='*45}")
    
    # Clean text
    for entry in entries:
        entry['text'] = clean_whisper_text(entry['text'])
    
    # Remove empty entries
    entries = [e for e in entries if e['text'].strip()]
    
    # Merge short subs
    entries = merge_short_subs(entries)
    
    print(f"  Final subtitles: {len(entries)}")
    
    # Step 4: Write SRT
    write_srt(entries, args.output)
    
    total_time = time.time() - t0
    
    print(f"\n{'='*60}")
    print(f"  DONE in {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"  Language: {detected_lang}")
    print(f"  Subtitles: {len(entries)}")
    print(f"  Output: {args.output}")
    print(f"{'='*60}")
    
    # Preview
    if entries:
        print(f"\nSRT Preview (first 20 entries):")
        for i, entry in enumerate(entries[:20], 1):
            print(f"  [{i}] {seconds_to_timecode(entry['start'])} | {entry['text'][:60]}")


if __name__ == '__main__':
    main()
