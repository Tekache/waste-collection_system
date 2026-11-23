from datetime import date, timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants import TimeWindow, WasteType
from app.utils import utcnow


def ensure_not_past(value: date | None) -> date | None:
    # One day of slack so users ahead of UTC can still pick their local "today".
    if value is not None and value < utcnow().date() - timedelta(days=1):
        raise ValueError("The date cannot be in the past.")
    return value


class RequestCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    collection_address: str = Field(min_length=5, max_length=200)
    waste_type: WasteType
    description: str = Field(min_length=10, max_length=1000)
    preferred_date: date
    preferred_time_window: TimeWindow
    notes: str | None = Field(default=None, max_length=500)

    _check_date = field_validator("preferred_date")(ensure_not_past)


class RequestUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    collection_address: str | None = Field(default=None, min_length=5, max_length=200)
    waste_type: WasteType | None = None
    description: str | None = Field(default=None, min_length=10, max_length=1000)
    preferred_date: date | None = None
    preferred_time_window: TimeWindow | None = None
    notes: str | None = Field(default=None, max_length=500)
    status: Literal["Cancelled"] | None = None
    cancel_reason: str | None = Field(default=None, max_length=300)

    _check_date = field_validator("preferred_date")(ensure_not_past)


class ScheduleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    request_id: str
    scheduled_date: date
    time_window: TimeWindow
    notes: str | None = Field(default=None, max_length=500)

    _check_date = field_validator("scheduled_date")(ensure_not_past)


class ScheduleUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    scheduled_date: date | None = None
    time_window: TimeWindow | None = None
    notes: str | None = Field(default=None, max_length=500)

    _check_date = field_validator("scheduled_date")(ensure_not_past)


class TaskCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    request_id: str
    personnel_id: str
    notes: str | None = Field(default=None, max_length=500)


class TaskUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    status: Literal["In Progress", "Completed", "Cancelled"] | None = None
    personnel_id: str | None = None
    notes: str | None = Field(default=None, max_length=500)
