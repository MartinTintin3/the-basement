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
let fetch_stmt = null;

await new Promise((resolve, reject) => {
	db.serialize(() => {
		db.run("CREATE TABLE IF NOT EXISTS message (data TEXT, username TEXT, time INTEGER)");

		chat_stmt = db.prepare("INSERT INTO message VALUES (?, ?, ?)");
		fetch_stmt = db.prepare("SELECT * FROM message ORDER BY time DESC LIMIT ? OFFSET ?");
		resolve();
	});
});

process.on("SIGINT", () => {
	chat_stmt.finalize();
	fetch_stmt.finalize();
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
		io.emit("users", { success: true, users: users.map(u => u.username) });
	});

	socket.on("chat", ({ message}) => {
		if (message.length <= 0 || message.length > 256 || user.username == null) return;
		const time = Date.now();

		chat_stmt.run(message, user.username, time);
		console.log(`User ${user.username} sent message: ${message}`);

		io.emit("chat", { username: user.username, message, time });
	});

	socket.on("fetch", ({ offset, limit }) => {
		if (user.username == null) socket.emit("fetch", { success: false, message: "You must be logged in to fetch messages" });
		if (offset == null) offset = 0;
		if (offset < 0) return socket.emit("fetch", { success: false, message: "Offset must be positive" });
		if (limit < 1) return socket.emit("fetch", { success: false, message: "Limit must be at least 1" });
		if (limit > 100) return socket.emit("fetch", { success: false, message: "Limit must be less than 100" });
		
		fetch_stmt.all(limit, offset, (err, rows) => {
			if (err) return socket.emit("fetch", { success: false, message: "Error fetching messages" });

			socket.emit("fetch", { success: true, messages: rows, offset, limit });
		});
	});

	socket.on("users", () => {
		if (user.username == null) socket.emit("users", { success: false, message: "You must be logged in to fetch users" });

		socket.emit("users", { success: true, users: users.map(u => u.username) });
	});

	socket.on("disconnect", () => {
		console.log("socket disconnected");
		if (user.username) {
			console.log(`"${user.username}" logged out`);
			users.splice(users.indexOf(user), 1);
			io.emit("users", { success: true, users: users.map(u => u.username) });
		}
	});
});

server.listen(3000, () => {
	console.log("listening on *:3000");
});

})();