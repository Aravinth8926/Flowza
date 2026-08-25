from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1500, description="The user's query or prompt")
    conversation_id: Optional[str] = Field(None, description="Optional conversation identifier")


class AIToolCallDetail(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    result_summary: Optional[str] = None


class AISuggestedAction(BaseModel):
    label: str
    action_type: str = "navigate"  # "navigate"
    path: str
    icon: Optional[str] = "ArrowRight"


class AIChatResponse(BaseModel):
    conversation_id: str
    message: str
    tool_calls: List[AIToolCallDetail] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)  # e.g., ["Inventory", "Recent Orders", "Invoices"]
    suggested_actions: List[AISuggestedAction] = Field(default_factory=list)
    execution_time_ms: int = 0


class AISuggestedQuestion(BaseModel):
    category: str
    question: str
    icon: str = "Sparkles"
    suggested_for_role: str  # "supplier", "vendor", "admin", "all"
