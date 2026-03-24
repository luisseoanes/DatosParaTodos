from pydantic import BaseModel


class StartSessionRequest(BaseModel):
    context: str


class MessageRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str


class DeleteResponse(BaseModel):
    detail: str