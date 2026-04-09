from pydantic import BaseModel


class AccountResponse(BaseModel):
    first_name: str | None
    last_name: str | None
    email: str
    company_name: str


class AccountUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    company_name: str