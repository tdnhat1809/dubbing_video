"""
SRT Subtitle Translator - Context-Aware Batch Translation (OpenAI API)
======================================================================
Inspired by: https://github.com/Cerlancism/chatgpt-subtitle-translator

Authentication (in priority order):
  1. --api-key CLI argument
  2. OPENAI_API_KEY environment variable
  3. Codex OAuth token from ~/.codex/auth.json (auto-detected)

Features:
  - Batch translation with sliding context window
  - Character name consistency across entire file  
  - Story context preservation (previous translated subs feed into next batch)
  - Progress resumption (saves after each batch)
  - Structured JSON output for line-to-line accuracy
  - Rate limiting and retry with exponential backoff
  - OpenAI Chat Completion API (works with any OpenAI-compatible endpoint)

Usage:
  python translate_srt.py                           # Translate text_ocr.srt → text_ocr_vi.srt
  python translate_srt.py input.srt                 # Translate input.srt → input_vi.srt
  python translate_srt.py input.srt output.srt      # Custom output path
  python translate_srt.py --resume                  # Resume interrupted translation
  python translate_srt.py --model gpt-4o            # Use specific model
"""

import os
import sys
import re
import json
import time
import argparse
from pathlib import Path

# ========================
# CONFIGURATION
# ========================
# OpenAI API
OPENAI_API_URL = "http://localhost:20128/v1/chat/completions"
OPENAI_MODEL = "cx/gpt-5.4"  # Best model available on 9router via Codex OAuth
NINE_ROUTER_API_KEY = "sk-8374ab1dd9f3f68b-tht24q-274a4d11"

# Codex OAuth token path
CODEX_AUTH_PATH = os.path.join(os.path.expanduser("~"), ".codex", "auth.json")

# Translation settings
SOURCE_LANGUAGE = "Tiếng Trung (Chinese)"
TARGET_LANGUAGE = "Tiếng Việt (Vietnamese)"
BATCH_SIZE = 20          # Lines per batch (OpenAI handles larger batches well)
CONTEXT_WINDOW = 10      # Previous translated lines to include as context
MAX_RETRIES = 5          # Max retries per batch
RETRY_DELAY = 2          # Base delay between retries (seconds)
REQUEST_DELAY = 0.3      # Delay between batches (rate limiting)

# File defaults
DEFAULT_INPUT = "text_ocr.srt"
DEFAULT_OUTPUT_SUFFIX = "_vi"
PROGRESS_SUFFIX = "_progress.json"

# ========================
# SYSTEM PROMPT
# ========================
SYSTEM_PROMPT = """Bạn là một dịch giả phụ đề chuyên nghiệp. Nhiệm vụ của bạn là dịch phụ đề từ {source} sang {target}.

## QUY TẮC BẮT BUỘC:

1. **ĐÚNG VĂN CẢNH TRUYỆN**: Đây là phụ đề của video kể truyện/tiểu thuyết. Dịch phải phù hợp với ngữ cảnh câu chuyện đang diễn ra.

2. **GIỮ NGUYÊN TÊN NHÂN VẬT**: 
   - Phiên âm tên nhân vật Trung Quốc sang tiếng Việt (ví dụ: 宋曦 → Tống Hy, 陆男 → Lục Nam)
   - Giữ nhất quán tên nhân vật trong suốt quá trình dịch
   - KHÔNG dịch nghĩa tên nhân vật

3. **NGỮ CẢNH NHẤT QUÁN**: 
   - Dựa vào các câu đã dịch trước đó để đảm bảo mạch truyện liên tục
   - Giữ đúng giọng văn, phong cách kể chuyện xuyên suốt
   - Các thuật ngữ game/truyện phải nhất quán (ví dụ: 副本 → phó bản, 玩家 → người chơi, 恶灵 → ác linh)

4. **CHẤT LƯỢNG DỊCH**:
   - Dịch tự nhiên, đúng ngữ pháp tiếng Việt
   - Giữ nguyên cảm xúc và giọng điệu gốc (hài hước, sợ hãi, v.v.)
   - Câu ngắn gọn, phù hợp phụ đề (không quá dài)
   - Nếu gặp từ OCR bị lỗi/vô nghĩa, cố gắng đoán ý nghĩa từ ngữ cảnh

5. **ĐỊNH DẠNG OUTPUT**: 
   - Trả về JSON array với ĐÚNG số lượng phần tử bằng input
   - Mỗi phần tử là một string đã dịch
   - Ví dụ input 3 dòng → output ["dòng 1", "dòng 2", "dòng 3"]

## BẢNG THUẬT NGỮ THAM KHẢO:
- 恐怖游戏 → game kinh dị
- 副本 → phó bản  
- 玩家 → người chơi
- 系统 → hệ thống
- 恶灵 → ác linh
- 公寓 → chung cư
- 难度等级 → cấp độ khó
- 存活 → sống sót
- 超生 → siêu sinh (đầu thai)
- 饥饿感 → cơn đói
- 邻居 → hàng xóm"""


# ========================
# AUTHENTICATION
# ========================
def get_api_token(cli_api_key=None):
    """Get OpenAI API token from CLI arg, env var, or Codex OAuth.
    
    Priority:
      1. CLI --api-key argument
      2. OPENAI_API_KEY environment variable
      3. Codex OAuth token from ~/.codex/auth.json
    
    Returns (token, source_description)
    """
    # 1. CLI argument
    if cli_api_key:
        return cli_api_key, "CLI --api-key"
    
    # 2. 9router built-in key
    if NINE_ROUTER_API_KEY:
        return NINE_ROUTER_API_KEY, "9router (localhost:20128)"
    
    # 3. Environment variable
    env_key = os.environ.get("OPENAI_API_KEY")
    if env_key:
        return env_key, "OPENAI_API_KEY env"
    
    # 3. Codex OAuth token
    if os.path.exists(CODEX_AUTH_PATH):
        try:
            with open(CODEX_AUTH_PATH, 'r', encoding='utf-8') as f:
                auth_data = json.load(f)
            
            # Try to extract access token from Codex auth.json
            tokens = auth_data.get("tokens", {})
            access_token = tokens.get("access_token")
            if access_token:
                return access_token, f"Codex OAuth (~/.codex/auth.json)"
            
            # Some versions store it differently
            if "access_token" in auth_data:
                return auth_data["access_token"], "Codex OAuth (top-level)"
                
        except Exception as e:
            print(f"  ⚠ Could not read Codex auth: {e}")
    
    return None, None


# ========================
# SRT PARSER
# ========================
def parse_srt(filepath):
    """Parse SRT file into list of subtitle entries.
    
    Returns list of dicts: {'index': int, 'start': str, 'end': str, 'text': str}
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Normalize line endings
    content = content.replace('\r\n', '\n').replace('\r', '\n')
    
    # Split by double newline (subtitle blocks)
    blocks = re.split(r'\n\n+', content.strip())
    
    entries = []
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        
        # First line: index
        try:
            index = int(lines[0].strip())
        except ValueError:
            continue
        
        # Second line: timecode
        timecode_match = re.match(
            r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})',
            lines[1].strip()
        )
        if not timecode_match:
            continue
        
        start_time = timecode_match.group(1)
        end_time = timecode_match.group(2)
        
        # Remaining lines: subtitle text
        text = '\n'.join(lines[2:]).strip()
        
        entries.append({
            'index': index,
            'start': start_time,
            'end': end_time,
            'text': text,
        })
    
    return entries


def write_srt(entries, filepath):
    """Write subtitle entries to SRT file."""
    with open(filepath, 'w', encoding='utf-8') as f:
        for i, entry in enumerate(entries, 1):
            f.write(f"{i}\n")
            f.write(f"{entry['start']} --> {entry['end']}\n")
            f.write(f"{entry['translated']}\n")
            f.write("\n")


# ========================
# OPENAI API
# ========================
def call_openai_api(prompt, system_instruction=None, temperature=0.3, api_token=None, api_url=None, model=None):
    """Call OpenAI Chat Completion API.
    
    Returns the text response or raises an exception.
    """
    import urllib.request
    import urllib.error
    
    url = api_url or OPENAI_API_URL
    model_name = model or OPENAI_MODEL
    
    # Build messages
    messages = []
    
    if system_instruction:
        messages.append({
            "role": "system",
            "content": system_instruction
        })
    
    messages.append({
        "role": "user",
        "content": prompt
    })
    
    body = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 8192,
        "response_format": {"type": "json_object"},
    }
    
    data = json.dumps(body).encode('utf-8')
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_token}',
    }
    
    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        raise Exception(f"API HTTP {e.code}: {error_body}")
    except urllib.error.URLError as e:
        raise Exception(f"API connection error: {e.reason}")
    
    # Extract text from OpenAI response
    try:
        text = result['choices'][0]['message']['content']
        return text
    except (KeyError, IndexError) as e:
        raise Exception(f"Unexpected API response format: {json.dumps(result, indent=2)[:500]}")


# ========================
# TRANSLATION ENGINE
# ========================
def build_translation_prompt(batch_texts, context_texts=None, batch_indices=None):
    """Build the translation prompt with context.
    
    Args:
        batch_texts: list of source texts to translate
        context_texts: list of (source, translated) tuples from previous batches
        batch_indices: original subtitle indices for reference
    """
    parts = []
    
    # Add context from previous translations
    if context_texts:
        parts.append("## NGỮ CẢNH ĐÃ DỊCH TRƯỚC ĐÓ (để tham khảo, KHÔNG dịch lại):")
        for src, tgt in context_texts:
            parts.append(f"  Gốc: {src}")
            parts.append(f"  Dịch: {tgt}")
            parts.append("")
    
    # Add current batch
    parts.append(f"## DỊCH {len(batch_texts)} DÒNG SAU ĐÂY:")
    parts.append("")
    
    # Format as numbered list for clarity
    input_lines = []
    for i, text in enumerate(batch_texts):
        input_lines.append(f"{i+1}. {text}")
    
    parts.append('\n'.join(input_lines))
    parts.append("")
    parts.append(f'Trả về JSON object có key "translations" chứa array gồm ĐÚNG {len(batch_texts)} phần tử đã dịch sang tiếng Việt.')
    parts.append('Ví dụ: {"translations": ["dòng 1 đã dịch", "dòng 2 đã dịch"]}')
    parts.append("Chỉ trả JSON, không kèm giải thích.")
    
    return '\n'.join(parts)


def parse_translation_response(response_text, expected_count):
    """Parse the JSON response from the API.
    
    Returns list of translated strings.
    Raises ValueError if parsing fails or count mismatch.
    """
    # Clean response - remove markdown code blocks if present
    text = response_text.strip()
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()
    
    try:
        result = json.loads(text)
    except json.JSONDecodeError as e:
        # Try to find JSON in the response
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError:
                # Try array format
                match2 = re.search(r'\[.*\]', text, re.DOTALL)
                if match2:
                    try:
                        arr = json.loads(match2.group())
                        result = {"translations": arr}
                    except json.JSONDecodeError:
                        raise ValueError(f"Cannot parse JSON from response: {text[:300]}")
                else:
                    raise ValueError(f"Cannot parse JSON from response: {text[:300]}")
        else:
            raise ValueError(f"No JSON found in response: {text[:300]}")
    
    # Handle both {"translations": [...]} and [...] formats
    if isinstance(result, dict):
        translations = result.get("translations", result.get("translated", []))
        if not translations:
            # Try first array-valued key
            for v in result.values():
                if isinstance(v, list):
                    translations = v
                    break
        if not translations:
            raise ValueError(f"No translations array in response: {text[:300]}")
    elif isinstance(result, list):
        translations = result
    else:
        raise ValueError(f"Expected JSON object or array, got {type(result).__name__}")
    
    if len(translations) != expected_count:
        raise ValueError(
            f"Line count mismatch: expected {expected_count}, got {len(translations)}"
        )
    
    # Ensure all elements are strings
    return [str(item) for item in translations]


def translate_batch(batch_texts, context_texts=None, batch_indices=None, 
                    batch_num=0, total_batches=0, api_token=None, api_url=None, model=None):
    """Translate a batch of subtitle texts with retry logic.
    
    Returns list of translated strings.
    """
    system = SYSTEM_PROMPT.format(source=SOURCE_LANGUAGE, target=TARGET_LANGUAGE)
    prompt = build_translation_prompt(batch_texts, context_texts, batch_indices)
    
    for attempt in range(MAX_RETRIES):
        try:
            response = call_openai_api(
                prompt, 
                system_instruction=system,
                api_token=api_token,
                api_url=api_url,
                model=model,
            )
            translations = parse_translation_response(response, len(batch_texts))
            return translations
            
        except ValueError as e:
            # Line count mismatch or parse error - retry
            print(f"    ⚠ Parse error (attempt {attempt+1}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue
            else:
                # Last resort: translate line by line
                print(f"    ⚠ Falling back to line-by-line translation")
                return translate_line_by_line(batch_texts, context_texts, api_token, api_url, model)
                
        except Exception as e:
            error_str = str(e)
            print(f"    ✗ API error (attempt {attempt+1}/{MAX_RETRIES}): {error_str[:200]}")
            
            # Handle rate limiting (429)
            if "429" in error_str:
                delay = RETRY_DELAY * (4 ** attempt)  # Aggressive backoff for rate limits
                print(f"    ⏳ Rate limited. Waiting {delay}s...")
                time.sleep(delay)
            elif attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAY * (2 ** attempt)
                print(f"    Retrying in {delay}s...")
                time.sleep(delay)
            else:
                # Return original texts as fallback
                print(f"    ✗ All retries failed. Using original text.")
                return batch_texts


def translate_line_by_line(texts, context_texts=None, api_token=None, api_url=None, model=None):
    """Fallback: translate each line individually."""
    results = []
    system = SYSTEM_PROMPT.format(source=SOURCE_LANGUAGE, target=TARGET_LANGUAGE)
    
    for i, text in enumerate(texts):
        prompt = build_translation_prompt([text], context_texts)
        
        try:
            response = call_openai_api(
                prompt, 
                system_instruction=system,
                api_token=api_token,
                api_url=api_url,
                model=model,
            )
            translations = parse_translation_response(response, 1)
            results.append(translations[0])
            
            # Update context with this translation
            if context_texts is None:
                context_texts = []
            context_texts.append((text, translations[0]))
            if len(context_texts) > CONTEXT_WINDOW:
                context_texts = context_texts[-CONTEXT_WINDOW:]
                
        except Exception as e:
            print(f"      ✗ Line {i+1} failed: {e}")
            results.append(text)  # Keep original
        
        time.sleep(REQUEST_DELAY)
    
    return results


# ========================
# PROGRESS MANAGEMENT
# ========================
def save_progress(progress_file, translated_entries, last_batch_idx, total_entries):
    """Save translation progress to resume later."""
    data = {
        'last_batch_idx': last_batch_idx,
        'total_entries': total_entries,
        'translated': [
            {
                'index': e['index'],
                'start': e['start'],
                'end': e['end'],
                'text': e['text'],
                'translated': e.get('translated', ''),
            }
            for e in translated_entries
        ]
    }
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_progress(progress_file):
    """Load translation progress. Returns (entries, last_batch_idx) or None."""
    if not os.path.exists(progress_file):
        return None
    
    try:
        with open(progress_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data['translated'], data['last_batch_idx']
    except Exception as e:
        print(f"  ⚠ Could not load progress file: {e}")
        return None


# ========================
# MAIN PIPELINE
# ========================
def translate_srt_file(input_path, output_path, resume=False, 
                       api_token=None, api_url=None, model=None):
    """Main translation pipeline.
    
    Translates SRT file from Chinese to Vietnamese with context preservation.
    """
    global BATCH_SIZE, CONTEXT_WINDOW
    
    total_start = time.time()
    model_name = model or OPENAI_MODEL
    
    # Parse input SRT
    print(f"\n{'='*60}")
    print(f"  SRT SUBTITLE TRANSLATOR (OpenAI API)")
    print(f"  {SOURCE_LANGUAGE} → {TARGET_LANGUAGE}")
    print(f"{'='*60}")
    print(f"  Input:  {input_path}")
    print(f"  Output: {output_path}")
    print(f"  Model:  {model_name}")
    print(f"  API:    {api_url or OPENAI_API_URL}")
    print(f"  Batch:  {BATCH_SIZE} lines/batch, {CONTEXT_WINDOW} lines context")
    
    entries = parse_srt(input_path)
    total = len(entries)
    print(f"  Total subtitles: {total}")
    
    if total == 0:
        print("  ✗ No subtitles found in input file!")
        return
    
    # Progress file
    progress_file = input_path + PROGRESS_SUFFIX
    
    # Check for resume
    start_batch = 0
    if resume:
        progress = load_progress(progress_file)
        if progress:
            saved_entries, last_batch = progress
            # Restore translations
            for se in saved_entries:
                for entry in entries:
                    if entry['index'] == se['index'] and se.get('translated'):
                        entry['translated'] = se['translated']
            start_batch = last_batch + 1
            already_done = start_batch * BATCH_SIZE
            print(f"  ▶ Resuming from batch {start_batch} (line {already_done}/{total})")
        else:
            print(f"  No progress file found, starting fresh.")
    
    # Calculate batches
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"  Batches: {total_batches}")
    print(f"{'='*60}\n")
    
    # Context window: stores (source_text, translated_text) pairs
    context = []
    
    # If resuming, rebuild context from already translated entries
    if start_batch > 0:
        for entry in entries:
            if entry.get('translated'):
                context.append((entry['text'], entry['translated']))
        context = context[-CONTEXT_WINDOW:]
    
    # Process batches
    for batch_idx in range(start_batch, total_batches):
        batch_start = batch_idx * BATCH_SIZE
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch_entries = entries[batch_start:batch_end]
        
        batch_texts = [e['text'] for e in batch_entries]
        batch_indices = [e['index'] for e in batch_entries]
        
        # Progress display
        pct = (batch_idx + 1) / total_batches * 100
        print(f"  [{batch_idx+1}/{total_batches}] ({pct:.0f}%) "
              f"Lines {batch_start+1}-{batch_end}/{total}")
        
        # Translate batch with context
        context_for_batch = context[-CONTEXT_WINDOW:] if context else None
        
        translations = translate_batch(
            batch_texts,
            context_texts=context_for_batch,
            batch_indices=batch_indices,
            batch_num=batch_idx,
            total_batches=total_batches,
            api_token=api_token,
            api_url=api_url,
            model=model,
        )
        
        # Store translations and update context
        for i, translation in enumerate(translations):
            entries[batch_start + i]['translated'] = translation
            context.append((batch_texts[i], translation))
            
            # Show translated lines
            src = batch_texts[i]
            tgt = translation
            if len(src) > 30:
                src = src[:30] + "..."
            if len(tgt) > 40:
                tgt = tgt[:40] + "..."
            print(f"    {batch_indices[i]:3d}. {src} → {tgt}")
        
        # Trim context window
        if len(context) > CONTEXT_WINDOW * 2:
            context = context[-CONTEXT_WINDOW:]
        
        # Save progress after each batch
        save_progress(progress_file, entries, batch_idx, total)
        
        # Rate limiting
        if batch_idx < total_batches - 1:
            time.sleep(REQUEST_DELAY)
    
    # Write output SRT
    print(f"\n  Writing output: {output_path}")
    write_srt(entries, output_path)
    
    # Clean up progress file
    if os.path.exists(progress_file):
        os.remove(progress_file)
    
    elapsed = time.time() - total_start
    
    print(f"\n{'='*60}")
    print(f"  ✓ TRANSLATION COMPLETE")
    print(f"  Time:    {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print(f"  Lines:   {total}")
    print(f"  Output:  {output_path}")
    print(f"{'='*60}\n")
    
    # Preview
    print("  Preview (first 10 entries):")
    print(f"  {'-'*50}")
    for entry in entries[:10]:
        print(f"  [{entry['index']}] {entry['start']} → {entry['end']}")
        print(f"    CN: {entry['text']}")
        print(f"    VI: {entry.get('translated', '???')}")
        print()


# ========================
# CLI
# ========================
def main():
    global BATCH_SIZE, CONTEXT_WINDOW, OPENAI_MODEL
    
    parser = argparse.ArgumentParser(
        description="Translate SRT subtitles (Chinese → Vietnamese) using OpenAI API with Codex OAuth"
    )
    parser.add_argument(
        'input', nargs='?', default=DEFAULT_INPUT,
        help=f"Input SRT file (default: {DEFAULT_INPUT})"
    )
    parser.add_argument(
        'output', nargs='?', default=None,
        help="Output SRT file (default: <input>_vi.srt)"
    )
    parser.add_argument(
        '--resume', action='store_true',
        help="Resume interrupted translation from progress file"
    )
    parser.add_argument(
        '--batch-size', type=int, default=BATCH_SIZE,
        help=f"Lines per translation batch (default: {BATCH_SIZE})"
    )
    parser.add_argument(
        '--context', type=int, default=CONTEXT_WINDOW,
        help=f"Context window size in lines (default: {CONTEXT_WINDOW})"
    )
    parser.add_argument(
        '--model', type=str, default=OPENAI_MODEL,
        help=f"OpenAI model to use (default: {OPENAI_MODEL})"
    )
    parser.add_argument(
        '--api-key', type=str, default=None,
        help="OpenAI API key (default: auto-detect from env/Codex OAuth)"
    )
    parser.add_argument(
        '--api-url', type=str, default=None,
        help=f"Custom API endpoint URL (default: {OPENAI_API_URL})"
    )
    
    args = parser.parse_args()
    
    # Apply settings
    BATCH_SIZE = args.batch_size
    CONTEXT_WINDOW = args.context
    OPENAI_MODEL = args.model
    
    # Get API token
    api_token, token_source = get_api_token(args.api_key)
    
    if not api_token:
        print("=" * 60)
        print("  ✗ NO API TOKEN FOUND")
        print("=" * 60)
        print()
        print("  Please provide an OpenAI API token using one of:")
        print("  1. --api-key YOUR_KEY")
        print("  2. Set OPENAI_API_KEY environment variable")
        print("  3. Login with Codex CLI: codex login")
        print()
        sys.exit(1)
    
    print(f"  🔑 Auth: {token_source}")
    
    # Validate input
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)
    
    # Determine output path
    if args.output:
        output_path = args.output
    else:
        stem = Path(args.input).stem
        output_path = str(Path(args.input).parent / f"{stem}{DEFAULT_OUTPUT_SUFFIX}.srt")
    
    translate_srt_file(
        args.input, 
        output_path, 
        resume=args.resume,
        api_token=api_token,
        api_url=args.api_url,
        model=args.model,
    )


if __name__ == "__main__":
    main()
