// Запуск: node tests/tests.js
const L = require("../src/script.js");
const base = { title: "Не работает принтер", author: "Иванов", description: "Принтер не печатает в кабинете 12", priority: "Высокий" };
const results = [];
function t(id, name, expected, fn) {
  let actual, ok;
  try { [ok, actual] = fn(); } catch (e) { ok = false; actual = "Исключение: " + e.message; }
  results.push({ id, name, expected, actual, status: ok ? "PASS" : "FAIL" });
}
t("T-01", "Создать корректную заявку", "Заявка: id=1, статус «Новая», 1 запись в истории", () => {
  const s = []; const x = L.createTicket(s, base);
  return [x.id === 1 && x.status === "Новая" && x.history.length === 1, `id=${x.id}, ${x.status}, история=${x.history.length}`];
});
t("T-02", "Сменить статус Новая → В работе", "Статус «В работе», в истории 2 записи", () => {
  const s = []; L.createTicket(s, base); const x = L.changeStatus(s, 1, "В работе");
  return [x.status === "В работе" && x.history.length === 2, `${x.status}, история=${x.history.length}`];
});
t("T-03", "Поиск «ПРИНТЕР» (без учёта регистра)", "Найдена 1 заявка из 2", () => {
  const s = []; L.createTicket(s, base);
  L.createTicket(s, { ...base, title: "Нет интернета", description: "Пропал Wi-Fi в аудитории" });
  const r = L.searchTickets(s, "ПРИНТЕР", "", "");
  return [r.length === 1 && r[0].id === 1, `найдено ${r.length}`];
});
t("T-04", "Фильтр по приоритету + статистика", "1 «Критичный»; всего 2, Новая 2", () => {
  const s = []; L.createTicket(s, base); L.createTicket(s, { ...base, priority: "Критичный" });
  const r = L.searchTickets(s, "", "", "Критичный"); const st = L.getStats(s);
  return [r.length === 1 && st.total === 2 && st["Новая"] === 2, `фильтр=${r.length}, всего=${st.total}, Новая=${st["Новая"]}`];
});
t("T-05", "Пустая тема заявки", "Ошибка валидации, заявка не создана", () => {
  const s = []; let msg = "";
  try { L.createTicket(s, { ...base, title: "   " }); } catch (e) { msg = e.message; }
  return [msg.includes("Тема") && s.length === 0, `сообщение: «${msg}», заявок=${s.length}`];
});
t("T-06", "Недопустимый переход Новая → Закрыта", "Ошибка, статус остаётся «Новая»", () => {
  const s = []; L.createTicket(s, base); let msg = "";
  try { L.changeStatus(s, 1, "Закрыта"); } catch (e) { msg = e.message; }
  return [msg.startsWith("Недопустимый") && s[0].status === "Новая", `сообщение: «${msg}», статус=${s[0].status}`];
});
t("T-07", "Граница: тема 100 и 101 символ", "100 — принято, 101 — отклонено", () => {
  const a = L.validateTicket({ ...base, title: "a".repeat(100) }).length;
  const b = L.validateTicket({ ...base, title: "a".repeat(101) }).length;
  return [a === 0 && b === 1, `100 симв.: ошибок ${a}; 101 симв.: ошибок ${b}`];
});
t("T-08", "Граница: пустое хранилище", "Поиск → [], статистика total=0", () => {
  const r = L.searchTickets([], "любой", "", ""); const st = L.getStats([]);
  return [r.length === 0 && st.total === 0, `найдено ${r.length}, total=${st.total}`];
});
console.log("ID | Сценарий | Ожидаемо | Фактически | Статус");
for (const r of results) console.log(`${r.id} | ${r.name} | ${r.expected} | ${r.actual} | ${r.status}`);
const failed = results.filter(r => r.status === "FAIL").length;
console.log(`\nИтого: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
