import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("public"));

function broadcastJson(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

function nowIso() {
  return new Date().toISOString();
}

let nextClientId = 1;

wss.on("connection", (ws) => {
  const clientId = nextClientId++;
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  broadcastJson({ type: "presence", connected: wss.clients.size, at: nowIso() });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "chat" && typeof msg.text === "string" && msg.text.trim().length > 0) {
        const safeName = typeof msg.username === "string" && msg.username.trim().length > 0 ? msg.username.trim().slice(0, 32) : "Anon";
        const message = {
          type: "chat",
          id: `${Date.now()}-${clientId}`,
          username: safeName,
          text: msg.text.slice(0, 1000),
          at: nowIso()
        };
        broadcastJson(message);
      }
    } catch {}
  });

  ws.on("close", () => {
    broadcastJson({ type: "presence", connected: wss.clients.size, at: nowIso() });
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(interval);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
