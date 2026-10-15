const PRIORITIES = ["Низкий", "Средний", "Высокий", "Критичный"];
const STATUSES = ["Новая", "В работе", "Решена", "Закрыта"];
const TRANSITIONS = {
  "Новая": ["В работе"],
  "В работе": ["Решена", "Новая"],
  "Решена": ["Закрыта", "В работе"],
  "Закрыта": []
};

function validateTicket(d) {
  const errors = [];
  const title = String(d.title || "").trim();
  const author = String(d.author || "").trim();
  const desc = String(d.description || "").trim();
  if (title.length < 3 || title.length > 100) errors.push("Тема: от 3 до 100 символов");
  if (author.length < 2) errors.push("Укажите автора заявки (не менее 2 символов)");
  if (desc.length < 5 || desc.length > 500) errors.push("Описание: от 5 до 500 символов");
  if (!PRIORITIES.includes(d.priority)) errors.push("Выберите приоритет");
  return errors;
}

function createTicket(store, d) {
  const errors = validateTicket(d);
  if (errors.length) throw new Error(errors.join("; "));
  let id = 1;
  for (const t of store) if (t.id >= id) id = t.id + 1;
  const now = new Date().toISOString();
  const ticket = {
    id, title: d.title.trim(), author: d.author.trim(),
    description: d.description.trim(), priority: d.priority,
    status: "Новая", createdAt: now,
    history: [{ at: now, text: "Заявка создана (статус: Новая)" }]
  };
  store.push(ticket);
  return ticket;
}

function changeStatus(store, id, newStatus) {
  const t = store.find(x => x.id === id);
  if (!t) throw new Error("Заявка не найдена");
  if (!TRANSITIONS[t.status].includes(newStatus))
    throw new Error("Недопустимый переход: " + t.status + " → " + newStatus);
  const old = t.status;
  t.status = newStatus;
  t.history.push({ at: new Date().toISOString(), text: "Статус изменён: " + old + " → " + newStatus });
  return t;
}

function searchTickets(store, query, status, priority) {
  const q = String(query || "").trim().toLowerCase();
  const res = [];
  for (const t of store) {
    if (status && t.status !== status) continue;
    if (priority && t.priority !== priority) continue;
    const text = (t.title + " " + t.description + " " + t.author).toLowerCase();
    if (q && !text.includes(q)) continue;
    res.push(t);
  }
  
  res.sort((a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || b.id - a.id);
  return res;
}

function getStats(store) {
  const s = { total: store.length };
  for (const st of STATUSES) s[st] = 0;
  for (const t of store) s[t.status]++;
  return s;
}

if (typeof module !== "undefined") {
  module.exports = { validateTicket, createTicket, changeStatus, searchTickets, getStats, PRIORITIES, STATUSES, TRANSITIONS };
}


if (typeof document !== "undefined") {
  let store = [];
  try { store = JSON.parse(localStorage.getItem("tickets") || "[]"); } catch (e) { store = []; }
  const $ = id => document.getElementById(id);
  const save = () => { try { localStorage.setItem("tickets", JSON.stringify(store)); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = iso => new Date(iso).toLocaleString("ru-RU");

  function fillSelect(el, items, first) {
    el.innerHTML = (first ? '<option value="">' + first + "</option>" : "") +
      items.map(i => "<option>" + i + "</option>").join("");
  }
  fillSelect($("priority"), PRIORITIES);
  fillSelect($("fStatus"), STATUSES, "Все статусы");
  fillSelect($("fPriority"), PRIORITIES, "Все приоритеты");

  function render() {
    const list = searchTickets(store, $("q").value, $("fStatus").value, $("fPriority").value);
    const s = getStats(store);
    $("stats").innerHTML = "Всего: <b>" + s.total + "</b> · " +
      STATUSES.map(st => st + ": <b>" + s[st] + "</b>").join(" · ");
    $("list").innerHTML = list.length ? list.map(t => {
      const opts = TRANSITIONS[t.status];
      return '<div class="card p-' + PRIORITIES.indexOf(t.priority) + '">' +
        "<h3>#" + t.id + " " + esc(t.title) + "</h3>" +
        '<div class="meta">' + esc(t.author) + " · " + fmt(t.createdAt) +
        ' · <span class="badge">' + t.priority + '</span> <span class="badge st">' + t.status + "</span></div>" +
        "<p>" + esc(t.description) + "</p>" +
        (opts.length ? '<div class="actions">Перевести в: ' + opts.map(o =>
          '<button data-id="' + t.id + '" data-st="' + o + '">' + o + "</button>").join("") + "</div>" : "") +
        "<details><summary>История изменений (" + t.history.length + ")</summary><ul>" +
        t.history.map(h => "<li>" + fmt(h.at) + " — " + esc(h.text) + "</li>").join("") + "</ul></details></div>";
    }).join("") : '<p class="empty">Заявок не найдено</p>';
  }

  $("form").addEventListener("submit", e => {
    e.preventDefault();
    try {
      createTicket(store, {
        title: $("title").value, author: $("author").value,
        description: $("description").value, priority: $("priority").value
      });
      save(); $("form").reset(); $("msg").textContent = "Заявка создана"; $("msg").className = "ok";
    } catch (err) { $("msg").textContent = err.message; $("msg").className = "err"; }
    render();
  });
  $("list").addEventListener("click", e => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    try { changeStatus(store, Number(b.dataset.id), b.dataset.st); save(); } catch (err) { alert(err.message); }
    render();
  });
  ["q", "fStatus", "fPriority"].forEach(id => $(id).addEventListener("input", render));
  render();
}
