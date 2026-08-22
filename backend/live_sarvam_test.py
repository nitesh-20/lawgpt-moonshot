import asyncio
import os
import sys
import time

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.sarvam.config import SarvamConfig
from app.services.sarvam.client import SarvamClient
from app.services.sarvam.speech import SpeechToTextManager
from app.services.sarvam.tts import TextToSpeechManager
from app.services.sarvam.translate import TranslationManager
from app.services.sarvam.document import DocumentIntelligenceManager

async def run_tests():
    print("=== LIVE SARVAM INTEGRATION TEST ===")
    
    # 1. Connection Verification
    print(f"\n[PHASE 1] Checking Sarvam Configuration:")
    print(f"Enabled: {SarvamConfig.is_enabled()}")
    key = SarvamConfig.get_api_key()
    print(f"API Key config: {'Valid' if key and not 'your-sarvam' in key else 'Missing/Invalid'}")
    
    if not SarvamConfig.is_enabled():
        print("ERROR: Sarvam is not enabled. Cannot run live tests.")
        return

    # 2. TTS Test
    print("\n[PHASE 2] Testing TTS (Text-to-Speech):")
    tts_text = "Welcome to LawGPT AI OS."
    
    start_time = time.time()
    tts_res_1 = await TextToSpeechManager.synthesize(tts_text, "shubh", "en-IN")
    tts_latency_1 = round(time.time() - start_time, 3)
    
    start_time = time.time()
    tts_res_2 = await TextToSpeechManager.synthesize(tts_text, "shubh", "en-IN")
    tts_latency_2 = round(time.time() - start_time, 3)
    
    print(f"TTS Request 1 Status: {tts_res_1.get('status')} | Cached: {tts_res_1.get('cached')} | Latency: {tts_latency_1}s")
    if tts_res_1.get('audio_base64'):
        print(f"TTS 1 Audio length: {len(tts_res_1['audio_base64'])} chars")
    
    print(f"TTS Request 2 Status: {tts_res_2.get('status')} | Cached: {tts_res_2.get('cached')} | Latency: {tts_latency_2}s")

    # 3. Translation Test
    print("\n[PHASE 3] Testing Translation:")
    tests = [
        ("en-IN", "hi-IN", "Welcome to the legal intelligence platform."),
        ("hi-IN", "en-IN", "यह कानूनी सहायता के लिए एक एआई प्लेटफॉर्म है।"),
        ("en-IN", "ta-IN", "I am a virtual assistant."),
        ("en-IN", "te-IN", "Please upload your document for analysis.")
    ]
    
    for src, tgt, text in tests:
        start_time = time.time()
        res = await TranslationManager.translate(text, src, tgt)
        latency = round(time.time() - start_time, 3)
        print(f"Translate ({src} -> {tgt}): {res.get('status')} | Cached: {res.get('cached')} | Latency: {latency}s")
        print(f"  Result: {res.get('translated_text')}")
        
    # Check cache behavior for translation
    start_time = time.time()
    res_cached = await TranslationManager.translate(tests[0][2], tests[0][0], tests[0][1])
    latency_cached = round(time.time() - start_time, 3)
    print(f"Translate Cached ({tests[0][0]} -> {tests[0][1]}): {res_cached.get('status')} | Cached: {res_cached.get('cached')} | Latency: {latency_cached}s")

    # 4. Dummy STT Test
    print("\n[PHASE 4] Testing STT (Dummy Payload):")
    stt_res = await SpeechToTextManager.transcribe(b"invalid_audio_bytes", "test.wav", "hi-IN")
    print(f"STT Dummy Response: {stt_res.get('status')} | Message: {stt_res.get('message', 'No message')}")

    print("\n=== LIVE TESTS COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
