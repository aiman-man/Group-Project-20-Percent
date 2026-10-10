"use strict";

/* ---------- Config ---------- */
const PREFIX = "haziq13_bus_";
const KEYS = { draft: PREFIX + "draft", started: PREFIX + "started" };
const KEY_INFO = {
  [KEYS.draft]: "Booking in progress",
  [KEYS.started]: "When this tab's session began"
};
const CITIES = ["Ipoh", "Johor Bahru", "Kota Bharu", "Kuala Lumpur", "Kuantan", "Melaka", "Penang"];
const DIST = [ // approximate road distance (km), used only to make sample fares
  ["Kuala Lumpur", "Ipoh", 205], ["Kuala Lumpur", "Penang", 355], ["Kuala Lumpur", "Johor Bahru", 330],
  ["Kuala Lumpur", "Kuantan", 260], ["Kuala Lumpur", "Kota Bharu", 470], ["Kuala Lumpur", "Melaka", 150],
  ["Ipoh", "Penang", 160], ["Ipoh", "Johor Bahru", 535], ["Ipoh", "Kuantan", 330],
  ["Ipoh", "Kota Bharu", 410], ["Ipoh", "Melaka", 350], ["Penang", "Johor Bahru", 690],
  ["Penang", "Kuantan", 520], ["Penang", "Kota Bharu", 360], ["Penang", "Melaka", 500],
  ["Johor Bahru", "Kuantan", 380], ["Johor Bahru", "Kota Bharu", 700], ["Johor Bahru", "Melaka", 200],
  ["Kuantan", "Kota Bharu", 360], ["Kuantan", "Melaka", 370], ["Kota Bharu", "Melaka", 620]
];
const KM = {};
DIST.forEach(([a, b, km]) => { KM[pairKey(a, b)] = km; });
const TIMES = ["08:00", "10:30", "14:00", "20:30", "23:30"];
const ROWS = 10, COLS = ["A", "B", "C", "D"];
const STEPS = ["Trip", "Seats", "Passengers", "Review", "Ticket"];
const SERVICE_FEE = 100; // sen per ticket

function pairKey(a, b) { return [a, b].sort().join("|"); }

/* ---------- sessionStorage helpers (wrapped in try/catch) ---------- */
const store = {
  get(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast("Could not save: storage is full or blocked."); return false; }
  },
  remove(key) { try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ } },
  keys() {
    const out = [];
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(PREFIX)) out.push(k);
      }
    } catch (e) { /* ignore */ }
    return out.sort();
  }
};

/* ---------- Utilities ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = sen => "RM " + (sen / 100).toFixed(2);
const pad = n => String(n).padStart(2, "0");
const isoDate = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return isoDate(d); }
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- State ---------- */
function freshState() {
  return {
    step: 1,
    trip: { from: "Kuala Lumpur", to: "Penang", date: addDays(1), time: "08:00", pax: 1 },
    seats: [], seatSig: "", passengers: [], phone: "", booking: null
  };
}
function loadState() {
  const d = store.get(KEYS.draft, null), f = freshState();
  if (!d || typeof d !== "object") return f;
  try {
    const t = d.trip || {};
    const s = {
      step: Number.isInteger(d.step) && d.step >= 1 && d.step <= 5 ? d.step : 1,
      trip: {
        from: CITIES.includes(t.from) ? t.from : f.trip.from,
        to: CITIES.includes(t.to) ? t.to : f.trip.to,
        date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : f.trip.date,
        time: TIMES.includes(t.time) ? t.time : f.trip.time,
        pax: [1, 2, 3, 4].includes(t.pax) ? t.pax : 1
      },
      seats: Array.isArray(d.seats) ? d.seats.filter(x => typeof x === "string") : [],
      seatSig: typeof d.seatSig === "string" ? d.seatSig : "",
      passengers: Array.isArray(d.passengers) ? d.passengers.map(String) : [],
      phone: typeof d.phone === "string" ? d.phone : "",
      booking: d.booking && typeof d.booking === "object" ? d.booking : null
    };
    if (s.step === 5 && !s.booking) s.step = 4;
    return s;
  } catch (e) { return f; }
}
let state = loadState();
if (store.get(KEYS.started, null) === null) store.set(KEYS.started, new Date().toISOString());
function save() { store.set(KEYS.draft, state); renderInspector(); }

/* ---------- Trip helpers ---------- */
const tripSig = () => [state.trip.from, state.trip.to, state.trip.date, state.trip.time].join("|");
function fareSen() {
  const km = KM[pairKey(state.trip.from, state.trip.to)] || 0;
  return Math.round(Math.round((5 + km * 0.09) * 2) / 2 * 100);
}
function hash(str) { let h = 5381; for (const c of str) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h; }
const isTaken = seat => hash(tripSig() + seat) % 100 < 28;
const seatOrder = id => parseInt(id, 10) * 10 + COLS.indexOf(id.slice(-1));
const sortSeats = list => list.slice().sort((a, b) => seatOrder(a) - seatOrder(b));
const totalSen = () => (fareSen() + SERVICE_FEE) * state.trip.pax;
const fmtDate = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/* ---------- Rendering ---------- */
function renderProgress() {
  $("progress").innerHTML = STEPS.map((s, i) => {
    const n = i + 1, cls = n < state.step ? "done" : n === state.step ? "active" : "";
    return `<li class="${cls}">${n}. ${s}</li>`;
  }).join("");
}
function opts(list, sel) { return list.map(x => `<option${x === sel ? " selected" : ""}>${esc(x)}</option>`).join(""); }
function fareLine() {
  const km = KM[pairKey(state.trip.from, state.trip.to)];
  return state.trip.from === state.trip.to ? "Choose two different cities."
    : `Fare: <strong>${money(fareSen())}</strong> per passenger (+ ${money(SERVICE_FEE)} service fee) · about ${km} km`;
}
function renderStep() {
  const t = state.trip, v = $("stepView");
  if (state.step === 1) {
    v.innerHTML = `<h2>1. Choose your trip</h2><div class="grid2">
      <label>From<select data-f="from">${opts(CITIES, t.from)}</select></label>
      <label>To<select data-f="to">${opts(CITIES, t.to)}</select></label>
      <label>Date<input type="date" data-f="date" min="${addDays(0)}" value="${esc(t.date)}"></label>
      <label>Departure<select data-f="time">${opts(TIMES, t.time)}</select></label>
      <label>Passengers<select data-f="pax">${opts(["1", "2", "3", "4"], String(t.pax))}</select></label></div>
      <p class="fare" id="fareLine">${fareLine()}</p>`;
  } else if (state.step === 2) {
    let rows = "";
    for (let r = 1; r <= ROWS; r++) {
      const btn = c => { const id = r + c, sel = state.seats.includes(id);
        return `<button type="button" class="seat${sel ? " sel" : ""}" data-seat="${id}"${isTaken(id) ? " disabled" : ""}>${id}</button>`; };
      rows += `<div class="seatrow"><span class="no">${r}</span>${btn("A")}${btn("B")}<span class="aisle"></span>${btn("C")}${btn("D")}</div>`;
    }
    v.innerHTML = `<h2>2. Pick your seat${t.pax > 1 ? "s" : ""}</h2>
      <p class="hint">${esc(t.from)} → ${esc(t.to)} · ${fmtDate(t.date)} · ${t.time}</p>
      <div class="legend"><span><i style="background:#fff"></i>Free</span><span><i style="background:var(--brand)"></i>Yours</span><span><i style="background:var(--taken);border-color:var(--taken)"></i>Taken</span></div>
      <div class="bus"><div class="front">🧑‍✈️ Driver</div>${rows}</div>
      <p class="fare" id="seatCount"></p>`;
    renderSeatCount();
  } else if (state.step === 3) {
    const seats = sortSeats(state.seats);
    let cards = "";
    for (let i = 0; i < t.pax; i++) {
      cards += `<div class="pcard"><h3>Passenger ${i + 1} · Seat ${esc(seats[i] || "?")}</h3>
        <label>Full name<input type="text" data-name="${i}" maxlength="60" value="${esc(state.passengers[i] || "")}" autocomplete="off"></label></div>`;
    }
    v.innerHTML = `<h2>3. Passenger details</h2>${cards}
      <label>Contact phone (Malaysia)<input type="tel" data-f="phone" placeholder="012-3456789" value="${esc(state.phone)}"></label>
      <p class="hint">Nothing here is kept after you close this tab.</p>`;
  } else if (state.step === 4) {
    const seats = sortSeats(state.seats);
    v.innerHTML = `<h2>4. Review your booking</h2>
      <table class="sum">
      <tr><th>Route</th><td>${esc(t.from)} → ${esc(t.to)}</td></tr>
      <tr><th>Departure</th><td>${fmtDate(t.date)}, ${t.time}</td></tr>
      <tr><th>Seats</th><td>${seats.map(esc).join(", ")}</td></tr>
      <tr><th>Passengers</th><td>${state.passengers.slice(0, t.pax).map((n, i) => `${i + 1}. ${esc(n)} (${esc(seats[i])})`).join("<br>")}</td></tr>
      <tr><th>Phone</th><td>${esc(state.phone)}</td></tr>
      <tr><th>Fare</th><td>${t.pax} × ${money(fareSen())} + ${t.pax} × ${money(SERVICE_FEE)} service fee</td></tr>
      <tr><th>Total</th><td><strong>${money(totalSen())}</strong></td></tr></table>`;
  } else {
    const b = state.booking;
    v.innerHTML = `<h2>5. Your ticket</h2><div class="ticket" id="ticketBox">
      <small>Booking reference</small><div class="ref">${esc(b.ref)}</div>
      <div class="route">${esc(b.from)} → ${esc(b.to)}</div>
      <div>${fmtDate(b.date)}, ${esc(b.time)}</div>
      <p>Seats: <strong>${b.seats.map(esc).join(", ")}</strong></p>
      <p>${b.passengers.map((n, i) => `${i + 1}. ${esc(n)} (${esc(b.seats[i])})`).join("<br>")}</p>
      <p>Phone: ${esc(b.phone)}<br>Total paid: <strong>${money(b.total)}</strong></p>
      <small>Booked ${new Date(b.bookedAt).toLocaleString()}</small></div>`;
  }
  renderNav();
}
function renderSeatCount() {
  const el = $("seatCount");
  if (el) el.innerHTML = `Selected <strong>${state.seats.length}</strong> of ${state.trip.pax}: ${sortSeats(state.seats).join(", ") || "none yet"}`;
}
function renderNav() {
  const s = state.step;
  $("navBar").innerHTML = s === 5
    ? `<button class="ghost" type="button" data-act="print">Print ticket</button><button class="primary" type="button" data-act="new">New booking</button>`
    : `<button class="ghost" type="button" data-act="back"${s === 1 ? " disabled" : ""}>← Back</button>
       <button class="primary" type="button" data-act="next">${s === 4 ? "Confirm booking" : "Next →"}</button>`;
}
function renderInspector() {
  const rows = store.keys().map(k => {
    let size = 0;
    try { size = k.length + (sessionStorage.getItem(k) || "").length; } catch (e) { /* ignore */ }
    return `<tr><td><code>${esc(k)}</code></td><td>${esc(KEY_INFO[k] || "Other")}</td><td>${size}</td></tr>`;
  });
  $("storageTable").querySelector("tbody").innerHTML = rows.length ? rows.join("") : `<tr><td colspan="3">Nothing stored in this tab yet.</td></tr>`;
  const started = store.get(KEYS.started, null);
  $("sessionInfo").textContent = started ? "This tab's session started at " + new Date(started).toLocaleTimeString() + "." : "";
  let raw = "";
  try { raw = JSON.stringify(JSON.parse(sessionStorage.getItem(KEYS.draft) || "null"), null, 1) || "(empty)"; } catch (e) { raw = "(unreadable)"; }
  $("rawView").textContent = raw;
}

/* ---------- Validation and navigation ---------- */
function validate(step) {
  const t = state.trip;
  if (step === 1) {
    if (t.from === t.to) return "Departure and destination must be different.";
    if (!t.date || t.date < addDays(0)) return "Choose today or a later date.";
  }
  if (step === 2 && state.seats.length !== t.pax) return `Please select exactly ${t.pax} seat${t.pax > 1 ? "s" : ""}.`;
  if (step === 3) {
    for (let i = 0; i < t.pax; i++) {
      const n = (state.passengers[i] || "").trim();
      if (n.length < 2) return `Enter the full name for passenger ${i + 1}.`;
    }
    const p = state.phone.replace(/[\s-]/g, "");
    if (!/^(\+?60|0)1\d{8,9}$/.test(p)) return "Enter a valid Malaysian mobile number, e.g. 012-3456789.";
  }
  return "";
}
function goto(step) { state.step = step; $("msg").textContent = ""; save(); renderProgress(); renderStep(); }
function next() {
  const err = validate(state.step);
  if (err) { $("msg").textContent = err; return; }
  if (state.step === 1 && state.seatSig !== tripSig()) { state.seats = []; state.seatSig = tripSig(); }
  if (state.step === 2) {
    state.seats = sortSeats(state.seats);
    state.passengers = Array.from({ length: state.trip.pax }, (_, i) => state.passengers[i] || "");
  }
  if (state.step === 3) state.passengers = state.passengers.map(n => n.trim()).slice(0, state.trip.pax);
  if (state.step === 4) { confirmBooking(); return; }
  goto(state.step + 1);
}
function confirmBooking() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "BUS-";
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  const t = state.trip;
  state.booking = { ref, from: t.from, to: t.to, date: t.date, time: t.time, seats: sortSeats(state.seats),
    passengers: state.passengers.slice(0, t.pax), phone: state.phone.trim(), total: totalSen(), bookedAt: new Date().toISOString() };
  goto(5);
  toast("Booking confirmed: " + ref);
}
function resetBooking() {
  store.remove(KEYS.draft);
  state = freshState();
  $("msg").textContent = "";
  renderProgress(); renderStep(); renderInspector();
}

/* ---------- Events ---------- */
$("stepView").addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.name !== undefined) { state.passengers[Number(el.dataset.name)] = el.value; save(); }
  else if (el.dataset.f === "phone") { state.phone = el.value; save(); }
});
$("stepView").addEventListener("change", e => {
  const f = e.target.dataset.f;
  if (!f || f === "phone") return;
  state.trip[f] = f === "pax" ? Number(e.target.value) : e.target.value;
  if (f === "pax" && state.seats.length > state.trip.pax) state.seats = state.seats.slice(0, state.trip.pax);
  $("msg").textContent = "";
  save();
  $("fareLine").innerHTML = fareLine();
});
$("stepView").addEventListener("click", e => {
  const b = e.target.closest("button[data-seat]");
  if (!b || b.disabled) return;
  const id = b.dataset.seat, i = state.seats.indexOf(id);
  if (i >= 0) state.seats.splice(i, 1);
  else if (state.seats.length >= state.trip.pax) { toast(`You can only choose ${state.trip.pax} seat${state.trip.pax > 1 ? "s" : ""}.`); return; }
  else state.seats.push(id);
  state.seatSig = tripSig();
  b.classList.toggle("sel");
  $("msg").textContent = "";
  save(); renderSeatCount();
});
$("navBar").addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const a = b.dataset.act;
  if (a === "next") next();
  else if (a === "back" && state.step > 1) goto(state.step - 1);
  else if (a === "print") window.print();
  else if (a === "new") resetBooking();
});
$("clearBtn").addEventListener("click", () => {
  if (!confirm("Clear this tab's booking and start again?")) return;
  resetBooking();
  toast("Session booking cleared.");
});

/* ---------- Start ---------- */
renderProgress();
renderStep();
renderInspector();
