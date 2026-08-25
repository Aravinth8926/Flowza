import time
import json
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.config import settings
from app.ai.schemas import AIChatResponse, AIToolCallDetail, AISuggestedAction
from app.ai.prompts import FLOWZA_SYSTEM_PROMPT, build_context_prompt
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.openai_provider import OpenAICompatibleProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.mock_provider import MockAIProvider
from app.ai.tools.registry import get_authorized_tools, get_tool_by_name


# In-memory session conversation storage for ephemeral follow-ups
_CONVERSATION_CACHE: Dict[str, List[Dict[str, Any]]] = {}


def _get_provider() -> BaseAIProvider:
    """Instantiate the configured AI provider."""
    # 1. Gemini Multi-Model Fallback Provider
    if settings.GEMINI_API_KEY:
        return GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            models=settings.gemini_models_list,
            timeout=settings.AI_TIMEOUT,
        )
    # 2. OpenAI / Groq / OpenRouter Provider
    if settings.AI_PROVIDER == "openai" and settings.AI_API_KEY:
        return OpenAICompatibleProvider(
            api_key=settings.AI_API_KEY,
            base_url=settings.AI_BASE_URL,
            model=settings.AI_MODEL,
            timeout=settings.AI_TIMEOUT,
        )
    # 3. Offline Deterministic Mock Provider
    return MockAIProvider()


def _derive_suggested_actions(used_categories: set, user_role: str) -> List[AISuggestedAction]:
    """Generate safe, role-appropriate navigation action chips based on data consulted."""
    actions = []
    if "Inventory" in used_categories:
        actions.append(AISuggestedAction(label="View Warehouse Inventory", path="/inventory", icon="Package"))
    if "Invoices" in used_categories:
        actions.append(AISuggestedAction(label="Review Invoices & Payments", path="/invoices", icon="FileText"))
    if "Orders" in used_categories:
        actions.append(AISuggestedAction(label="Track Active Orders", path="/orders", icon="Truck"))
    if "Analytics" in used_categories:
        actions.append(AISuggestedAction(label="Open Analytics Dashboard", path="/dashboard", icon="BarChart3"))
    return actions[:3]


class AIOrchestrator:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user
        self.provider = _get_provider()

    async def execute_chat(
        self,
        message: str,
        conversation_id: Optional[str] = None,
    ) -> AIChatResponse:
        start_time = time.time()
        conv_id = conversation_id or str(uuid.uuid4())

        # 1. Retrieve authorized tools for current user
        authorized_tools = get_authorized_tools(self.current_user)
        tool_schemas = [t.to_openai_schema() for t in authorized_tools]

        # 2. Build conversation context
        company_name = None
        try:
            if hasattr(self.current_user, "company") and self.current_user.company:
                company_name = self.current_user.company.company_name
        except Exception:
            company_name = None

        context_prompt = build_context_prompt(
            user_role=self.current_user.role.name if hasattr(self.current_user, "role") and self.current_user.role else "user",
            company_name=company_name,
            user_name=self.current_user.full_name,
        )

        history = _CONVERSATION_CACHE.get(conv_id, [])
        # Keep last 6 messages to preserve context without exceeding token budgets
        trimmed_history = history[-6:]

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": f"{FLOWZA_SYSTEM_PROMPT}\n\n{context_prompt}"}
        ]
        messages.extend(trimmed_history)
        messages.append({"role": "user", "content": message})

        # 3. Agentic Multi-Step Reasoning Loop
        tool_calls_count = 0
        executed_tool_details: List[AIToolCallDetail] = []
        used_sources = set()
        final_answer = ""

        while tool_calls_count < settings.AI_MAX_TOOL_CALLS:
            try:
                completion = await self.provider.chat_complete(
                    messages=messages,
                    tools=tool_schemas if tool_schemas else None,
                    tool_choice="auto",
                )
            except Exception as exc:
                if not isinstance(self.provider, MockAIProvider):
                    self.provider = MockAIProvider()
                    completion = await self.provider.chat_complete(
                        messages=messages,
                        tools=tool_schemas if tool_schemas else None,
                        tool_choice="auto",
                    )
                else:
                    raise exc

            tool_calls = completion.get("tool_calls", [])

            # If no tool calls requested, we have reached the final synthesized answer
            if not tool_calls:
                final_answer = completion.get("content", "")
                break

            # Record assistant turn in messages with all tool calls and raw thought parts
            messages.append({
                "role": "assistant",
                "content": completion.get("content"),
                "tool_calls": [
                    {
                        "id": tc.get("id", f"call_{i+1}"),
                        "type": "function",
                        "function": {
                            "name": tc.get("name", ""),
                            "arguments": json.dumps(tc.get("arguments", {})),
                        },
                    }
                    for i, tc in enumerate(tool_calls)
                ],
                "_raw_parts": completion.get("_raw_parts"),
            })

            # Execute requested tool calls under authenticated user identity
            for tc in tool_calls:
                tool_calls_count += 1
                t_name = tc.get("name", "")
                t_args = tc.get("arguments", {})

                tool_def = get_tool_by_name(t_name, self.current_user)
                if not tool_def:
                    t_result = {"error": f"Unauthorized or unknown tool '{t_name}'."}
                else:
                    try:
                        t_result = await tool_def.handler(self.db, self.current_user, t_args)
                        used_sources.add(tool_def.category)
                    except Exception as e:
                        t_result = {"error": f"Tool execution failed: {str(e)}"}

                # Record detail
                result_str = json.dumps(t_result, default=str)
                executed_tool_details.append(AIToolCallDetail(
                    tool_name=t_name,
                    arguments=t_args,
                    result_summary=f"Retrieved {len(str(result_str))} bytes from {t_name}",
                ))

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", f"call_{tool_calls_count}"),
                    "name": t_name,
                    "content": result_str,
                })

        # Graceful handling if loop ceiling exceeded
        if not final_answer:
            if tool_calls_count >= settings.AI_MAX_TOOL_CALLS:
                final_answer = (
                    "I reached the maximum analysis step limit while processing your request. "
                    "Here is a summary of the data retrieved so far."
                )
            else:
                final_answer = "I was unable to complete the analysis. Please refine your query."

        # 4. Save to conversation cache
        _CONVERSATION_CACHE[conv_id] = _CONVERSATION_CACHE.get(conv_id, []) + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": final_answer},
        ]

        duration_ms = int((time.time() - start_time) * 1000)
        suggested_actions = _derive_suggested_actions(used_sources, self.current_user.role.name)

        return AIChatResponse(
            conversation_id=conv_id,
            message=final_answer,
            tool_calls=executed_tool_details,
            sources=sorted(list(used_sources)),
            suggested_actions=suggested_actions,
            execution_time_ms=duration_ms,
        )
