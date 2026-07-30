from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str | None = None


class ApiResponse[T](BaseModel):
    success: bool = True
    data: T


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int


class PageResponse[T](ApiResponse[list[T]]):
    meta: PageMeta
