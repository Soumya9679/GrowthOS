import requests
import numpy as np

url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
payload = {"inputs": ["Hello world", "Learning spaced repetition is fun"]}
response = requests.post(url, json=payload)

if response.ok:
    data = response.json()
    arr = np.array(data)
    print("Response Type:", type(data))
    print("Array Shape:", arr.shape)
else:
    print("Error:", response.status_code, response.text)
