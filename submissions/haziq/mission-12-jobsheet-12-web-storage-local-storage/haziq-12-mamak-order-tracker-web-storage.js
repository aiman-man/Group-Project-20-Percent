"use strict";

/* ---------- Config ---------- */
const PREFIX = "haziq12_mamak_";
const KEYS = {
  cart: PREFIX + "cart",
  orders: PREFIX + "orders",
  counter: PREFIX + "counter",
  theme: PREFIX + "theme",
  table: PREFIX + "table"
};
const KEY_INFO = {
  [KEYS.cart]: "Current order (item id → quantity)",
  [KEYS.orders]: "Saved order history",
  [KEYS.counter]: "Last order number used",
  [KEYS.theme]: "Light or dark theme",
  [KEYS.table]: "Selected table"
};
const MENU = [
  { id: "rc", name: "Roti Canai", price: 150, icon: "🥞" },
  { id: "rt", name: "Roti Telur", price: 250, icon: "🍳" },
  { id: "nl", name: "Nasi Lemak", price: 400, icon: "🍚" },
  { id: "mg", name: "Mee Goreng Mamak", price: 600, icon: "🍜" },
  { id: "mgi", name: "Maggi Goreng", price: 550, icon: "🍝" },
  { id: "tt", name: "Teh Tarik", price: 220, icon: "🍵" },
  { id: "mi", name: "Milo Ais", price: 300, icon: "🧋" },
  { id: "ko", name: "Kopi O", price: 180, icon: "☕" }
];
const TABLES = Array.from({ length: 10 }, (_, i) => "Table " + (i + 1)).concat("Takeaway");

/* ---------- Storage helpers (all wrapped in try/catch) ---------- */
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast("Could not save: storage is full or blocked."); return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  },
  keys() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) out.push(k);
      }
    } catch (e) { /* ignore */ }
    return out.sort();
  }
};

/* ---------- State ---------- */
let cart = {};
let orders = [];

function loadState() {
  const rawCart = store.get(KEYS.cart, {});
  cart = {};
  if (rawCart && typeof rawCart === "object" && !Array.isArray(rawCart)) {
    MENU.forEach(m => {
      const q = Number(rawCart[m.id]);
      if (Number.isInteger(q) && q > 0) cart[m.id] = q;
    });
  }
  const rawOrders = store.get(KEYS.orders, []);
  orders = Array.isArray(rawOrders) ? rawOrders.filter(o => o && Array.isArray(o.items)) : [];
}

/* ---------- Utilities ---------- */
const $ = id => document.getElementById(id);
const money = cents => "RM " + (cents / 100).toFixed(2);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const menuItem = id => MENU.find(m => m.id === id);
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("themeBtn").textContent = theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
}
$("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  store.set(KEYS.theme, next);
  renderStorage();
});

/* ---------- Menu + table selectors ---------- */
function renderMenu() {
  $("menu").innerHTML = MENU.map(m =>
    `<button type="button" data-id="${m.id}"><span class="icon">${m.icon}</span><span>${esc(m.name)}</span><span class="price">${money(m.price)}</span></button>`
  ).join("");
}
function renderTableSelectors() {
  $("tableSel").innerHTML = TABLES.map(t => `<option>${esc(t)}</option>`).join("");
  const saved = store.get(KEYS.table, TABLES[0]);
  $("tableSel").value = TABLES.includes(saved) ? saved : TABLES[0];
  $("filterTable").innerHTML = ["All tables"].concat(TABLES).map(t => `<option>${esc(t)}</option>`).join("");
}
$("tableSel").addEventListener("change", e => { store.set(KEYS.table, e.target.value); renderStorage(); });
$("filterTable").addEventListener("change", renderHistory);

/* ---------- Cart ---------- */
function saveCart() {
  if (Object.keys(cart).length) store.set(KEYS.cart, cart);
  else store.remove(KEYS.cart);
}
function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, q]) => sum + menuItem(id).price * q, 0);
}
function renderCart() {
  const ids = Object.keys(cart);
  $("cartEmpty").hidden = ids.length > 0;
  $("cartList").innerHTML = ids.map(id => {
    const m = menuItem(id), q = cart[id];
    return `<li><span class="name">${m.icon} ${esc(m.name)}</span>
      <span class="qty"><button type="button" data-act="dec" data-id="${id}" aria-label="Decrease">−</button><b>${q}</b><button type="button" data-act="inc" data-id="${id}" aria-label="Increase">+</button></span>
      <span>${money(m.price * q)}</span></li>`;
  }).join("");
  $("cartTotal").textContent = money(cartTotal());
}
$("menu").addEventListener("click", e => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  cart[btn.dataset.id] = (cart[btn.dataset.id] || 0) + 1;
  saveCart(); renderCart(); renderStorage();
});
$("cartList").addEventListener("click", e => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  cart[id] = (cart[id] || 0) + (btn.dataset.act === "inc" ? 1 : -1);
  if (cart[id] <= 0) delete cart[id];
  saveCart(); renderCart(); renderStorage();
});
$("clearCartBtn").addEventListener("click", () => {
  cart = {}; saveCart(); renderCart(); renderStorage();
});

/* ---------- Orders ---------- */
$("placeBtn").addEventListener("click", () => {
  if (!Object.keys(cart).length) { toast("Add at least one item first."); return; }
  const no = Number(store.get(KEYS.counter, 0)) + 1;
  const items = Object.entries(cart).map(([id, qty]) => {
    const m = menuItem(id);
    return { id, name: m.name, price: m.price, qty };
  });
  const order = { no, time: new Date().toISOString(), table: $("tableSel").value, items, total: cartTotal() };
  orders.unshift(order);
  if (!store.set(KEYS.orders, orders)) { orders.shift(); return; }
  store.set(KEYS.counter, no);
  cart = {}; saveCart();
  renderAll();
  toast("Order #" + no + " saved for " + order.table + ".");
});
$("history").addEventListener("click", e => {
  const btn = e.target.closest("button[data-del]");
  if (!btn) return;
  const no = Number(btn.dataset.del);
  if (!confirm("Delete order #" + no + "?")) return;
  orders = orders.filter(o => o.no !== no);
  store.set(KEYS.orders, orders);
  renderAll();
});
function renderHistory() {
  const filter = $("filterTable").value;
  const list = orders.filter(o => filter === "All tables" || o.table === filter);
  $("histEmpty").hidden = list.length > 0;
  $("history").innerHTML = list.map(o => {
    const d = new Date(o.time);
    return `<li>
      <div class="head"><span>Order #${o.no} · ${esc(o.table)}</span><span>${money(o.total)}</span></div>
      <div class="meta">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      <ul>${o.items.map(i => `<li>${i.qty} × ${esc(i.name)}</li>`).join("")}</ul>
      <div class="foot"><span></span><button class="del" type="button" data-del="${o.no}">Delete</button></div></li>`;
  }).join("");
}

/* ---------- Summary ---------- */
function renderStats() {
  const today = new Date().toDateString();
  const todays = orders.filter(o => new Date(o.time).toDateString() === today);
  const sales = todays.reduce((s, o) => s + o.total, 0);
  const allSales = orders.reduce((s, o) => s + o.total, 0);
  const tally = {};
  todays.forEach(o => o.items.forEach(i => { tally[i.name] = (tally[i.name] || 0) + i.qty; }));
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  $("stats").innerHTML = [
    ["Orders today", todays.length],
    ["Sales today", money(sales)],
    ["Best seller today", best ? `${esc(best[0])} (${best[1]})` : "–"],
    ["All-time sales", money(allSales)]
  ].map(([label, value]) => `<div class="stat"><small>${label}</small><strong>${value}</strong></div>`).join("");
}

/* ---------- Storage inspector ---------- */
function renderStorage() {
  const rows = store.keys().map(k => {
    let size = 0;
    try { size = k.length + (localStorage.getItem(k) || "").length; } catch (e) { /* ignore */ }
    return `<tr><td><code>${esc(k)}</code></td><td>${esc(KEY_INFO[k] || "Other")}</td><td>${size}</td></tr>`;
  });
  $("storageTable").querySelector("tbody").innerHTML =
    rows.length ? rows.join("") : `<tr><td colspan="3">Nothing stored yet.</td></tr>`;
}
$("exportBtn").addEventListener("click", () => {
  const data = { exportedAt: new Date().toISOString(), orders, currentOrder: cart };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mamak-orders.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Exported mamak-orders.json");
});
$("resetBtn").addEventListener("click", () => {
  if (!confirm("Delete ALL saved orders and settings for this app?")) return;
  store.keys().forEach(k => store.remove(k));
  loadState();
  applyTheme("light");
  renderTableSelectors();
  renderAll();
  toast("All data cleared.");
});

/* ---------- Sync between tabs ---------- */
window.addEventListener("storage", e => {
  if (e.key === null || (e.key && e.key.startsWith(PREFIX))) {
    loadState();
    applyTheme(store.get(KEYS.theme, "light"));
    renderAll();
  }
});

/* ---------- Start ---------- */
function renderAll() { renderCart(); renderHistory(); renderStats(); renderStorage(); }
applyTheme(store.get(KEYS.theme, "light"));
loadState();
renderMenu();
renderTableSelectors();
renderAll();
