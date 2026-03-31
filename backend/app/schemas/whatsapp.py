from pydantic import BaseModel


class WhatsappConnectRequest(BaseModel):
    code: str
    phone_number_id: str
    waba_id: str


class WhatsappStatusResponse(BaseModel):
    connected: bool
    phone_number: str | None = None
    verified_at: str | None = None
