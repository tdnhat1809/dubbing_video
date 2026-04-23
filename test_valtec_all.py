"""
Extract Valtec embeddings for all 10 missing voices from Resources
Uses reference audio in .pt files to extract (speaker_emb, prosody_emb)
"""
import sys, os, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')
os.environ['PYTHONUTF8'] = '1'

import torch
import soundfile as sf
import numpy as np

RES_DIR = r"C:\Bankme Auto Media\tv_engine\data\resources"
VAL_DIR = r"C:\Bankme Auto Media\tv_engine\data\models\valtec\voices"
VALTEC_CKPT = r"C:\Bankme Auto Media\tv_engine\data\models\valtec\models\zeroshot\G_175000_fp16.pth"
VALTEC_CFG = r"C:\Bankme Auto Media\tv_engine\data\models\valtec\models\zeroshot\config.json"
OUTPUT_DIR = r"C:\python\ommivoice\test_voices_valtec"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Find missing voices
res_files = {f.replace('.pt',''): f for f in os.listdir(RES_DIR) if f.endswith('.pt')}
val_files = {f.replace('Vietnam_','').replace('.pt',''): f for f in os.listdir(VAL_DIR) if f.endswith('.pt')}
missing = sorted(set(res_files.keys()) - set(val_files.keys()))

print("="*60)
print(f"  Extract Valtec embeddings for {len(missing)} missing voices")
print("="*60)
for v in missing:
    print(f"  - {v}")

# Load Valtec engine
from valtec_tts import ZeroShotTTS
print(f"\n  Loading Valtec engine...")
tts = ZeroShotTTS(checkpoint_path=VALTEC_CKPT, config_path=VALTEC_CFG)
print(f"  Ready on {tts.device}\n")

# Extract embeddings for each missing voice
extracted = []
for i, voice_name in enumerate(missing):
    res_file = os.path.join(RES_DIR, res_files[voice_name])
    
    try:
        # Load reference audio from .pt
        data = torch.load(res_file, map_location='cpu', weights_only=False)
        audio_tensor = data['audio'].numpy().squeeze()
        ref_text = data.get('ref_text', '')
        
        # Save temp WAV
        tmp_wav = os.path.join(OUTPUT_DIR, f"_tmp_ref_{voice_name}.wav")
        sf.write(tmp_wav, audio_tensor, 24000)
        
        # Extract embeddings using Valtec
        speaker_emb, prosody_emb = tts.extract_embeddings(tmp_wav)
        
        # Save as Valtec voice format
        out_pt = os.path.join(VAL_DIR, f"Vietnam_{voice_name}.pt")
        torch.save((speaker_emb.cpu(), prosody_emb.cpu()), out_pt)
        
        # Cleanup
        os.remove(tmp_wav)
        
        print(f"  [{i+1:2d}/{len(missing)}] {voice_name:30s} | spk={speaker_emb.shape} pro={prosody_emb.shape} | OK")
        extracted.append(voice_name)
        
    except Exception as e:
        print(f"  [{i+1:2d}/{len(missing)}] {voice_name:30s} | FAIL: {e}")

print(f"\n  Extracted: {len(extracted)}/{len(missing)}")

# ============================================
# Now test ALL voices (original 15 + new 10)
# ============================================
print(f"\n{'='*60}")
print(f"  Testing ALL voices with vietnormalizer")
print("="*60)

import re, unicodedata
from vietnormalizer import VietnameseNormalizer
from viphoneme import T2IPA
try:
    from underthesea import word_tokenize
    HAS_UT = True
except ImportError:
    HAS_UT = False

normalizer = VietnameseNormalizer()

def vi2IPA_fixed(text):
    norm = normalizer.normalize(text)
    TK = word_tokenize(norm) if HAS_UT else norm.split()
    IPA = ""
    for tk in TK:
        ipa = T2IPA(tk).replace(" ", "_")
        if ipa == "" or (ipa[0] == "[" and ipa[-1] == "]"):
            IPA += tk + " "
        else:
            IPA += ipa + " "
    return re.sub(' +', ' ', IPA).strip()

import src.vietnamese.phonemizer as pm
TONE_MAP = {1: 0, 2: 2, 3: 3, 4: 4, 5: 1, 6: 5}
PUNCT = set(',.!?;:\'"--\u2014\u2026()[]{}')

def phonemes_vn(text):
    ipa = vi2IPA_fixed(text)
    if not ipa or ipa.strip() in ['', '.']: return pm.text_to_phonemes_charbased(text)
    phones, tones, w2p = [], [], []
    for token in ipa.strip().split():
        if all(c in PUNCT or c == '.' for c in token):
            for c in token:
                if c in PUNCT: phones.append(c); tones.append(0); w2p.append(1)
            continue
        for syl in token.split('_'):
            if not syl: continue
            sp, st, i = [], 0, 0
            while i < len(syl):
                ch = syl[i]
                if ch.isdigit(): st = TONE_MAP.get(int(ch), 0)
                elif unicodedata.combining(ch): pass
                elif ch in {'\u02b7','\u02b0','\u02d0'}:
                    if sp: sp[-1] += ch
                elif ch in {'\u0361','\u035c'}: pass
                elif ch not in PUNCT: sp.append(ch)
                i += 1
            if sp: phones.extend(sp); tones.extend([st]*len(sp)); w2p.append(len(sp))
    return phones, tones, w2p

def ttp(text, use_viphoneme=True):
    p, t, w = phonemes_vn(text)
    return ["_"]+p+["_"], [0]+t+[0], [1]+w+[1]

pm.text_to_phonemes = ttp

from src.text import cleaned_text_to_sequence
from src.vietnamese.text_processor import process_vietnamese_text
from src.nn import commons

TEXT = "Xin chào các bạn, đây là giọng nói của tôi. Hôm nay thời tiết rất đẹp, chúc mọi người một ngày tốt lành."

# Get ALL voice files now
all_voices = sorted([f for f in os.listdir(VAL_DIR) if f.endswith('.pt')])
print(f"\n  Total voices: {len(all_voices)}\n")

results = []
for i, vf in enumerate(all_voices):
    name = vf.replace("Vietnam_", "").replace(".pt", "")
    vpath = os.path.join(VAL_DIR, vf)
    
    try:
        emb = torch.load(vpath, map_location=tts.device, weights_only=False)
        spk, pro = emb
        
        processed = process_vietnamese_text(TEXT)
        phones, tones_raw, w2p = ttp(processed)
        pid, tid, lid = cleaned_text_to_sequence(phones, tones_raw, "VI")
        if getattr(tts.hps.data, 'add_blank', True):
            pid = commons.intersperse(pid, 0)
            tid = commons.intersperse(tid, 0)
            lid = commons.intersperse(lid, 0)
        
        pt = torch.LongTensor(pid).unsqueeze(0).to(tts.device)
        tt = torch.LongTensor(tid).unsqueeze(0).to(tts.device)
        lt = torch.LongTensor(lid).unsqueeze(0).to(tts.device)
        pl = torch.LongTensor([pt.shape[1]]).to(tts.device)
        bert = torch.zeros(1, 1024, pt.shape[1]).to(tts.device)
        jb = torch.zeros(1, 768, pt.shape[1]).to(tts.device)
        g = spk.to(tts.device).unsqueeze(-1)
        p = pro.to(tts.device)
        
        t1 = time.time()
        with torch.no_grad():
            o, *_ = tts.model.infer(pt, pl, sid=None, tone=tt, language=lt,
                bert=bert, ja_bert=jb, g=g, prosody=p,
                prosody_predictor=tts.prosody_predictor,
                noise_scale=0.667, noise_scale_w=0.8, length_scale=1.0)
        
        audio = o[0, 0].cpu().numpy()
        is_new = "(NEW)" if name in [m for m in missing] else ""
        out = os.path.join(OUTPUT_DIR, f"final_{name}.wav")
        sf.write(out, audio, tts.sampling_rate)
        dur = time.time() - t1
        alen = len(audio) / tts.sampling_rate
        
        print(f"  [{i+1:2d}/{len(all_voices)}] {name:30s} | {alen:.1f}s | OK {is_new}")
        results.append("OK")
    except Exception as e:
        print(f"  [{i+1:2d}/{len(all_voices)}] {name:30s} | FAIL: {e}")
        results.append("FAIL")

ok = sum(1 for r in results if r == "OK")
print(f"\n{'='*60}")
print(f"  COMPLETE: {ok}/{len(all_voices)} voices")
print(f"  Output: {OUTPUT_DIR}/final_*.wav")
print(f"{'='*60}")
