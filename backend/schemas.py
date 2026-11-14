from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ServiceCreate(BaseModel):
    service_name: str = Field(min_length=1, max_length=150)
    status: Literal["Running", "Stopped"]


class ServiceResponse(ServiceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ServerCreate(BaseModel):
    hostname: str = Field(min_length=1, max_length=100)
    ip_address: str = Field(min_length=1, max_length=45)

    cpu_percent: float = Field(ge=0, le=100)

    memory_total_gb: float = Field(gt=0)
    memory_available_gb: float = Field(ge=0)

    disk_total_gb: float = Field(gt=0)
    disk_available_gb: float = Field(ge=0)

    services: list[ServiceCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_capacity(self):
        if self.memory_available_gb > self.memory_total_gb:
            raise ValueError("Available memory cannot exceed total memory.")

        if self.disk_available_gb > self.disk_total_gb:
            raise ValueError("Available disk cannot exceed total disk.")

        return self


class ServerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hostname: str
    ip_address: str

    cpu_percent: float

    memory_total_gb: float
    memory_available_gb: float

    disk_total_gb: float
    disk_available_gb: float

    updated_at: datetime

    services: list[ServiceResponse]


ScriptLanguage = Literal[
    "powershell",
    "python",
    "bash",
]


class ScriptCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    language: ScriptLanguage
    description: str = Field(default="", max_length=500)
    when_to_use: str = Field(default="")
    why_to_use: str = Field(default="")
    content: str = Field(default="")


class ScriptUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    language: ScriptLanguage
    description: str = Field(default="", max_length=500)
    when_to_use: str = Field(default="")
    why_to_use: str = Field(default="")
    content: str


class ScriptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    language: ScriptLanguage
    description: str
    when_to_use: str
    why_to_use: str
    content: str
    created_at: datetime
    updated_at: datetime

class UseCaseExecuteRequest(BaseModel):
    server_id: int = Field(gt=0)
    use_case: str = Field(min_length=1)
    action_request_id: int | None = None