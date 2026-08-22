import json

try:
    with open("data/local_vector_store.json", "r") as f:
        data = json.load(f)
        if data:
            print("Keys:", data[0].keys())
            print("Document ID:", set(item.get('document_id') for item in data))
except Exception as e:
    print(e)
