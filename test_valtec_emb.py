"""
TEST VALTEC + vietnormalizer: Replace vinorm with vietnormalizer
================================================================
vinorm uses Linux binary -> fails on Windows
vietnormalizer is pure Python -> works everywhere
"""
import sys, os, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')
os.environ['PYTHONUTF8'] = '1'

import torch
import soundfile as sf

# ============================================
# Step 1: Test vietnormalizer
# ============================================
print("="*60)
print("  Step 1: Test vietnormalizer")
print("="*60)

from vietnormalizer import VietnameseNormalizer
normalizer = VietnameseNormalizer()

test_cases = [
    "Hôm nay là 25/12/2023, lúc 14:30",
    "Giá 50.000đ cho mỗi người",
    "Tốc độ 120km/h",
    "Xin chào các bạn, đây là giọng nói của tôi.",
    "NASA đã phóng thành công tên lửa vào năm 2024.",
]

for text in test_cases:
    norm = normalizer.normalize(text)
    print(f"  '{text}'")
    print(f"    -> '{norm}'")
    print()

# ============================================
# Step 2: Create fixed vi2IPA using vietnormalizer
# ============================================
print(f"{'='*60}")
print("  Step 2: vi2IPA with vietnormalizer")
print("="*60)

from viphoneme import T2IPA
try:
    from underthesea import word_tokenize
    HAS_UNDERTHESEA = True
except ImportError:
    HAS_UNDERTHESEA = False

import re

def vi2IPA_fixed(text):
    """Vietnamese to IPA using vietnormalizer (pure Python) instead of vinorm."""
    # Normalize text with vietnormalizer (replaces vinorm TTSnorm)
    normalized = normalizer.normalize(text)
    
    # Tokenize
    if HAS_UNDERTHESEA:
        TK = word_tokenize(normalized)
    else:
        TK = normalized.split()
    
    IPA = ""
    for tk in TK:
        ipa = T2IPA(tk).replace(" ", "_")
        if ipa == "":
            IPA += tk + " "
        elif ipa[0] == "[" and ipa[-1] == "]":
            IPA += tk + " "
        else:
            IPA += ipa + " "
    
    IPA = re.sub(' +', ' ', IPA)
    return IPA.strip()

# Test IPA with vietnormalizer
ipa_tests = [
    "Xin chào các bạn",
    "đây là giọng nói của tôi",
    "Việt Nam đẹp lắm",
    "chúc các bạn sức khỏe",
    "Giá 50.000đ mỗi tháng",
]

for text in ipa_tests:
    ipa = vi2IPA_fixed(text)
    print(f"  '{text}' -> '{ipa}'")

# ============================================
# Step 3: Patch phonemizer and synthesize
# ============================================
print(f"\n{'='*60}")
print("  Step 3: Valtec synthesis (vietnormalizer)")
print("="*60)

import src.vietnamese.phonemizer as phonemizer_mod
import unicodedata

def text_to_phonemes_vietnorm(text):
    """Phonemizer using vietnormalizer + T2IPA."""
    ipa_text = vi2IPA_fixed(text)
    
    if not ipa_text or ipa_text.strip() in ['', '.', '..', '...']:
        return phonemizer_mod.text_to_phonemes_charbased(text)
    
    phones = []
    tones = []
    word2ph = []
    
    VIPHONEME_TONE_MAP = {1: 0, 2: 2, 3: 3, 4: 4, 5: 1, 6: 5}
    PUNCTUATION = set(',.!?;:\'"--—…()[]{}')
    
    tokens = ipa_text.strip().split()
    
    for token in tokens:
        if all(c in PUNCTUATION or c == '.' for c in token):
            for c in token:
                if c in PUNCTUATION:
                    phones.append(c)
                    tones.append(0)
                    word2ph.append(1)
            continue
        
        syllables = token.split('_')
        
        for syllable in syllables:
            if not syllable:
                continue
            
            syllable_phones = []
            syllable_tone = 0
            i = 0
            
            while i < len(syllable):
                char = syllable[i]
                
                if char.isdigit():
                    syllable_tone = VIPHONEME_TONE_MAP.get(int(char), 0)
                    i += 1
                    continue
                
                if unicodedata.combining(char):
                    i += 1
                    continue
                
                if char in {'ʷ', 'ʰ', 'ː'}:
                    if syllable_phones:
                        syllable_phones[-1] = syllable_phones[-1] + char
                    i += 1
                    continue
                
                if char in {'\u0361', '\u035c'}:
                    i += 1
                    continue
                
                if char in PUNCTUATION:
                    i += 1
                    continue
                
                syllable_phones.append(char)
                i += 1
            
            if syllable_phones:
                phones.extend(syllable_phones)
                tones.extend([syllable_tone] * len(syllable_phones))
                word2ph.append(len(syllable_phones))
    
    return phones, tones, word2ph

# Patch
def text_to_phonemes_patched(text, use_viphoneme=True):
    phones, tones, word2ph = text_to_phonemes_vietnorm(text)
    phones = ["_"] + phones + ["_"]
    tones = [0] + tones + [0]
    word2ph = [1] + word2ph + [1]
    return phones, tones, word2ph

phonemizer_mod.text_to_phonemes = text_to_phonemes_patched

# Load Valtec
VALTEC_DIR = r"C:\Bankme Auto Media\tv_engine\data\models\valtec"
VALTEC_CKPT = os.path.join(VALTEC_DIR, "models", "zeroshot", "G_175000_fp16.pth")
VALTEC_CONFIG = os.path.join(VALTEC_DIR, "models", "zeroshot", "config.json")
VOICES_DIR = os.path.join(VALTEC_DIR, "voices")
OUTPUT_DIR = r"C:\python\ommivoice\test_voices_valtec"
os.makedirs(OUTPUT_DIR, exist_ok=True)

from valtec_tts import ZeroShotTTS
print("  Loading Valtec model...")
t0 = time.time()
tts = ZeroShotTTS(checkpoint_path=VALTEC_CKPT, config_path=VALTEC_CONFIG)
print(f"  Loaded in {time.time()-t0:.1f}s")

VOICES = [
    ("Vietnam_hoa-mai (woman).pt",   "Hoa_Mai",   "Xin chào các bạn, đây là giọng nói của Hoa Mai, rất vui được gặp các bạn."),
    ("Vietnam_tran-binh (man).pt",   "Tran_Binh", "Hôm nay thời tiết rất đẹp, trời nắng ấm áp và gió nhẹ mát mẻ."),
    ("Vietnam_le-nam (man).pt",      "Le_Nam",    "Việt Nam là một đất nước xinh đẹp với nhiều danh lam thắng cảnh nổi tiếng."),
    ("Vietnam_my-huyen (woman).pt",  "My_Huyen",  "Chào mừng các bạn đến với chương trình của chúng tôi, chúc các bạn một ngày tốt lành."),
    ("Vietnam_binh-an (child).pt",   "Binh_An",   "Em chào các anh chị, em là Bình An, em rất vui được gặp mọi người."),
]

from src.text import cleaned_text_to_sequence
from src.vietnamese.text_processor import process_vietnamese_text
from src.nn import commons

results = []
for i, (voice_file, name, gen_text) in enumerate(VOICES):
    voice_path = os.path.join(VOICES_DIR, voice_file)
    
    try:
        emb_data = torch.load(voice_path, map_location=tts.device, weights_only=False)
        speaker_emb, prosody_emb = emb_data
        
        processed = process_vietnamese_text(gen_text)
        phones, tones_raw, word2ph = text_to_phonemes_patched(processed)
        phone_ids, tone_ids, language_ids = cleaned_text_to_sequence(
            phones, tones_raw, "VI"
        )

        if getattr(tts.hps.data, 'add_blank', True):
            phone_ids = commons.intersperse(phone_ids, 0)
            tone_ids = commons.intersperse(tone_ids, 0)
            language_ids = commons.intersperse(language_ids, 0)

        phone_t = torch.LongTensor(phone_ids).unsqueeze(0).to(tts.device)
        tone_t = torch.LongTensor(tone_ids).unsqueeze(0).to(tts.device)
        lang_t = torch.LongTensor(language_ids).unsqueeze(0).to(tts.device)
        phone_len = torch.LongTensor([phone_t.shape[1]]).to(tts.device)
        bert = torch.zeros(1, 1024, phone_t.shape[1]).to(tts.device)
        ja_bert = torch.zeros(1, 768, phone_t.shape[1]).to(tts.device)
        g = speaker_emb.to(tts.device).unsqueeze(-1)
        prosody = prosody_emb.to(tts.device)

        t1 = time.time()
        with torch.no_grad():
            o, *_ = tts.model.infer(
                phone_t, phone_len, sid=None,
                tone=tone_t, language=lang_t,
                bert=bert, ja_bert=ja_bert,
                g=g, prosody=prosody,
                prosody_predictor=tts.prosody_predictor,
                noise_scale=0.667,
                noise_scale_w=0.8,
                length_scale=1.0,
            )

        audio = o[0, 0].cpu().numpy()
        out_path = os.path.join(OUTPUT_DIR, f"valtec4_{name}.wav")
        sf.write(out_path, audio, tts.sampling_rate)
        dur = time.time() - t1
        alen = len(audio) / tts.sampling_rate
        
        print(f"  [{i+1}] {name:12s} | {dur:.1f}s | {alen:.1f}s audio | OK")
        results.append("OK")
        
    except Exception as e:
        import traceback
        print(f"  [{i+1}] {name:12s} | FAIL: {e}")
        traceback.print_exc()
        results.append("FAIL")

ok = results.count("OK")
print(f"\n{'='*60}")
print(f"  COMPLETE: {ok}/{len(VOICES)}")
print(f"  Output: {OUTPUT_DIR}/valtec4_*.wav")
print(f"{'='*60}")
