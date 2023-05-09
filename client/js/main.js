let state = "login";

const chat_content_div = document.getElementById("chat-content-div");
const scroll_down_button = document.getElementById("scroll-down-button");

let scroll_locked = true;

const lock_scroll = () => {
    chat_content_div.scrollTop = chat_content_div.scrollHeight;
}

chat_content_div.addEventListener("scroll", () => {
    scroll_locked = chat_content_div.scrollTop + chat_content_div.clientHeight == chat_content_div.scrollHeight;
    scroll_down_button.hidden = scroll_locked;
});

scroll_down_button.addEventListener("click", () => {
    lock_scroll();
});

const socket = io();

const login = username => {
    if (state == "login") {
        socket.emit("login", { username });
        state = "chat";
    }
}

const chat = message => {
    socket.emit("chat", { message });
    document.getElementById("chat-input").value = "";
}

socket.on("login", ({ success, message }) => {
    if (success) {
        document.getElementById("login-div").remove();
        document.getElementById("chat-div").hidden = false;

        socket.emit("fetch", ({ limit: 2, offset: 1 }));
    } else {
        alert(message);
    }
});

socket.on("chat", ({ message, username, time }) => {
    const div = document.createElement("div");
    div.className = "chat-message";
    div.innerHTML = `<p><b>${username}: </b>${message}</p>`;
    chat_content_div.appendChild(div);
    if (scroll_locked) lock_scroll();
});

socket.on("fetch", ({ success, messages, offset, limit }) => {
    if (success) {
        alert(JSON.stringify(messages));
    } else {
        alert("Failed to fetch messages");
    }
});

document.addEventListener("keydown", e => {
    if (e.repeat) return;
    if (e.key == "Enter") {
        if (state == "login") {
            login(document.getElementById("username-input-label").value);
        } else if (state == "chat") {
            chat(document.getElementById("chat-input").value);
        }
    }
});

document.getElementById("login-button").addEventListener("click", () => {
    login(document.getElementById("username-input-label").value);
});

document.getElementById("send-button").addEventListener("click", () => {
    chat(document.getElementById("chat-input").value);
});