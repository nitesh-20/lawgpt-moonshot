import httpx
import json
import asyncio

BASE_URL = "http://localhost:8000/api/v1"

async def test_endpoint(client, method, path, **kwargs):
    try:
        if method == "GET":
            resp = await client.get(f"{BASE_URL}{path}", **kwargs)
        elif method == "POST":
            resp = await client.post(f"{BASE_URL}{path}", **kwargs)
        
        try:
            data = resp.json()
        except:
            data = resp.text
            
        return {
            "path": path,
            "status": resp.status_code,
            "data": data,
            "error": None
        }
    except Exception as e:
        return {
            "path": path,
            "status": None,
            "data": None,
            "error": str(e)
        }

async def run_audit():
    async with httpx.AsyncClient(timeout=30.0) as client:
        results = []
        
        # 1. Health Endpoints
        print("Testing Health Endpoints...")
        results.append(await test_endpoint(client, "GET", "/health"))
        results.append(await test_endpoint(client, "GET", "/ready"))
        results.append(await test_endpoint(client, "GET", "/version"))
        
        # 2. Agents
        print("Testing Agents...")
        results.append(await test_endpoint(client, "GET", "/agents"))
        
        # 3. Compliance
        print("Testing Compliance...")
        results.append(await test_endpoint(client, "POST", "/compliance/audit", json={
            "document_id": "test_doc_1",
            "document_text": "This is a standard NDA for employees in India.",
            "regulations": ["SEBI", "FEMA"],
            "jurisdiction": "India"
        }))
        
        # 4. Drafting
        print("Testing Drafting...")
        results.append(await test_endpoint(client, "GET", "/drafting/templates"))
        results.append(await test_endpoint(client, "POST", "/drafting/generate", json={
            "doc_type": "employment_agreement",
            "user_instructions": "Make it strict",
            "variables": {"jurisdiction": "India", "employee_name": "John Doe"}
        }))
        
        # 5. Research
        print("Testing Research...")
        results.append(await test_endpoint(client, "POST", "/research/query", json={
            "query": "What are the rules for data privacy?",
            "filters": {"jurisdiction": "India"}
        }))
        
        # 6. Orchestrator
        print("Testing Orchestrator...")
        results.append(await test_endpoint(client, "GET", "/orchestrator/agents"))
        results.append(await test_endpoint(client, "POST", "/orchestrator/chat", json={
            "message": "Hello, can you help me draft a contract?",
            "session_id": "test_session_1"
        }))
        
        # 7. Voice (without file for now, expecting validation error or proper failure)
        print("Testing Voice...")
        results.append(await test_endpoint(client, "POST", "/voice/chat"))

        # Output Results
        print("\n=== AUDIT RESULTS ===")
        for r in results:
            print(f"Path: {r['path']} | Status: {r['status']}")
            
            # Simple check for mock/placeholder signs
            data_str = json.dumps(r['data']) if isinstance(r['data'], (dict, list)) else str(r['data'])
            
            is_mock = any(x in data_str.lower() for x in ["mock", "placeholder", "dummy", "lorem", "sample_"])
            
            print(f"Contains Mock Data? {'YES' if is_mock else 'NO'}")
            print(f"Response: {str(data_str)[:150]}...")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(run_audit())
