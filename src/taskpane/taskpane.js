/******************** Constants and Variables ***************/
const ws = window.WebSocket;
const crypto = require('crypto-browserify');
const markdownit = require('markdown-it');
const md = markdownit();

// DOM Elements
const chatarea = document.getElementById("chatcontents");
const inputbox = document.getElementById("user-input");
const loading = document.getElementById("loading");
const resCtrls = document.getElementById("responseCtrls");
const insertBtn = document.getElementById("insertBtn");

// State Variables
let currentMessage = null; // Track the ongoing bot message
let ongoingContent = ""; // Accumulate content for streaming messages
let chatmode = 0;
let doInsert = 0;

/******************** Event Listeners ***************/
document.addEventListener('keydown', function(ev) {
    if (ev.key === "Enter") {
        document.getElementById("submit").click();
    }
});

insertBtn.onclick = () => tryCatch(insertParagraph);

document.getElementById("editBtn").onclick = function() {
    newMsg('sys', 'Please type how you want to edit the above text and press "Send". \n If you want to substitue your original text in Word, select it before you click Send.');
    resCtrls.style.display = 'none';
    chatmode = 1;
}

/******************** Helper Functions ***************/
async function tryCatch(callback) {
    try {
        await callback();
    } catch (error) {
        console.error(error);
    }
}

async function insertParagraph() {
    await Word.run(async (context) => {
        let body = context.document.body;
        body.insertHtml(md.render(ongoingContent), Word.InsertLocation.end);
    });
}

/******************** Message Handling ***************/
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
        resCtrls.style.display = "block";
        loading.style.opacity = 0;
        loading.style.animation = "none";
    }, 3500); // Adjust timeout duration as needed
    chatmode = 0;
}

/******************** API Call Functions ***************/
document.getElementById("submit").onclick = () => {
    if (inputbox.value.trim() !== "") {
        newMsg("user", inputbox.value);
        loading.style.opacity = 1;
        loading.style.animation = "dots 1.5s infinite";
        history += "User: " + inputbox.value + "\n";
        call(inputbox.value, history, chatmode);
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

async function call(prompt, hist, mode) {
    currentMessage = null;
    resCtrls.style.display = "none";
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
        let cnt = '';

        switch (mode) {
            case 0: {
                cnt = "You are an AI assistant designed to help users generate, edit, and summarize text passages in Microsoft Word. You're capable of creating bullet lists, numbered lists and tables. Here is the user's chat history: " + hist + " which you can ignore if it's empty. Your task is to provide a clear, accurate, and relevant response to the user's request, ensuring it aligns with their goals of text generation, editing, or summarization. Use the chat history to maintain context and deliver a response that is helpful, concise, and tailored to their needs."
                                + "!CAUTION these following responses and their alikes are disallowed. 'I'm not accessible to the your history.' 'Hi, I'm ...(your name).' 'What would you like me to assist with?' 'Certainly! Below is the passage.'etc."
                                + "If you really don't know how to deal with the user's prompt, write a passage about it. If still not possible, tell the user that you can't help with the prompt and apologize."
                                + "REMINDER: please add this string in careful consideration at the start of your response if you think the user is wanting a passsage and your answer is proper in a formal document: '[INDOC=1]'";
                ongoingContent = ""; 
                break;
            }
            case 1: {
                cnt = "You are an AI assistant designed to help users generate, edit, and summarize text passages in Microsoft Word. You're capable of creating bullet lists, numbered lists and tables. Your task is to provide a clear, accurate, and relevant response to the user's request, ensuring it aligns with their goals of text generation, editing, or summarization. Use the chat history to maintain context and deliver a response that is helpful, concise, and tailored to their needs."
                                + "!CAUTION these following responses and their alikes are disallowed: 'I'm not accessible to the your history.' 'Hi, I'm ...(your name).' 'Sure! Here's the edited passage.' 'Certainly! Below is the passage.'etc."
                                + "You recently received an edit request, the original version is this: "
                                + ongoingContent + "Please edit the text based on the request you will receive from the user."
                                + "REMINDER: please add this string in careful consideration at the start of your response if you think the user is wanting a passsage and your answer is proper in a formal document: '[INDOC=2]'";
                ongoingContent = "";
                break;
            }
        }

        socket.onopen = () => {
            console.log('WebSocket 连接成功');
            socket.send(JSON.stringify({
                header: { app_id: APPID },
                parameter: {
                    chat: {
                        domain: 'lite',
                        temperature: 0.6,
                        max_tokens: 4096,
                    },
                },
                payload: {
                    message: {
                        text: [
                            {
                                role: 'system',
                                content: cnt,
                            },
                            {
                                role: 'user',
                                content: prompt,
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
            history += "AI: " + questionValue + "\n";
            questionValue = "";
        };
    });
}