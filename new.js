const body_json = {
    "model":"Qwen/Qwen2.5-7B-Instruct", 

    "messages": [
        {"role":"user","content": ""}
    ],

    "stream": false,
    "max_tokens":512,
    "stop":["null"],
    "temperature":0.7,
    "top_p":0.7,
    "top_k":50,
    "frequency_penalty":0.5,
    "n":1,
    "response_format": {"type":"text"}
};

const options = {
    method: 'POST',
    headers: {Authorization: 'Bearer sk-qrciwygapgkrriyebxndgzhtbtxvtbeeqsexnguvddonokva', 'Content-Type': 'application/json'},
    body: JSON.stringify(body_json)
};
  
fetch('https://api.siliconflow.cn/v1/chat/completions', options)
.then(response => response.json())
.then(response => console.log(response))
.catch(err => console.error(err));
