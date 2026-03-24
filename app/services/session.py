# app/services/session.py

import threading
from datetime import datetime, timedelta


class SessionManager:
    def __init__(self, ttl_minutes: int = 120):
        self._sessions: dict[str, dict] = {}
        self._ttl = timedelta(minutes=ttl_minutes)
        self._lock = threading.Lock()

    def create(self, session_id: str, system_context: str) -> None:
        with self._lock:
            self._sessions[session_id] = {
                "system_context": system_context,
                "history": [],
                "created_at": datetime.utcnow(),
            }

    def exists(self, session_id: str) -> bool:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return False
            if datetime.utcnow() - session["created_at"] > self._ttl:
                del self._sessions[session_id]
                return False
            return True

    def get(self, session_id: str) -> dict:
        with self._lock:
            return dict(self._sessions[session_id])

    def append(self, session_id: str, user_msg: str, assistant_msg: str) -> None:
        with self._lock:
            history = self._sessions[session_id]["history"]
            history.append({"role": "user", "content": user_msg})
            history.append({"role": "model", "content": assistant_msg})

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)


# Singleton — una sola instancia compartida por toda la app
session_manager = SessionManager()