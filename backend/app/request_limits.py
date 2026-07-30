from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any


class _PayloadTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    def __init__(self, app: Callable[..., Awaitable[None]], limits: dict[str, int]) -> None:
        self.app = app
        self.limits = limits

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: Callable[[], Awaitable[dict[str, Any]]],
        send: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        limit = self.limits.get(str(scope.get("path", "")))
        if limit is None:
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        try:
            content_length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            content_length = limit + 1
        if content_length > limit:
            await self._send_too_large(send)
            return

        received = 0

        async def limited_receive() -> dict[str, Any]:
            nonlocal received
            message = await receive()
            if message.get("type") == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise _PayloadTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _PayloadTooLarge:
            await self._send_too_large(send)

    @staticmethod
    async def _send_too_large(
        send: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        body = json.dumps({"detail": "Request body too large"}).encode("utf-8")
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})
