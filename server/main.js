const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");

(async () => {

let chat_stmt = null;

await new Promise((resolve, reject) => {
	db.serialize(() => {
		db.run("CREATE TABLE IF NOT EXISTS message (data TEXT, username TEXT, time INTEGER)");

		chat_stmt = db.prepare("INSERT INTO message VALUES (?, ?, ?)");

		resolve();
	});
});

process.on("SIGINT", () => {
	db.close();
	process.exit();
});

app.use(express.static("client"));

const users = [];

io.on("connection", socket => {
	const user = {
		username: null,
		socket,
	};

	console.log("a user connected");
	socket.on("login", ({ username }) => {
		if (user.username != null) return socket.emit("login", { success: false, message: "You already have a username" });
		if (users.find(u => u.username == username)) return socket.emit("login", { success: false, message: "Username already taken" });
		if (username.length < 3) return socket.emit("login", { success: false, message: "Username too short" });
		if (username.length > 16) return socket.emit("login", { success: false, message: "Username too long" });

		user.username = username;
		users.push(user);
		console.log(`User logged in: ${username}`);
		socket.emit("login", { success: true });
	});

	socket.on("chat", ({ message}) => {
		if (message.length <= 0 || message.length > 256) return;
		const time = Date.now();

		chat_stmt.run(message, user.username, time);
		console.log(`User ${user.username} sent message: ${message}`);

		io.emit("chat", { username: user.username, message, time });
	});

	socket.on("disconnect", () => {
		console.log("user disconnected" + (user.username ? `: ${user.username}` : ""));
		if (user.username) users.splice(users.indexOf(user), 1);
	});
});

server.listen(3000, () => {
	console.log("listening on *:3000");
});

})();