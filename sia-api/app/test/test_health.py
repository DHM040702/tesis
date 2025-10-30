import asyncio
import httpx

BASE="http://localhost:8000"

async def get(url, headers=None):
    async with httpx.AsyncClient(timeout=10.0) as c:
        r = await c.get(url, headers=headers)
        return r

def test_docs_up():
    r = asyncio.run(get(f"{BASE}/docs"))
    assert r.status_code in (200, 307, 308)

def test_openapi_json():
    r = asyncio.run(get(f"{BASE}/openapi.json"))
    assert r.status_code == 200
    data = r.json()
    assert "paths" in data
