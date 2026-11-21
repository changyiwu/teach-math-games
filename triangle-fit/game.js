"use strict";

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 288;
const VIEWBOX = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
const VERTICES = ["A", "B", "C"];
const SIDES = ["BC", "CA", "AB"];
const SETTINGS_KEY = "tri-fit-settings";
const MODE_HINT = {
  basic: "挑一根能合起來的線段，送出後親手試接。",
  challenge: "看邊長找角，或看角度找對邊。",
};

function integer(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sample(values) {
  return values[integer(0, values.length - 1)];
}

function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = integer(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function closureState(a, b, x) {
  const low = Math.abs(a - b);
  const high = a + b;
  if (x < low) return "short";
  if (x > high) return "long";
  return x === low || x === high ? "flat" : "fit";
}

function meetingAngle(a, b, x) {
  const cosine = (a * a + b * b - x * x) / (2 * a * b);
  return Math.acos(Math.max(-1, Math.min(1, cosine)));
}

function makeClosureQuestion() {
  const a = integer(6, 13);
  const b = a === 7 ? sample([3, 5]) : integer(3, a - 2);
  const low = a - b;
  const high = a + b;
  const correct = sample([low + 1, high - 1, integer(low + 1, high - 1)]);
  const lower = [low - 1, low];
  const upper = [high, high + 1];
  const distractors = sample([
    [...lower, sample(upper)],
    [sample(lower), ...upper],
  ]);
  return { kind: "closure", a, b, correct, options: shuffled([correct, ...distractors]) };
}

function extreme(values, largest) {
  return values.indexOf(largest ? Math.max(...values) : Math.min(...values));
}

function makeOrderQuestion() {
  const kind = sample(["sides", "angles"]);
  const largest = sample([true, false]);
  if (kind === "sides") {
    const short = integer(5, 9);
    const middle = short + integer(1, 3);
    const long = middle + integer(1, short - 2);
    const lengths = shuffled([short, middle, long]);
    return { kind, largest, lengths, missing: null, correct: extreme(lengths, largest), options: [0, 1, 2] };
  }

  let angles;
  do {
    const a = integer(29, 73);
    const b = integer(34, 84);
    angles = [a, b, 180 - a - b];
  } while (angles[2] < 27 || angles[2] > 105 || new Set(angles).size !== 3 || [50, 55, 75].every(angle => angles.includes(angle)));
  angles = shuffled(angles);
  const missing = integer(0, 3);
  return {
    kind, largest, angles,
    lengths: angles.map(angle => Math.sin(toRadians(angle))),
    missing: missing === 3 ? null : missing,
    correct: extreme(angles, largest),
    options: [0, 1, 2],
  };
}

function rodFrame(a, b, x, angle, longestChoice) {
  // 第三邊從右端指向左側圓弧，最高方向是由右端引出的切線。
  const reachLeft = Math.max(a / 2 + b, longestChoice - a / 2);
  const reachUp = Math.max(b, longestChoice * b / a);
  const scale = Math.min(227 / reachLeft, 180 / reachUp);
  const left = [280 - a * scale / 2, 231];
  const right = [280 + a * scale / 2, 231];
  const end = [left[0] + b * scale * Math.cos(angle), left[1] - b * scale * Math.sin(angle)];
  const distance = Math.hypot(end[0] - right[0], end[1] - right[1]);
  const thirdEnd = x === null ? null : towards(right, end, x * scale / distance);
  const joined = thirdEnd !== null && Math.abs(distance / scale - x) < 1e-8;
  return { left, right, end, thirdEnd, joined, scale };
}

function towards(from, to, t) {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

function verticesFor([a, b, c], rotation) {
  const x = (b * b + c * c - a * a) / (2 * c);
  const y = Math.sqrt(Math.max(0, b * b - x * x));
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  const points = [[0, 0], [c, 0], [x, -y]].map(([px, py]) => [px * cos - py * sin, px * sin + py * cos]);
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const scale = Math.min(396 / (xMax - xMin), 166 / (yMax - yMin));
  return points.map(([px, py]) => [280 + (px - (xMin + xMax) / 2) * scale, 144 + (py - (yMin + yMax) / 2) * scale]);
}

function xy([x, y]) {
  return `${x.toFixed(3)},${y.toFixed(3)}`;
}

function line(className, [x1, y1], [x2, y2], extra = "") {
  return `<line class="${className}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
}

function circle(className, [x, y], r, extra = "") {
  return `<circle class="${className}" cx="${x}" cy="${y}" r="${r}" ${extra}/>`;
}

function label(className, [x, y], text) {
  return `<text class="geometry-label ${className}" x="${x}" y="${y}">${text}</text>`;
}

function offsetFrom(point, origin, amount) {
  return towards(origin, point, 1 + amount / Math.hypot(point[0] - origin[0], point[1] - origin[1]));
}

function arcAt(points, index) {
  const center = points[index];
  const from = points[(index + 1) % 3];
  const to = points[(index + 2) % 3];
  const u = [from[0] - center[0], from[1] - center[1]];
  const v = [to[0] - center[0], to[1] - center[1]];
  const r = 25;
  const start = towards(center, from, r / Math.hypot(...u));
  const end = towards(center, to, r / Math.hypot(...v));
  const sweep = Number(u[0] * v[1] - u[1] * v[0] > 0);
  return `<path class="corner-arc" d="M ${xy(start)} A ${r} ${r} 0 0 ${sweep} ${xy(end)}"/>`;
}

const el = id => document.getElementById(id);
const ui = Object.fromEntries([
  "menu", "round", "score", "correct", "attempted", "mute", "limit", "start", "mode-hint",
  "diagram", "legend", "experiment", "hinge", "fit", "topic", "timer", "count", "bar",
  "prompt", "context", "choices", "verdict", "explanation", "rule", "detail", "observed",
  "leave", "submit", "next",
].map(id => [id, el(id)]));
const modes = [...document.querySelectorAll("[data-mode]")];
const settings = { mode: "basic", limit: 25, muted: true };

try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (saved?.mode === "challenge") settings.mode = saved.mode;
  if ([0, 15, 25, 40, 60].includes(saved?.limit)) settings.limit = saved.limit;
  if (typeof saved?.muted === "boolean") settings.muted = saved.muted;
} catch {
  // 瀏覽器停用儲存空間時，使用本輪設定。
}

let phase = "menu";
let question;
let selected = null;
let explored = null;
let rotation = 0;
let hingeAngle = toRadians(65);
let drag = null;
let timerId;
let deadline;
let correct = 0;
let attempted = 0;
let audioContext;

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 儲存失敗時仍可遊玩。
  }
}

function paintSettings() {
  for (const button of modes) button.setAttribute("aria-pressed", button.dataset.mode === settings.mode);
  ui["mode-hint"].textContent = MODE_HINT[settings.mode];
  ui.limit.value = settings.limit;
  ui.mute.textContent = settings.muted ? "音效關" : "音效開";
  ui.mute.setAttribute("aria-label", "音效");
  ui.mute.setAttribute("aria-pressed", !settings.muted);
}

function prepareAudio() {
  if (settings.muted) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  audioContext ??= new Audio();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
}

function playSound(success) {
  if (settings.muted || audioContext?.state !== "running") return;
  const start = audioContext.currentTime;
  const notes = success ? [523, 659, 784] : [392, 311];
  notes.forEach((pitch, index) => {
    const time = start + index * 0.095;
    const tone = audioContext.createOscillator();
    const volume = audioContext.createGain();
    tone.frequency.value = pitch;
    volume.gain.setValueAtTime(0.09, time);
    volume.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    tone.connect(volume).connect(audioContext.destination);
    tone.start(time);
    tone.stop(time + 0.15);
  });
}

function svg(contents, description) {
  return `<svg viewBox="${VIEWBOX}" role="img" aria-label="${description}">${contents}</svg>`;
}

function closureFrame() {
  const { a, b, options } = question;
  return rodFrame(a, b, explored, hingeAngle, Math.max(...options));
}

function renderClosure() {
  const { a, b } = question;
  const result = phase === "result";
  const { left, right, end, thirdEnd, joined, scale } = closureFrame();
  const objects = [`<path class="guide" d="M 34 ${left[1]} H 526"/>`];
  if (result) {
    const arcStart = [left[0] - b * scale, left[1]];
    const arcEnd = [left[0] + b * scale, left[1]];
    objects.push(`<path class="guide arc-left" d="M ${xy(arcStart)} A ${b * scale} ${b * scale} 0 0 1 ${xy(arcEnd)}"/>`);
    if (joined && closureState(a, b, explored) === "fit") {
      objects.push(`<polygon class="fit-fill" points="${xy(left)} ${xy(right)} ${xy(end)}"/>`);
    }
  }
  objects.push(line("rod base", left, right), line("rod first", left, end));
  if (thirdEnd) {
    if (!joined) objects.push(line("gap", end, thirdEnd));
    objects.push(line("rod third", right, thirdEnd));
  }
  objects.push(circle("joint fixed", left, 7), circle("joint fixed", right, 7));
  if (thirdEnd && !joined) objects.push(circle("joint third-joint", thirdEnd, 6));
  objects.push(circle(`joint ${joined ? "join" : "first-joint"}`, end, 7));
  if (result) objects.push(circle("handle", end, 38, 'fill="transparent" data-handle'));
  ui.diagram.innerHTML = svg(objects.join(""), `底邊長 ${a}，藍色線段長 ${b}，第三邊${explored === null ? "待選" : `長 ${explored}`}。`);
  const description = [["base", `底邊 ${a}`], ["first", `藍段 ${b}`], ["third", `第三邊 ${explored ?? "？"}`]];
  ui.legend.innerHTML = description.map(([name, text]) => `<span class="legend-item ${name}-key">${text}</span>`).join("");
  if (result) {
    const status = joined ? closureState(a, b, explored) === "flat" ? "兩端碰到了，但三段共線。" : "兩端接上，圍成三角形。" : "兩端還沒接上。";
    if (ui.observed.textContent !== status) ui.observed.textContent = status;
  }
}

function renderOrder() {
  const result = phase === "result";
  const { kind, lengths } = question;
  const points = verticesFor(lengths, rotation);
  const center = [0, 1].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / 3);
  const active = result ? question.correct : selected;
  const wrong = result && selected !== active ? selected : null;
  const objects = [];
  const hitTargets = [];
  for (let index = 0; index < 3; index++) {
    const point = points[index];
    const [p, q] = [points[(index + 1) % 3], points[(index + 2) % 3]];
    const markEdge = active === index && (result || kind === "angles");
    const markPoint = active === index && (result || kind === "sides");
    objects.push(line(`edge${markEdge ? " mark" : ""}${wrong === index && kind === "angles" ? " wrong-mark" : ""}`, p, q));
    if (kind === "sides") {
      const middle = towards(p, q, 0.5);
      const normal = [q[1] - p[1], p[0] - q[0]];
      const direction = (middle[0] - center[0]) * normal[0] + (middle[1] - center[1]) * normal[1] > 0 ? 1 : -1;
      const norm = Math.hypot(...normal);
      const position = middle.map((coordinate, axis) => coordinate + direction * 26 * normal[axis] / norm);
      objects.push(label("", position, lengths[index]));
    }
    if (markPoint) objects.push(arcAt(points, index));
    objects.push(circle(`point${markPoint ? " mark" : ""}${wrong === index && kind === "sides" ? " wrong-mark" : ""}`, point, 7));
    objects.push(label(`vertex-label${markPoint ? " mark" : ""}`, offsetFrom(point, center, 27), VERTICES[index]));
    if (!result) {
      const target = `data-choice="${index}"`;
      hitTargets.push(kind === "angles"
        ? line("hit-edge", towards(p, q, 0.11), towards(p, q, 0.89), target)
        : circle("hit-point", point, 34, target));
    }
  }
  ui.diagram.innerHTML = svg([...objects, ...hitTargets].join(""), "三角形 ABC，邊 BC 對 ∠A，邊 CA 對 ∠B，邊 AB 對 ∠C。");
  ui.legend.textContent = "";
}

function renderDiagram() {
  if (question.kind === "closure") renderClosure();
  else renderOrder();
}

function optionText(value) {
  if (question.kind === "closure") return String(value);
  return question.kind === "sides" ? `∠${VERTICES[value]}` : SIDES[value];
}

function paintChoices() {
  const result = phase === "result";
  const canExplore = result && question.kind === "closure";
  for (const button of ui.choices.children) {
    const value = Number(button.dataset.choice);
    const right = result && value === question.correct;
    const wrong = result && value === selected && !right;
    const active = canExplore ? explored === value : selected === value;
    button.setAttribute("aria-pressed", active);
    button.classList.toggle("right", right);
    button.classList.toggle("wrong", wrong);
    button.classList.toggle("exploring", canExplore && active);
    button.disabled = result && !canExplore;
    button.setAttribute("aria-label", `${optionText(value)}${right ? "，正解" : wrong ? "，作答錯誤" : ""}`);
  }
}

function drawQuestion() {
  const { kind, largest, lengths, angles, missing } = question;
  const size = largest ? "最大" : "最小";
  if (kind === "closure") {
    ui.topic.textContent = "基礎 · 三邊關係";
    ui.prompt.textContent = "第三邊選多長，才能合成三角形？";
    ui.context.textContent = `固定兩邊長 ${question.a} 和 ${question.b}，選一個長度。`;
  } else if (kind === "sides") {
    ui.topic.textContent = "挑戰 · 由邊找角";
    ui.prompt.textContent = `哪個角${size}？`;
    ui.context.textContent = SIDES.map((side, i) => `${side} = ${lengths[i]}`).join("　");
  } else {
    ui.topic.textContent = "挑戰 · 由角找邊";
    ui.prompt.textContent = `哪一邊${largest ? "最長" : "最短"}？`;
    ui.context.textContent = VERTICES.map((vertex, i) => `∠${vertex} = ${i === missing ? "？" : `${angles[i]}°`}`).join("　");
  }
  ui.choices.innerHTML = question.options.map(value =>
    `<button type="button" class="choice" data-choice="${value}">${optionText(value)}</button>`).join("");
  paintChoices();
  renderDiagram();
}

function stopTimer() {
  clearInterval(timerId);
  deadline = null;
}

function updateTimer() {
  const remaining = Math.max(0, deadline - performance.now());
  const seconds = Math.ceil(remaining / 1000);
  const text = `${seconds} 秒`;
  if (ui.count.textContent !== text) ui.count.textContent = text;
  ui.bar.style.transform = `scaleX(${remaining / (settings.limit * 1000)})`;
  ui.timer.classList.toggle("urgent", seconds <= 5);
  if (remaining === 0) judge(true);
}

function startRound() {
  stopTimer();
  const previous = question;
  const make = settings.mode === "basic" ? makeClosureQuestion : makeOrderQuestion;
  do {
    question = make();
  } while (previous && JSON.stringify(question) === JSON.stringify(previous));
  phase = "play";
  selected = null;
  explored = null;
  rotation = sample([0, Math.PI, -Math.PI / 7, Math.PI * 6 / 7]);
  hingeAngle = toRadians(65);
  ui.score.hidden = false;
  ui.menu.hidden = true;
  ui.round.hidden = false;
  ui.verdict.hidden = true;
  ui.explanation.hidden = true;
  ui.observed.hidden = true;
  ui.experiment.hidden = true;
  ui.submit.hidden = false;
  ui.submit.disabled = true;
  ui.next.hidden = true;
  ui.timer.hidden = settings.limit === 0;
  drawQuestion();
  ui.prompt.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (settings.limit > 0) {
    deadline = performance.now() + settings.limit * 1000;
    updateTimer();
    timerId = setInterval(updateTimer, 80);
  }
}

function showClosureSolution(snap) {
  const { a, b } = question;
  const low = Math.abs(a - b);
  const high = a + b;
  const target = meetingAngle(a, b, explored);
  const state = closureState(a, b, explored);
  const notes = {
    short: `第三邊 ${explored} 短於兩邊差 ${low}，兩端到不了同一點。`,
    long: `第三邊 ${explored} 長於兩邊和 ${high}，兩端到不了同一點。`,
    flat: `第三邊 ${explored} 等於${explored === low ? "兩邊差" : "兩邊和"}，接上時三段只排成一直線。`,
    fit: `${explored} 介於 ${low} 和 ${high} 之間，兩端能接成三角形。`,
  };
  ui.rule.textContent = `${low} < 第三邊長 < ${high}`;
  ui.detail.textContent = notes[state];
  ui.observed.hidden = false;
  if (snap) setHinge(target);
  else renderClosure();
}

function showOrderSolution() {
  const { correct: answer, kind, angles, lengths, largest, missing } = question;
  const size = largest ? "最大" : "最小";
  const opposite = largest ? "最長" : "最短";
  if (kind === "sides") {
    ui.rule.textContent = `∠${VERTICES[answer]} ${size}。`;
    ui.detail.textContent = `${opposite}邊是 ${SIDES[answer]}（長 ${lengths[answer]}），所以它的對角 ∠${VERTICES[answer]} ${size}。`;
  } else {
    const given = angles.filter((_, i) => i !== missing);
    const calculation = missing === null ? "" : `∠${VERTICES[missing]} = 180° − ${given[0]}° − ${given[1]}° = ${angles[missing]}°。`;
    ui.rule.textContent = `${SIDES[answer]} ${opposite}。`;
    ui.detail.textContent = `${calculation}∠${VERTICES[answer]}（${angles[answer]}°）${size}，所以它的對邊 ${SIDES[answer]} ${opposite}。`;
  }
  renderOrder();
}

function judge(timedOut = false) {
  if (phase !== "play" || (!timedOut && selected === null)) return;
  timedOut ||= deadline !== null && performance.now() >= deadline;
  stopTimer();
  const success = !timedOut && selected === question.correct;
  phase = "result";
  attempted++;
  if (success) correct++;
  ui.attempted.textContent = attempted;
  ui.correct.textContent = correct;
  ui.timer.hidden = true;
  ui.verdict.textContent = success ? "答對了！" : timedOut ? "時間到" : `答錯了，正解是 ${optionText(question.correct)}`;
  ui.verdict.classList.toggle("miss", !success);
  ui.verdict.hidden = false;
  ui.explanation.hidden = false;
  ui.submit.hidden = true;
  ui.next.hidden = false;
  if (question.kind === "closure") {
    explored = selected ?? question.correct;
    ui.experiment.hidden = false;
    hingeAngle = toRadians(65);
    ui.hinge.value = 650;
    showClosureSolution(false);
  } else {
    showOrderSolution();
  }
  paintChoices();
  playSound(success);
  ui.verdict.tabIndex = -1;
  ui.verdict.focus({ preventScroll: true });
}

function setHinge(angle) {
  const { a, b } = question;
  const target = meetingAngle(a, b, explored);
  ui.hinge.value = Math.round(angle * 1800 / Math.PI);
  hingeAngle = Math.abs(angle - target) <= toRadians(3) ? target : angle;
  renderClosure();
}

function choose(value) {
  if (phase === "play") {
    selected = value;
    ui.submit.disabled = false;
    paintChoices();
    if (question.kind !== "closure") renderOrder();
  } else if (phase === "result" && question.kind === "closure") {
    explored = value;
    paintChoices();
    showClosureSolution(true);
  }
}

for (const button of modes) button.addEventListener("click", () => {
  settings.mode = button.dataset.mode;
  saveSettings();
  paintSettings();
});

ui.limit.addEventListener("change", () => {
  settings.limit = Number(ui.limit.value);
  saveSettings();
});

ui.mute.addEventListener("click", () => {
  settings.muted = !settings.muted;
  prepareAudio();
  saveSettings();
  paintSettings();
});

ui.start.addEventListener("click", () => {
  prepareAudio();
  startRound();
});
ui.next.addEventListener("click", startRound);
ui.submit.addEventListener("click", () => judge());
ui.leave.addEventListener("click", () => {
  stopTimer();
  phase = "menu";
  ui.round.hidden = true;
  ui.menu.hidden = false;
  ui.start.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});

for (const group of [ui.choices, ui.diagram]) group.addEventListener("click", event => {
  const option = event.target.closest("[data-choice]");
  if (option) choose(Number(option.dataset.choice));
});

ui.hinge.addEventListener("input", () => setHinge(toRadians(Number(ui.hinge.value) / 10)));
ui.fit.addEventListener("click", () => setHinge(meetingAngle(question.a, question.b, explored)));

ui.diagram.addEventListener("pointerdown", event => {
  if (!event.target.matches("[data-handle]") || !event.isPrimary || event.button !== 0) return;
  const svgElement = ui.diagram.firstElementChild;
  const frame = closureFrame();
  drag = { id: event.pointerId, inverse: svgElement.getScreenCTM().inverse(), pivot: frame.left };
  ui.diagram.setPointerCapture(event.pointerId);
});

ui.diagram.addEventListener("pointermove", event => {
  if (drag?.id !== event.pointerId) return;
  const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(drag.inverse);
  const dx = position.x - drag.pivot[0];
  const dy = Math.max(0, drag.pivot[1] - position.y);
  if (Math.hypot(dx, dy) > 0) setHinge(Math.atan2(dy, dx));
});

ui.diagram.addEventListener("lostpointercapture", () => { drag = null; });

paintSettings();
