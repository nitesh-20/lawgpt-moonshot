import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.sarvam.config import SarvamConfig
from app.services.sarvam.client import SarvamClient
from app.services.sarvam.speech import SpeechToTextManager
from app.services.sarvam.tts import TextToSpeechManager
from app.services.sarvam.translate import TranslationManager
from app.services.sarvam.document import DocumentIntelligenceManager

async def run_tests():
    print("--- STARTING SARVAM MODULE VERIFICATION ---")
    
    print("\n1. Verifying SarvamConfig...")
    print(f"Enabled by default: {SarvamConfig._enabled}")
    
    # We expect is_enabled to be False if API key is not set or placeholder
    is_enabled = SarvamConfig.is_enabled()
    print(f"is_enabled() returns: {is_enabled}")
    
    print("\n2. Testing STT Fallback...")
    stt_res = await SpeechToTextManager.transcribe(b"dummy", "dummy.wav", "en-IN")
    print(f"STT Response: {stt_res}")
    
    print("\n3. Testing TTS Fallback...")
    tts_res = await TextToSpeechManager.synthesize("Hello", "meera", "en-IN")
    print(f"TTS Response: {tts_res}")
    
    print("\n4. Testing Translate Fallback...")
    trans_res = await TranslationManager.translate("Hello", "en-IN", "hi-IN")
    print(f"Translate Response: {trans_res}")
    
    print("\n5. Testing Document Intelligence Fallback...")
    doc_res = await DocumentIntelligenceManager.extract_document(b"dummy pdf", "dummy.pdf")
    print(f"Document Response: {doc_res}")

    print("\n--- ALL IMPORTS COMPILED SUCCESSFULLY ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
