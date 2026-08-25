import json
import httpx
from typing import List, Dict, Any, Optional
from app.ai.providers.base import BaseAIProvider
from app.core.exceptions import FlowzaException


class OpenAICompatibleProvider(BaseAIProvider):
    """
    High-performance async provider for OpenAI, Groq, OpenRouter, DeepSeek, Ollama, etc.
    Communicates over standard /chat/completions HTTP schema with zero heavy SDK dependencies.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        timeout: int = 30,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    async def chat_complete(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: str = "auto",
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise FlowzaException(
                status_code=503,
                detail="AI provider API key is not configured.",
                code="AI_NOT_CONFIGURED",
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
            except httpx.TimeoutException:
                raise FlowzaException(
                    status_code=504,
                    detail="AI analysis timed out. Please try again.",
                    code="AI_TIMEOUT",
                )
            except Exception as e:
                raise FlowzaException(
                    status_code=502,
                    detail=f"Failed to communicate with AI provider: {str(e)}",
                    code="AI_PROVIDER_ERROR",
                )

        if response.status_code != 200:
            err_msg = "Unknown provider error"
            try:
                err_json = response.json()
                err_msg = err_json.get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            raise FlowzaException(
                status_code=502,
                detail=f"AI Provider error ({response.status_code}): {err_msg}",
                code="AI_PROVIDER_ERROR",
            )

        data = response.json()
        choice = data["choices"][0]["message"]
        content = choice.get("content") or ""

        parsed_tool_calls = []
        if choice.get("tool_calls"):
            for tc in choice["tool_calls"]:
                try:
                    args = json.loads(tc["function"]["arguments"])
                except Exception:
                    args = {}
                parsed_tool_calls.append({
                    "id": tc["id"],
                    "name": tc["function"]["name"],
                    "arguments": args,
                })

        return {
            "role": "assistant",
            "content": content,
            "tool_calls": parsed_tool_calls,
        }
