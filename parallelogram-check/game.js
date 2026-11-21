const $ = id => document.getElementById(id);
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const diagramButtons = [...document.querySelectorAll("[data-diagram]")];
const settingsKey = "para-check-settings";
const limits = [0, 15, 25, 40, 60];
const settings = { mode: "basic", limit: 0, sound: false };
const counterexampleNames = {
  trapezoid: "等腰梯形",
  scaleneTrapezoid: "梯形",
  kite: "箏形"
};
const diagramCheck = "AO ≠ OC。平行四邊形的兩條對角線必須互相平分，所以這個圖形不是平行四邊形。";

let deck = [];
let current;
let answered = false;
let checking = false;
let correct = 0;
let attempted = 0;
let deadline = 0;
let timerFrame = 0;
let audioContext;

try {
  const saved = JSON.parse(localStorage.getItem(settingsKey));
  if (saved?.mode === "basic" || saved?.mode === "challenge") settings.mode = saved.mode;
  if (limits.includes(saved?.limit)) settings.limit = saved.limit;
  settings.sound = saved?.sound === true;
} catch {
  // 封鎖本機儲存時仍可以遊玩。
}

function saveSettings() {
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  } catch {
    // 設定仍可在這次開啟的頁面使用。
  }
}

function renderSettings() {
  modeButtons.forEach(button => button.setAttribute("aria-pressed", button.dataset.mode === settings.mode));
  $("limit").value = settings.limit;
  $("sound").textContent = settings.sound ? "音效開" : "音效關";
  $("sound").setAttribute("aria-pressed", settings.sound);
}

function prepareSound() {
  if (!settings.sound) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  try {
    audioContext ??= new AudioEngine();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  } catch {
    // 裝置不提供音效時不影響作答。
  }
}

function playSound(right) {
  if (!settings.sound || audioContext?.state !== "running") return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.frequency.setValueAtTime(right ? 523 : 294, now);
  oscillator.frequency.setValueAtTime(right ? 784 : 220, now + 0.09);
  gain.gain.setValueAtTime(0.075, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

function mathText(element, value) {
  const pieces = value.split(/\b([ABCDO]{2})\b/g);
  element.replaceChildren(...pieces.map((piece, index) => {
    if (index % 2 === 0) return document.createTextNode(piece);
    const segment = document.createElement("span");
    segment.className = "segment";
    segment.textContent = piece;
    return segment;
  }));
}

function refillDeck() {
  deck = [...questionBank[settings.mode]];
  for (let index = deck.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  if (deck[0] === current) [deck[0], deck[1]] = [deck[1], deck[0]];
}

function stopTimer() {
  cancelAnimationFrame(timerFrame);
  timerFrame = 0;
  deadline = 0;
}

function showTime(remaining) {
  $("seconds").textContent = Math.ceil(remaining / 1000) + " 秒";
  $("bar").style.transform = "scaleX(" + remaining / (settings.limit * 1000) + ")";
  $("timer").classList.toggle("urgent", remaining <= 5000);
}

function tick(now) {
  const remaining = Math.max(0, deadline - now);
  showTime(remaining);
  if (remaining === 0) answer(null);
  else timerFrame = requestAnimationFrame(tick);
}

function newQuestion() {
  stopTimer();
  if (deck.length === 0) refillDeck();
  current = deck.shift();
  answered = false;
  checking = false;
  $("mode-label").textContent = (settings.mode === "basic" ? "基礎" : "挑戰") + "・第 " + (attempted + 1) + " 題";
  $("setup").textContent = current.marks.diagonals
    ? "四邊形 ABCD 中，對角線交於 O。"
    : "已知四邊形 ABCD 具有下列條件。";
  $("conditions").replaceChildren(...current.conditions.map(condition => {
    const item = document.createElement("li");
    mathText(item, condition);
    return item;
  }));
  $("round-layout").classList.remove("revealed");
  $("choices").hidden = false;
  $("feedback").hidden = true;
  $("figure").hidden = true;
  $("next").hidden = true;
  $("timer").hidden = settings.limit === 0;
  if (settings.limit) {
    deadline = performance.now() + settings.limit * 1000;
    showTime(settings.limit * 1000);
    timerFrame = requestAnimationFrame(tick);
  }
  $("prompt").focus();
}

function paintDiagram() {
  if ($("figure").hidden) return;
  const coordinates = shapes[current.counterexample || "parallelogram"];
  drawQuadrilateral($("diagram"), coordinates, current.marks, checking);
}

function showDiagram(step) {
  checking = step === "check";
  const caption = checking ? diagramCheck : current.caption;
  diagramButtons.forEach(button => button.setAttribute("aria-pressed", button.dataset.diagram === step));
  mathText($("caption"), caption);
  const figureName = current.rule ? "平行四邊形示意圖" : counterexampleNames[current.counterexample] + "反例";
  $("diagram").setAttribute("aria-label", figureName + "。" + caption);
  paintDiagram();
}

function answer(choice) {
  if (answered) return;
  if (deadline && performance.now() >= deadline) choice = null;
  stopTimer();
  answered = true;
  const sufficient = Boolean(current.rule);
  const right = choice === sufficient;
  attempted++;
  if (right) correct++;
  $("attempted").textContent = attempted;
  $("correct").textContent = correct;
  $("verdict").dataset.result = right ? "correct" : "review";
  const outcome = choice === null ? "時間到" : right ? "答對了" : "再看一下";
  $("verdict").textContent = outcome + " · " + (sufficient ? "一定是" : "不一定");
  $("reason-title").textContent = sufficient ? current.rule : "反例｜" + counterexampleNames[current.counterexample];
  mathText($("reason"), current.reason);
  $("timer").hidden = true;
  $("choices").hidden = true;
  $("feedback").hidden = false;
  $("round-layout").classList.add("revealed");
  $("figure").hidden = false;
  $("diagram-actions").hidden = sufficient;
  $("next").hidden = false;
  showDiagram("given");
  $("verdict").focus({ preventScroll: true });
  playSound(right);
}

modeButtons.forEach(button => button.addEventListener("click", () => {
  settings.mode = button.dataset.mode;
  renderSettings();
  saveSettings();
}));
$("limit").addEventListener("change", event => {
  settings.limit = Number(event.target.value);
  saveSettings();
});
$("sound").addEventListener("click", () => {
  settings.sound = !settings.sound;
  renderSettings();
  saveSettings();
  prepareSound();
});
$("start").addEventListener("click", () => {
  prepareSound();
  deck = [];
  $("menu").hidden = true;
  $("round").hidden = false;
  $("score").hidden = false;
  newQuestion();
});
$("leave").addEventListener("click", () => {
  stopTimer();
  $("round").hidden = true;
  $("menu").hidden = false;
  $("title").focus();
});
$("next").addEventListener("click", newQuestion);
document.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => {
  answer(button.dataset.answer === "yes");
}));
diagramButtons.forEach(button => button.addEventListener("click", () => showDiagram(button.dataset.diagram)));

const demo = $("demo");
const paintDemo = () => drawQuadrilateral(demo, shapes.parallelogram, questionBank.basic[0].marks);
new ResizeObserver(paintDemo).observe(demo);
new ResizeObserver(paintDiagram).observe($("diagram"));
renderSettings();
