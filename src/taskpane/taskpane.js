/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global document, Office, Word */

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {

  }
});

export async function run() {
  return Word.run(async (context) => {
    
    // code here

    // insert a paragraph at the end of the document.
    const paragraph = context.document.body.insertParagraph("Hello World", Word.InsertLocation.end);

    // change the paragraph color to blue.
    paragraph.font.color = "blue";

    await context.sync();
  });
}


const ws = window.WebSocket; 
const crypto = require('crypto-browserify');
const markdownit = require('markdown-it');
const md = markdownit();

const chatarea = document.getElementById("chatcontents");
const inputbox = document.getElementById("user-input");
const loading = document.getElementById("loading");

let currentMessage = null; // Track the ongoing bot message
let ongoingContent = ""; // Accumulate content for streaming messages

document.addEventListener('keydown', function(ev) {
    if (ev.key === "Enter") {
        document.getElementById("submit").click();
    }
});

function newMsg(role, msgContent, isStream = false) {
    if (role === "bot" && isStream && currentMessage) {
        // Append content to the ongoing content
        ongoingContent += msgContent;
        currentMessage.innerHTML = md.render(ongoingContent); // Render Markdown to HTML
        chatarea.scrollTop = chatarea.scrollHeight;
        return;
    }

    const messageElement = document.createElement("div");
    messageElement.className = `${role}msg`;
    messageElement.innerHTML = md.render(msgContent); // Render Markdown to HTML
    messageElement.style.opacity = 0;
    messageElement.style.transform = "scale(0.95)";
    messageElement.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    chatarea.appendChild(messageElement);

    setTimeout(() => {
        messageElement.style.opacity = 1;
        messageElement.style.transform = "scale(1)";
    }, 50);

    chatarea.scrollTop = chatarea.scrollHeight;

    if (role === "bot" && isStream) {
        currentMessage = messageElement; // Set the current message for streaming
        ongoingContent = msgContent; // Initialize ongoing content
    }
}

let responseTimeout;

function resetResponseTimeout() {
    clearTimeout(responseTimeout);
    responseTimeout = setTimeout(() => {
        finalizeMessage(); // End the current streaming session
        loading.style.opacity = 0;
        loading.style.animation = "none";
    }, 3500); // Adjust timeout duration as needed
}

function finalizeMessage() {
    // Whole response ends here
    currentMessage = null;
    ongoingContent = ""; // Reset accumulated content
}

document.getElementById("submit").onclick = () => {
    if (inputbox.value.trim() !== "") {
        newMsg("user", inputbox.value);
        loading.style.opacity = 1;
        loading.style.animation = "dots 1.5s infinite";
        history += "User: " + inputbox.value + "\n";
        call(inputbox.value, history);
        inputbox.value = "";
    }
}

// Spark Config
const XFHX_AI = {
    host: 'spark-api.xf-yun.com',
    path: '/v1/chat',
    APPID: '5ea95521',
    APISecret: 'NjI1ZmU1MzM1YmFmYTZiMDE0ZGQ0NmRk',
    APIKey: 'fa1260aea1e497a441fa91dbab66daa5'
}
var socket;
let questionValue = '';
let history = '';
 
async function call(prompt, hist) {
    return new Promise((resolve, reject) => {
        const { host, path, APISecret, APIKey, APPID } = XFHX_AI;
        const dateString = new Date().toGMTString();
        const tmp = `host: ${host}\ndate: ${dateString}\nGET ${path} HTTP/1.1`;
        const signature = crypto.createHmac('sha256', APISecret).update(tmp).digest('base64');
        const authorization_origin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        const buff = Buffer.from(authorization_origin);
        const authorization = buff.toString('base64');
        const signUrl = `wss://${host}${path}?authorization=${authorization}&date=${encodeURIComponent(dateString)}&host=${host}`;
        socket = new ws(signUrl);
 
        socket.onopen = () => {
            console.log('WebSocket 连接成功');
            socket.send(JSON.stringify({
                header: { app_id: APPID },
                parameter: {
                    chat: {
                        domain: 'lite',
                        temperature: 0.5,
                        max_tokens: 1024,
                    },
                },
                payload: {
                    message: {
                        text: [
                            {
                                role: 'user',
                                content: `You are an AI engaging in a conversation with a user. Here is the user's chat history: ${hist} The user has just sent this latest message: ${prompt} Your task is to provide a clear, accurate, and relevant response to the user's latest message based on the chat history.`,
                            },
                        ]
                    }
                }
            }));
        };
        
        socket.onmessage = (event) => {
            const obj = JSON.parse(event.data);
            resetResponseTimeout();
            const texts = obj["payload"]["choices"]["text"];
            texts.forEach((item) => {
                newMsg("bot", item.content, true); // Append content chunk by chunk
            });
        };
        
        socket.onerror = (error) => {
            newMsg("sys", 'WebSocket error observed: ' + error);
            reject(error);
        };
        
        socket.onclose = () => {
            finalizeMessage(); // Ensure the message is finalized when the socket closes
            history += "AI: " + questionValue + "\n";
            questionValue = "";
        };
    });
}
