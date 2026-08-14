from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Optional, Any, List

T = TypeVar('T')

class FlowzaResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = "Operation successful"
    data: Optional[T] = None

class ErrorDetails(BaseModel):
    code: str
    message: str
    details: Optional[List[Any]] = Field(default_factory=list)

class FlowzaErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetails
