from time import monotonic
from typing import Protocol

import httpx


class ProviderTester(Protocol):
    def test(self, provider_id: str, api_key: str) -> int: ...


class HttpProviderTester:
    def test(self, provider_id: str, api_key: str) -> int:
        started = monotonic()
        headers = {"Authorization": f"Bearer {api_key}"}
        with httpx.Client(timeout=10.0, follow_redirects=False) as client:
            if provider_id == "deepseek":
                response = client.get("https://api.deepseek.com/user/balance", headers=headers)
            elif provider_id == "tavily":
                response = client.get("https://api.tavily.com/usage", headers=headers)
            else:
                raise ValueError("provider test is not implemented")
        response.raise_for_status()
        return round((monotonic() - started) * 1000)
