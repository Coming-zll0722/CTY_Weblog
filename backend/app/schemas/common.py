from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str | None = None


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int


class PageResponse(ApiResponse[list[T]], Generic[T]):
    meta: PageMeta
