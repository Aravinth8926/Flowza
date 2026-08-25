from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class BaseAIProvider(ABC):
    """Abstract interface for LLM completion providers."""

    @abstractmethod
    async def chat_complete(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: str = "auto",
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """
        Execute an async chat completion with optional tool declarations.
        Returns a normalized dict:
        {
            "role": "assistant",
            "content": "...",
            "tool_calls": [
                {
                    "id": "...",
                    "name": "...",
                    "arguments": {...}
                }
            ]
        }
        """
        pass
