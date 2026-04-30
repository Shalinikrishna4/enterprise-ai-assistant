from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from utils.config import settings
from utils.logger import get_logger, metrics

logger = get_logger(__name__, service="llm_provider")


# ─── Data Models ──────────────────────────────────────────────────────────────

@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: int
    finish_reason: str = "stop"


@dataclass
class LLMMessage:
    role: str
    content: str


# ─── Base Provider ────────────────────────────────────────────────────────────

class LLMProvider(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: List[LLMMessage],
        max_tokens: int = None,
        temperature: float = None,
        stop_sequences: Optional[List[str]] = None,
    ) -> LLMResponse:
        ...

    @abstractmethod
    def is_available(self) -> bool:
        ...


# ─── GROQ PROVIDER (FIXED + FIRST) ────────────────────────────────────────────

class GroqProvider(LLMProvider):
    def __init__(self) -> None:
        from groq import AsyncGroq
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._model = settings.llm_model

    def is_available(self) -> bool:
        return bool(settings.groq_api_key)

    @retry(
        retry=retry_if_exception_type(Exception),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def complete(
        self,
        messages: List[LLMMessage],
        max_tokens: int = None,
        temperature: float = None,
        stop_sequences=None,
    ) -> LLMResponse:

        max_tokens = max_tokens or settings.llm_max_tokens
        temperature = temperature if temperature is not None else settings.llm_temperature

        api_messages = [{"role": m.role, "content": m.content} for m in messages]

        t0 = time.monotonic()
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=api_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        latency_ms = int((time.monotonic() - t0) * 1000)
        choice = response.choices[0]
        usage = response.usage

        metrics.record("llm_latency_ms", latency_ms, provider="groq")
        metrics.increment("llm_tokens", value=usage.total_tokens)

        return LLMResponse(
            content=choice.message.content or "",
            model=self._model,
            provider="groq",
            input_tokens=usage.prompt_tokens,
            output_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
            latency_ms=latency_ms,
            finish_reason=choice.finish_reason or "stop",
        )


# ─── ANTHROPIC ────────────────────────────────────────────────────────────────

class AnthropicProvider(LLMProvider):
    def __init__(self) -> None:
        import anthropic
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.llm_model

    def is_available(self) -> bool:
        return bool(settings.anthropic_api_key)

    async def complete(self, messages, max_tokens=None, temperature=None, stop_sequences=None):
        raise NotImplementedError("Anthropic disabled for now")


# ─── OPENAI ───────────────────────────────────────────────────────────────────

class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = "gpt-4o"

    def is_available(self) -> bool:
        return bool(settings.openai_api_key)

    async def complete(self, messages, max_tokens=None, temperature=None, stop_sequences=None):
        raise NotImplementedError("OpenAI disabled for now")


# ─── CLIENT ───────────────────────────────────────────────────────────────────

class LLMClient:

    def __init__(self) -> None:
        self._providers: Dict[str, LLMProvider] = {}
        self._initialize_providers()
        self._primary = settings.llm_provider

    def _initialize_providers(self) -> None:

        if settings.groq_api_key:
            self._providers["groq"] = GroqProvider()

        if settings.anthropic_api_key:
            self._providers["anthropic"] = AnthropicProvider()

        if settings.openai_api_key:
            self._providers["openai"] = OpenAIProvider()

        logger.info("llm_providers_ready", available=list(self._providers.keys()))

    async def complete(
        self,
        messages: List[LLMMessage],
        max_tokens: int = None,
        temperature: float = None,
        stop_sequences: Optional[List[str]] = None,
    ) -> LLMResponse:

        provider = self._providers.get(self._primary)

        if not provider:
            raise RuntimeError(f"Provider {self._primary} not available")

        return await provider.complete(messages, max_tokens, temperature, stop_sequences)

    async def complete_with_system(
        self,
        system_prompt: str,
        user_message: str,
        history: Optional[List[LLMMessage]] = None,
        **kwargs,
    ) -> LLMResponse:

        messages = [LLMMessage(role="system", content=system_prompt)]

        if history:
            messages.extend(history)

        messages.append(LLMMessage(role="user", content=user_message))

        return await self.complete(messages, **kwargs)


# ─── Singleton ────────────────────────────────────────────────────────────────

_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client