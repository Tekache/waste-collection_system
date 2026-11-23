from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.constants import Role


class Base(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class RegisterIn(Base):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=200)


class LoginIn(Base):
    email: EmailStr
    password: str = Field(min_length=1, max_length=64)


class ProfileUpdate(Base):
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=200)


class AdminUserCreate(Base):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    role: Role
    phone: str | None = Field(default=None, max_length=30)


class AdminUserUpdate(Base):
    role: Role | None = None
    is_active: bool | None = None
