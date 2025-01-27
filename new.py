import requests

url = "https://api.siliconflow.cn/v1/chat/completions"

payload = {
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "messages": [
        {
            "role": "user",
            "content": input()
        }
    ],
    "stream": False,
    "max_tokens": 512,
    "stop": ["null"],
    "temperature": 0.7,
    "top_p": 0.7,
    "top_k": 50,
    "frequency_penalty": 0.5,
    "n": 1,
    "response_format": {"type": "text"}
}
headers = {
    "Authorization": "Bearer sk-qrciwygapgkrriyebxndgzhtbtxvtbeeqsexnguvddonokva",
    "Content-Type": "application/json"
}

response = requests.request("POST", url, json=payload, headers=headers)

print(response.text)