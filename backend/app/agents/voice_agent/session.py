import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from loguru import logger
from app.database.firestore import get_firestore_client
from app.core.config import settings


class ConversationManager:
    """
    Manages text logs and turn context for individual sessions.
    """
    def __init__(self) -> None:
        self.history: List[Dict[str, Any]] = []

    def add_turn(self, role: str, text: str, audio_b64: str | None = None) -> None:
        self.history.append({
            "role": role,
            "text": text,
            "audio_b64": audio_b64,
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z"
        })

    def get_context(self, limit: int = 5) -> str:
        """
        Formats last N turns as context string.
        """
        turns = self.history[-limit:]
        return "\n".join(f"{t['role'].capitalize()}: {t['text']}" for t in turns)


class VoiceSessionManager:
    """
    Manages multi-session lifecycle, recovery, status, and state persistence.
    """
    def __init__(self, data_dir: Path | None = None) -> None:
        self.data_dir = data_dir or settings.BASE_DIR / "data" / "voice_sessions"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.collection_name = "voice_sessions"

    async def get_or_create_session(self, session_id: str, default_lang: str = "en-IN") -> Dict[str, Any]:
        """
        Retrieves or initializes a session state.
        """
        if session_id in self.active_sessions:
            # Touch session
            self.active_sessions[session_id]["updated_at"] = time.time()
            return self.active_sessions[session_id]

        # Check in storage (Firestore/local) for recovery
        recovered = await self._load_session(session_id)
        if recovered:
            self.active_sessions[session_id] = recovered
            return recovered

        # Create new
        new_session = {
            "session_id": session_id,
            "created_at": time.time(),
            "updated_at": time.time(),
            "status": "active",
            "language": default_lang,
            "history": []
        }
        self.active_sessions[session_id] = new_session
        await self._save_session(session_id, new_session)
        return new_session

    async def add_history(self, session_id: str, role: str, text: str, audio_b64: str | None = None) -> None:
        """
        Appends a conversation message to the session.
        """
        session = await self.get_or_create_session(session_id)
        session["history"].append({
            "role": role,
            "text": text,
            "audio_b64": audio_b64,
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z"
        })
        session["updated_at"] = time.time()
        await self._save_session(session_id, session)

    async def update_status(self, session_id: str, status: str) -> None:
        """
        Updates session state status ('active', 'paused', 'interrupted', 'completed').
        """
        session = await self.get_or_create_session(session_id)
        session["status"] = status
        session["updated_at"] = time.time()
        await self._save_session(session_id, session)

    async def _save_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """
        Persists session changes to Firestore or local storage.
        """
        # Save to local cache first
        self.active_sessions[session_id] = data

        # Write to Firestore
        client = None
        try:
            client = get_firestore_client()
        except Exception:
            client = None

        if client is not None:
            try:
                # Merge update
                doc_ref = client.collection(self.collection_name).document(session_id)
                doc_ref.set(data)
                logger.info(f"Voice session {session_id} saved to Firestore.")
                return
            except Exception as e:
                logger.warning(f"Firestore session write failed: {e}. Trying local file.")

        # Local fallback
        try:
            filepath = self.data_dir / f"{session_id}.json"
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as ex:
            logger.error(f"Failed to write voice session locally: {ex}")

    async def _load_session(self, session_id: str) -> Dict[str, Any] | None:
        """
        Loads session from DB or local directory.
        """
        # 1. Firestore Read
        client = None
        try:
            client = get_firestore_client()
        except Exception:
            client = None

        if client is not None:
            try:
                doc = client.collection(self.collection_name).document(session_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.warning(f"Firestore session load failed: {e}. Trying local.")

        # 2. Local Fallback
        filepath = self.data_dir / f"{session_id}.json"
        if filepath.exists():
            try:
                with open(filepath, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return None
