const $ = id => document.getElementById(id);
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const ruleButtons = [...document.querySelectorAll("[data-rule]")];
const settingsKey = "similarity-match-settings";
const limits = [0, 15, 25, 40, 60];
const settings = { mode: "basic", limit: 0, sound: false };
const leftNames = ["A", "B", "C"];
const rightOrders = ["FDE", "EDF", "DFE", "EFD", "FED"];

let deck = [];
let questionIndex;
let question;
let names;
let drawStates;
let pairs;
let pending;
let choice;
let revealed = false;
let deadline = 0;
let timerFrame = 0;
let audioContext;
let score;

try {
  const saved = JSON.parse(localStorage.getItem(settingsKey));
  if (saved?.mode === "challenge") settings.mode = saved.mode;
  if (limits.includes(saved?.limit)) settings.limit = saved.limit;
  settings.sound = saved?.sound === true;
} catch {
  // 停用本機儲存時仍可使用頁面內的設定。
}

function saveSettings() {
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  } catch {
    // 設定在本次開啟的頁面仍然有效。
  }
  modeButtons.forEach(button => button.setAttribute("aria-pressed", button.dataset.mode === settings.mode));
  $("limit").value = settings.limit;
  $("sound").setAttribute("aria-pressed", settings.sound);
  $("sound").textContent = settings.sound ? "音效開" : "音效關";
}

function prepareSound() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!settings.sound || !AudioEngine) return;
  try {
    audioContext ??= new AudioEngine();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  } catch {
    // 音訊裝置不可用時仍可遊玩。
  }
}

function playSound(right) {
  if (!settings.sound || audioContext?.state !== "running") return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.frequency.setValueAtTime(right ? 520 : 345, now);
  oscillator.frequency.setValueAtTime(right ? 785 : 265, now + 0.1);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.25);
}

function stopTimer() {
  cancelAnimationFrame(timerFrame);
  timerFrame = 0;
  deadline = 0;
  $("timer").hidden = true;
}

function tick(now) {
  const remaining = Math.max(0, deadline - now);
  $("seconds").textContent = Math.ceil(remaining / 1000) + " 秒";
  $("bar").style.transform = "scaleX(" + remaining / (settings.limit * 1000) + ")";
  $("timer").classList.toggle("urgent", remaining <= 5000);
  if (remaining === 0) submit(true);
  else timerFrame = requestAnimationFrame(tick);
}

function showSection(active) {
  for (const id of ["menu", "round", "summary"]) $(id).hidden = id !== active;
}

function start() {
  prepareSound();
  deck = similarityBank[settings.mode].map((item, index) => ({ item, index }));
  for (let tail = deck.length - 1; tail > 0; tail--) {
    const other = Math.floor(Math.random() * (tail + 1));
    [deck[tail], deck[other]] = [deck[other], deck[tail]];
  }
  questionIndex = 0;
  score = { rounds: 0, judgments: 0, pairs: 0, totalPairs: 0 };
  showSection("round");
  showQuestion();
}

function showQuestion() {
  stopTimer();
  const { item, index } = deck[questionIndex];
  question = item;
  names = [leftNames, [...rightOrders[index % rightOrders.length]]];
  pairs = [];
  pending = null;
  choice = null;
  revealed = false;
  const challenge = settings.mode === "challenge";
  $("progress").textContent = (challenge ? "挑戰" : "基礎") + "・第 " + (questionIndex + 1) + " / " + deck.length + " 題";
  $("prompt").textContent = "哪些邊或角互相對應？";
  $("feedback").hidden = true;
  $("next").hidden = true;
  $("play").hidden = false;
  drawStates = ["left", "right"].map((id, side) => renderTriangle(
    $(id), question.points[side], names[side], question.keys, {
      rotation: side === 0 ? (challenge ? -18 : 0) : (challenge ? 108 : 27),
      mirror: side === 1 && challenge,
      includedAngle: question.rule === "insufficient" ? question.includedAngle : undefined,
      onPick: key => pick(side, key)
    }
  ));
  renderPairs();
  if (settings.limit) {
    $("timer").hidden = false;
    const now = performance.now();
    deadline = now + settings.limit * 1000;
    tick(now);
  }
  $("prompt").focus();
}

function pick(side, key) {
  if (revealed || pairs.some(pair => pair[side] === key)) return;
  if (pending?.side === side && pending.key === key) {
    pending = null;
  } else if (!pending || pending.side === side) {
    pending = { side, key };
  } else if (pending.key[0] !== key[0]) {
    $("instructions").textContent = "請配對同一類標記。角配角，邊配邊。";
    return;
  } else {
    pairs.push(side === 0 ? [key, pending.key] : [pending.key, key]);
    pending = null;
  }
  renderPairs();
}

function pairLabel(keys) {
  return keys.map((key, side) => labelFor(names[side], key)).join(" ↔ ");
}

function renderPairs() {
  const states = [{}, {}];
  const chips = pairs.map((keys, index) => {
    keys.forEach((key, side) => { states[side][key] = index + 1; });
    const chip = document.createElement("button");
    chip.type = "button";
    chip.dataset.mark = index + 1;
    chip.textContent = pairLabel(keys);
    chip.setAttribute("aria-label", "取消配對 " + pairLabel(keys));
    chip.addEventListener("click", () => {
      pairs.splice(index, 1);
      renderPairs();
      $("left").querySelector('[data-key="' + keys[0] + '"]').focus({ preventScroll: true });
    });
    const cross = document.createElement("span");
    cross.setAttribute("aria-hidden", "true");
    cross.textContent = " ×";
    chip.append(cross);
    return chip;
  });
  if (pending) states[pending.side][pending.key] = "active";
  drawStates.forEach((draw, side) => draw(states[side]));
  $("pairs").replaceChildren(...chips);

  const count = pairs.length + " / " + question.keys.length + " 組";
  if (pending) {
    const selected = labelFor(names[pending.side], pending.key);
    $("instructions").textContent = "已選 " + selected + "，請點另一張圖的對應標記。";
  } else {
    $("instructions").textContent = pairs.length === question.keys.length
      ? "已配對 " + count + "。選出判別，再確認作答。"
      : "已配對 " + count + "。每一組各點一張圖的標記。";
  }
  ruleButtons.forEach(button => button.setAttribute("aria-pressed", String(choice === button.dataset.rule)));
  $("submit").disabled = pairs.length !== question.keys.length || !choice;
}

function reducedRatio(left, right) {
  const a = Math.round(left * 100);
  const b = Math.round(right * 100);
  let divisor = a;
  let remainder = b;
  while (remainder) [divisor, remainder] = [remainder, divisor % remainder];
  return a / divisor + " : " + b / divisor;
}

function showSolution(timedOut, pairScore, ruleRight, right) {
  const states = {};
  const checks = question.keys.map((key, index) => {
    states[key] = index + 1;
    const check = document.createElement("li");
    const left = displayEvidence(question.points[0], key);
    const right = displayEvidence(question.points[1], key);
    check.dataset.mark = index + 1;
    const compare = key[0] === "a" ? left + " = " + right
      : left + " : " + right + " → " + reducedRatio(Number(left), Number(right));
    check.textContent = pairLabel([key, key]) + "　" + compare;
    return check;
  });
  drawStates.forEach(draw => draw(states, true, true));
  $("checks").replaceChildren(...checks);
  $("verdict").dataset.result = right ? "correct" : "review";
  const prefix = timedOut ? "時間到" : right ? "完全正確" : "配對 " + pairScore + " / " + question.keys.length + " 組正確";
  $("verdict").textContent = prefix + "・" + similarityRules[question.rule];
  const incorrectRule = !ruleRight && choice ? "你選了「" + similarityRules[choice] + "」。" : "";
  const showIncluded = question.rule === "insufficient" && question.includedAngle !== undefined;
  const included = showIncluded
    ? "虛線弧標出夾角 " + names.map(group => "∠" + group[question.includedAngle]).join(" 和 ") + "。"
    : "";
  $("reason").textContent = incorrectRule + question.explanation + included;
  $("correspondence").textContent = question.rule === "insufficient"
    ? "" : "△ABC ∼ △" + names[1].join("");
  $("play").hidden = true;
  $("prompt").textContent = "看配對與判別";
  $("feedback").hidden = false;
  $("next").hidden = false;
  $("next").textContent = questionIndex + 1 === deck.length ? "看結果 →" : "下一題 →";
  $("verdict").focus({ preventScroll: true });
  $("feedback").scrollIntoView({ block: "nearest" });
}

function submit(timedOut = false) {
  if (revealed) return;
  if (deadline && performance.now() >= deadline) timedOut = true;
  stopTimer();
  revealed = true;
  const pairScore = pairs.filter(([left, right]) => left === right).length;
  const ruleRight = choice === question.rule;
  const right = !timedOut && pairScore === question.keys.length && ruleRight;
  score.rounds += Number(right);
  score.judgments += Number(ruleRight);
  score.pairs += pairScore;
  score.totalPairs += question.keys.length;
  showSolution(timedOut, pairScore, ruleRight, right);
  playSound(right);
}

modeButtons.forEach(button => button.addEventListener("click", () => {
  settings.mode = button.dataset.mode;
  saveSettings();
}));
$("limit").addEventListener("change", event => {
  settings.limit = Number(event.target.value);
  saveSettings();
});
$("sound").addEventListener("click", () => {
  settings.sound = !settings.sound;
  saveSettings();
  prepareSound();
});
ruleButtons.forEach(button => button.addEventListener("click", () => {
  choice = button.dataset.rule;
  renderPairs();
}));
$("start").addEventListener("click", start);
$("again").addEventListener("click", start);
$("submit").addEventListener("click", () => submit());
$("next").addEventListener("click", () => {
  questionIndex++;
  if (questionIndex < deck.length) {
    showQuestion();
    return;
  }
  showSection("summary");
  $("summary-score").textContent = score.rounds + " / " + deck.length + " 題完全正確";
  $("summary-details").textContent = "配對 " + score.pairs + " / " + score.totalPairs + " 組・判別 " + score.judgments + " / " + deck.length + " 題";
  $("summary-title").focus();
});
for (const id of ["leave", "settings"]) {
  $(id).addEventListener("click", () => {
    stopTimer();
    showSection("menu");
    $("title").focus();
  });
}

const demo = similarityBank.basic[0];
renderTriangle($("demo-left"), demo.points[0], leftNames, demo.keys, { rotation: 0 })({ a0: 1, a1: 2 });
renderTriangle($("demo-right"), demo.points[1], [...rightOrders[0]], demo.keys, { rotation: 108, mirror: true })({ a0: 1, a1: 2 });
saveSettings();
