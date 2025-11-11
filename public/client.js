const messagesEl = document.getElementById("messages");
const textEl = document.getElementById("text");
const sendBtn = document.getElementById("send");
const presenceEl = document.getElementById("presence");
const nameEl = document.getElementById("name");
const saveNameBtn = document.getElementById("saveName");
const saveStatusEl = document.getElementById("saveStatus");
const themeSelect = document.getElementById("themeSelect");

const storedName = localStorage.getItem("displayName") || "";
nameEl.value = storedName;

function showSavedStatus(text = "Saved") {
  saveStatusEl.textContent = text;
  saveStatusEl.style.opacity = "1";
  clearTimeout(showSavedStatus._t);
  showSavedStatus._t = setTimeout(() => { saveStatusEl.style.opacity = "0.85"; }, 50);
  clearTimeout(showSavedStatus._t2);
  showSavedStatus._t2 = setTimeout(() => { saveStatusEl.textContent = ""; saveStatusEl.style.opacity = "1"; }, 1500);
}

function getDisplayName() {
  const n = nameEl.value.trim();
  return n.length > 0 ? n : "Anon";
}

saveNameBtn.addEventListener("click", () => {
  localStorage.setItem("displayName", getDisplayName());
  showSavedStatus("Saved ✓");
});

function appendMessage({ username, text, at }) {
  const wrapper = document.createElement("div");
  wrapper.className = "msg";

  const meta = document.createElement("div");
  meta.className = "meta";
  const time = new Date(at);
  meta.textContent = `${username} • ${time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  const body = document.createElement("div");
  body.textContent = text;

  wrapper.appendChild(meta);
  wrapper.appendChild(body);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setPresence(n) {
  presenceEl.textContent = `${n} online`;
}

let ws;
function connect() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${location.host}`);

  ws.addEventListener("open", () => {
    sendBtn.disabled = false;
  });

  ws.addEventListener("close", () => {
    sendBtn.disabled = true;
    setTimeout(connect, 1000);
  });

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "chat") {
        appendMessage(data);
      } else if (data.type === "presence") {
        setPresence(data.connected);
      }
    } catch (err) {
      console.error("Parse/message error", err);
    }
  });

  ws.addEventListener("error", (e) => {
    console.error("WebSocket error", e);
  });
}

// Theme handling
const THEME_KEY = "theme";
const THEMES = ["theme-light", "theme-dark-blue", "theme-inverted", "theme-violet"];

function applyTheme(themeClass) {
  THEMES.forEach((cls) => document.body.classList.remove(cls));
  document.body.classList.add(themeClass);
  if (themeSelect) themeSelect.value = themeClass;
}

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (THEMES.includes(stored)) return stored;
  return "theme-light";
}

let currentTheme = getInitialTheme();
applyTheme(currentTheme);

themeSelect.addEventListener("change", (e) => {
  const value = e.target.value;
  if (THEMES.includes(value)) {
    currentTheme = value;
    localStorage.setItem(THEME_KEY, currentTheme);
    applyTheme(currentTheme);
  }
});

connect();

function sendMessage() {
  const text = textEl.value.trim();
  if (text.length === 0) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket not open; message not sent");
    return;
  }
  const msg = { type: "chat", username: getDisplayName(), text };
  ws.send(JSON.stringify(msg));
  textEl.value = "";
  textEl.focus();
}

sendBtn.addEventListener("click", sendMessage);
textEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
