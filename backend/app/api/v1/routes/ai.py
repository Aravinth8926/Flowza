from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.ai.schemas import AIChatRequest, AIChatResponse, AISuggestedQuestion
from app.ai.orchestrator import AIOrchestrator, _CONVERSATION_CACHE
from app.schemas.common import FlowzaResponse

router = APIRouter(prefix="/ai", tags=["Agentic AI Assistant"])


SUGGESTED_QUESTIONS_CATALOG: List[AISuggestedQuestion] = [
    # Supplier Prompts
    AISuggestedQuestion(
        category="Inventory",
        question="Which products are low in stock and need replenishment?",
        icon="AlertTriangle",
        suggested_for_role="supplier",
    ),
    AISuggestedQuestion(
        category="Sales",
        question="How are my sales and revenue performing this month?",
        icon="TrendingUp",
        suggested_for_role="supplier",
    ),
    AISuggestedQuestion(
        category="Orders",
        question="Which active customer orders require immediate attention?",
        icon="Clock",
        suggested_for_role="supplier",
    ),
    AISuggestedQuestion(
        category="Invoices",
        question="How much money is currently outstanding in unpaid invoices?",
        icon="DollarSign",
        suggested_for_role="supplier",
    ),

    # Vendor Prompts
    AISuggestedQuestion(
        category="Procurement",
        question="How much have I spent on purchase orders this month?",
        icon="ShoppingCart",
        suggested_for_role="vendor",
    ),
    AISuggestedQuestion(
        category="Suppliers",
        question="Which suppliers do I buy from the most by order volume?",
        icon="Users",
        suggested_for_role="vendor",
    ),
    AISuggestedQuestion(
        category="Invoices",
        question="What invoices are currently pending or overdue for payment?",
        icon="FileText",
        suggested_for_role="vendor",
    ),
    AISuggestedQuestion(
        category="Orders",
        question="Which of my purchase orders are currently in transit or processing?",
        icon="Truck",
        suggested_for_role="vendor",
    ),

    # Admin Prompts
    AISuggestedQuestion(
        category="Platform",
        question="What is the total platform trade volume and company growth this month?",
        icon="BarChart2",
        suggested_for_role="admin",
    ),
    AISuggestedQuestion(
        category="Operations",
        question="How many total suppliers and vendors are currently active on Flowza?",
        icon="Building",
        suggested_for_role="admin",
    ),
    AISuggestedQuestion(
        category="Invoices",
        question="What is the platform-wide invoice settlement and unpaid balance ratio?",
        icon="PieChart",
        suggested_for_role="admin",
    ),
]


@router.post("/chat", response_model=FlowzaResponse[AIChatResponse], status_code=status.HTTP_200_OK)
async def chat_with_assistant(
    payload: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Interact with Flowza's Agentic AI Business Assistant.
    The assistant analyzes the query, selects authorized Flowza tools, executes them
    under the user's authenticated identity, and produces a structured, actionable response.
    """
    orchestrator = AIOrchestrator(db=db, current_user=current_user)
    response_data = await orchestrator.execute_chat(
        message=payload.message,
        conversation_id=payload.conversation_id,
    )
    return FlowzaResponse(data=response_data, message="AI analysis complete")


@router.get("/suggested-questions", response_model=FlowzaResponse[List[AISuggestedQuestion]])
async def get_suggested_questions(
    current_user: User = Depends(get_current_user),
):
    """Retrieve contextual, role-tailored prompt suggestions."""
    user_role = current_user.role.name.lower()
    filtered = [
        q for q in SUGGESTED_QUESTIONS_CATALOG
        if q.suggested_for_role in [user_role, "all"]
    ]
    return FlowzaResponse(data=filtered, message="Suggested questions retrieved successfully")


@router.get("/history/{conversation_id}", response_model=FlowzaResponse[List[Dict[str, Any]]])
async def get_conversation_history(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retrieve ephemeral session message history."""
    history = _CONVERSATION_CACHE.get(conversation_id, [])
    return FlowzaResponse(data=history, message="Conversation history retrieved")


@router.delete("/history/{conversation_id}", response_model=FlowzaResponse[Dict[str, str]])
async def clear_conversation_history(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Clear conversation history from ephemeral session cache."""
    if conversation_id in _CONVERSATION_CACHE:
        del _CONVERSATION_CACHE[conversation_id]
    return FlowzaResponse(data={"conversation_id": conversation_id}, message="Conversation cleared")
