import asyncio
from collections.abc import Awaitable, Callable
from copy import deepcopy
from time import monotonic
from typing import Any


class PublicContentCache:
    """Small single-process cache for public, already-published response data.

    Production currently runs one API process. A future multi-process deployment
    can replace this boundary with Redis without changing route behavior.
    """

    def __init__(self) -> None:
        self._values: dict[tuple[Any, ...], tuple[float, int, Any]] = {}
        self._generation = 0
        self._lock = asyncio.Lock()

    async def get_or_create(
        self,
        key: tuple[Any, ...],
        factory: Callable[[], Awaitable[Any]],
        ttl_seconds: int = 120,
    ) -> Any:
        now = monotonic()
        cached = self._values.get(key)
        if cached and cached[0] > now and cached[1] == self._generation:
            return deepcopy(cached[2])

        async with self._lock:
            now = monotonic()
            cached = self._values.get(key)
            if cached and cached[0] > now and cached[1] == self._generation:
                return deepcopy(cached[2])
            generation = self._generation
            value = await factory()
            if generation == self._generation:
                self._values[key] = (now + ttl_seconds, generation, deepcopy(value))
            return value

    def invalidate(self) -> None:
        self._generation += 1
        self._values.clear()


public_content_cache = PublicContentCache()
