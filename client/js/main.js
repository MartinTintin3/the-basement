let state = "login";

const login_div = document.getElementById("login");
const chat_div = document.getElementById("chat");
const messages_div = document.getElementById("messages");
const scroll_down_button = document.getElementById("scroll-down-button");
const user_list_ul = document.getElementById("user-list-ul");

let scroll_locked = true;

const lock_scroll = () => {
    messages_div.scrollTop = messages_div.scrollHeight;
}

messages_div.addEventListener("scroll", () => {
    scroll_locked = messages_div.scrollTop + messages_div.clientHeight == messages_div.scrollHeight;
    scroll_down_button.hidden = scroll_locked;
});

scroll_down_button.addEventListener("click", () => {
    lock_scroll();
});

const socket = io();

const login = username => {
    if (state == "login") {
        socket.emit("login", { username });
    }
}

const message = data => {
    socket.emit("message", { data });
    document.getElementById("chat-input").value = "";
}

socket.on("login", ({ success, message }) => {
    if (success) {
        login_div.remove();
        chat_div.hidden = false;

        state = "chat";

        socket.emit("fetch", ({ limit: 2, offset: 1 }));
    } else {
        alert(message);
    }
});

socket.on("message", ({ data, author, time }) => {
    const div = document.createElement("div");
    div.className = "chat-message";
    div.innerHTML = `<p><b>${author}: </b>${data}</p>`;
    messages_div.appendChild(div);
    if (scroll_locked) lock_scroll();
});

socket.on("fetch", ({ success, messages, offset, limit }) => {
    if (success) {
        //alert(JSON.stringify(messages));
    } else {
        alert("Failed to fetch messages");
    }
});

socket.on("users", ({ success, users }) => {
    user_list_ul.innerHTML = "";
    users.forEach(username => {
        const li = document.createElement("li");
        li.className = "user-list-item";
        li.innerText = username;
        user_list_ul.appendChild(li);
    });
});

document.addEventListener("keydown", e => {
    if (e.repeat) return;
    if (e.key == "Enter") {
        if (state == "login") {
            login(document.getElementById("username-input-label").value);
        } else if (state == "chat") {
            message(document.getElementById("chat-input").value);
        }
    }
});

document.getElementById("login-button").addEventListener("click", () => {
    login(document.getElementById("username-input-label").value);
});

document.getElementById("send-button").addEventListener("click", () => {
    message(document.getElementById("chat-input").value);
});