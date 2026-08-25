import json
import logging
import httpx
from typing import List, Dict, Any, Optional, Tuple
from app.ai.providers.base import BaseAIProvider
from app.core.exceptions import FlowzaException

logger = logging.getLogger("flowza.ai.gemini")

# Official fast and stable Gemini model fallback priority hierarchy
DEFAULT_GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.7-flash",
]


class GeminiProvider(BaseAIProvider):
    """
    Google Gemini AI Provider utilizing the native Gemini REST API (generateContent).
    Converts standard OpenAI-style message history and tool declarations into native Gemini format.
    Automatically preserves model thought signatures and groups multi-tool responses for reliable execution.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        models: Optional[List[str]] = None,
        timeout: int = 25,
    ):
        self.api_key = api_key
        self.timeout = timeout
        self.models = models if models and len(models) > 0 else DEFAULT_GEMINI_MODELS

    def _convert_messages_to_gemini(self, messages: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        """Convert standard messages list to Gemini systemInstruction and contents array."""
        system_instruction = None
        contents: List[Dict[str, Any]] = []

        for m in messages:
            role = m.get("role")
            content = m.get("content")
            raw_parts = m.get("_raw_parts")

            if role == "system":
                system_instruction = {"parts": [{"text": str(content)}]}
            elif role == "user":
                contents.append({
                    "role": "user",
                    "parts": [{"text": str(content or "")}],
                })
            elif role == "assistant":
                if raw_parts:
                    contents.append({
                        "role": "model",
                        "parts": raw_parts,
                    })
                else:
                    parts = []
                    if content:
                        parts.append({"text": str(content)})
                    if m.get("tool_calls"):
                        for tc in m["tool_calls"]:
                            fn = tc.get("function", {})
                            args = fn.get("arguments", "{}")
                            if isinstance(args, str):
                                try:
                                    args = json.loads(args)
                                except Exception:
                                    args = {}
                            parts.append({
                                "functionCall": {
                                    "name": fn.get("name", ""),
                                    "args": args,
                                }
                            })
                    if parts:
                        contents.append({
                            "role": "model",
                            "parts": parts,
                        })
            elif role == "tool":
                # Function result returned from Python tool handler
                tool_name = m.get("name", "")
                raw_res = m.get("content", "{}")
                try:
                    res_obj = json.loads(raw_res) if isinstance(raw_res, str) else raw_res
                except Exception:
                    res_obj = {"result": raw_res}

                fn_res_part = {
                    "functionResponse": {
                        "name": tool_name,
                        "response": res_obj,
                    }
                }

                # Group adjacent tool responses in a single user turn
                if contents and contents[-1].get("role") == "user" and any("functionResponse" in p for p in contents[-1].get("parts", [])):
                    contents[-1]["parts"].append(fn_res_part)
                else:
                    contents.append({
                        "role": "user",
                        "parts": [fn_res_part],
                    })

        return system_instruction, contents

    def _convert_tools_to_gemini(self, tools: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        """Convert OpenAI tool definitions to Gemini functionDeclarations."""
        if not tools:
            return None

        function_declarations = []
        for t in tools:
            fn = t.get("function", {})
            params = fn.get("parameters", {"type": "object", "properties": {}})
            # Normalize schema type to uppercase for Gemini
            normalized_params = json.loads(json.dumps(params))
            if "type" in normalized_params and isinstance(normalized_params["type"], str):
                normalized_params["type"] = normalized_params["type"].upper()

            function_declarations.append({
                "name": fn.get("name", ""),
                "description": fn.get("description", ""),
                "parameters": normalized_params,
            })

        return [{"functionDeclarations": function_declarations}]

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
                detail="Gemini API Key is not configured in backend/.env",
                code="AI_NOT_CONFIGURED",
            )

        system_instruction, contents = self._convert_messages_to_gemini(messages)
        gemini_tools = self._convert_tools_to_gemini(tools)

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
            },
        }

        if system_instruction:
            payload["systemInstruction"] = system_instruction

        if gemini_tools:
            payload["tools"] = gemini_tools

        last_error = None

        # Iterate through model fallback hierarchy (3.6-flash -> 3.5-flash -> 3.5-flash-lite -> ...)
        for idx, model_name in enumerate(self.models):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"

            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        url,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    )

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        return {"role": "assistant", "content": "", "tool_calls": [], "model_used": model_name}

                    parts = candidates[0].get("content", {}).get("parts", [])
                    content_text = ""
                    tool_calls = []

                    for p_idx, part in enumerate(parts):
                        if "text" in part:
                            content_text += part["text"]
                        if "functionCall" in part:
                            fc = part["functionCall"]
                            tool_calls.append({
                                "id": fc.get("id", f"call_{p_idx+1}"),
                                "name": fc.get("name", ""),
                                "arguments": fc.get("args", {}),
                            })

                    return {
                        "role": "assistant",
                        "content": content_text,
                        "tool_calls": tool_calls,
                        "model_used": model_name,
                        "_raw_parts": parts,
                    }

                # Handle Quota / Rate Limit / Unavailability
                err_text = response.text
                is_fallback_candidate = (
                    response.status_code in [429, 503, 404, 400]
                    or "RESOURCE_EXHAUSTED" in err_text
                    or "quota" in err_text.lower()
                    or "rate limit" in err_text.lower()
                )

                if is_fallback_candidate:
                    next_model = self.models[idx + 1] if idx + 1 < len(self.models) else None
                    logger.warning(
                        f"[GeminiProvider] Model '{model_name}' encountered status {response.status_code}. "
                        f"{f'Falling back to {next_model}...' if next_model else 'All fallback models tried.'}"
                    )
                    last_error = f"Model {model_name} error ({response.status_code}): {err_text[:120]}"
                    continue

                # Non-recoverable error
                raise FlowzaException(
                    status_code=502,
                    detail=f"Gemini API error ({response.status_code}): {err_text[:150]}",
                    code="AI_PROVIDER_ERROR",
                )

            except httpx.TimeoutException:
                logger.warning(f"[GeminiProvider] Model '{model_name}' timed out after {self.timeout}s. Falling back...")
                last_error = f"Model {model_name} timed out after {self.timeout}s"
                continue
            except FlowzaException:
                raise
            except Exception as e:
                logger.warning(f"[GeminiProvider] Error with model '{model_name}': {str(e)}. Falling back...")
                last_error = str(e)
                continue

        # If all models in hierarchy failed
        raise FlowzaException(
            status_code=502,
            detail=f"All configured Gemini models failed. Last error: {last_error}",
            code="AI_QUOTA_EXHAUSTED",
        )
