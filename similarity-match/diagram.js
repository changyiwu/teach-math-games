const boardWidth = 320;
const boardHeight = 224;
const svgNS = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

const difference = ([ax, ay], [bx, by]) => [ax - bx, ay - by];
const midpoint = ([ax, ay], [bx, by]) => [(ax + bx) / 2, (ay + by) / 2];
const movePoint = ([x, y], [dx, dy], length) => [x + dx * length, y + dy * length];

function direction([x, y]) {
  const length = Math.hypot(x, y);
  return [x / length, y / length];
}

function boardPoints(points, rotation, mirror) {
  const cosine = Math.cos(radians(rotation));
  const sine = Math.sin(radians(rotation));
  const rotated = points.map(([x, y]) => {
    const horizontal = mirror ? -x : x;
    return [horizontal * cosine + y * sine, horizontal * sine - y * cosine];
  });
  const xs = rotated.map(([x]) => x);
  const ys = rotated.map(([, y]) => y);
  const [left, right] = [Math.min(...xs), Math.max(...xs)];
  const [top, bottom] = [Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(188 / (right - left), 124 / (bottom - top));
  return rotated.map(([x, y]) => [
    boardWidth / 2 + (x - (left + right) / 2) * scale,
    boardHeight / 2 + (y - (top + bottom) / 2) * scale
  ]);
}

function anglePath(points, index, radius) {
  const center = points[index];
  const [first, second] = edgeEnds[index].map(end => direction(difference(points[end], center)));
  const start = movePoint(center, first, radius);
  const end = movePoint(center, second, radius);
  const clockwise = first[0] * second[1] - first[1] * second[0] > 0 ? 1 : 0;
  return "M" + start.join(" ") + " A" + radius + " " + radius + " 0 0 " + clockwise + " " + end.join(" ");
}

function badgeCandidates(anchor, outward, verticalInset) {
  const across = [-outward[1], outward[0]];
  const distances = [29, 42, 55];
  const shifts = [0, -21, 21, -38, 38];
  return distances.flatMap(distance => shifts.map(shift => {
    const [x, y] = movePoint(movePoint(anchor, outward, distance), across, shift);
    return [Math.max(32, Math.min(boardWidth - 32, x)), Math.max(verticalInset, Math.min(boardHeight - verticalInset, y))];
  }));
}

function diagramLabel(svg, text, [x, y]) {
  const label = svgElement("text", { x, y, class: "vertex-name" });
  label.textContent = text;
  svg.append(label);
}

function renderTriangle(board, shape, names, keys, { rotation, mirror, includedAngle, onPick }) {
  const points = boardPoints(shape, rotation, mirror);
  const center = points.reduce(([x, y], [px, py]) => [x + px / 3, y + py / 3], [0, 0]);
  const svg = svgElement("svg", { viewBox: "0 0 320 224", "aria-hidden": "true" });
  svg.append(svgElement("polygon", { points: points.map(point => point.join(",")).join(" "), class: "outline" }));
  let extraArc;
  if (includedAngle !== undefined) {
    extraArc = svgElement("path", { d: anglePath(points, includedAngle, 33), class: "extra-angle", "data-show": "false" });
    svg.append(extraArc);
  }

  const namePositions = points.map((point, index) =>
    keys.includes("a" + index) ? null : movePoint(point, direction(difference(point, center)), 13));
  const separateNames = namePositions.filter(Boolean);
  const badges = [];
  const items = keys.map(key => {
    const index = Number(key[1]);
    const isAngle = key[0] === "a";
    const [first, second] = edgeEnds[index].map(end => points[end]);
    const anchor = isAngle ? points[index] : midpoint(first, second);
    const outward = isAngle ? direction(difference(anchor, center)) :
      direction([first[1] - second[1], second[0] - first[0]]);
    const opposite = difference(points[index], anchor);
    const facingIn = !isAngle && outward[0] * opposite[0] + outward[1] * opposite[1] > 0;
    const candidates = badgeCandidates(anchor, facingIn ? outward.map(value => -value) : outward, onPick ? 25 : 39);
    const free = ([x, y]) =>
      badges.every(([px, py]) => Math.abs(x - px) >= 66 || Math.abs(y - py) >= 50) &&
      separateNames.every(([px, py]) => Math.abs(x - px) >= 39 || Math.abs(y - py) >= 32);
    const [x, y] = candidates.find(free) ?? candidates[0];
    badges.push([x, y]);
    const label = labelFor(names, key);
    const value = displayEvidence(shape, key);
    const mark = isAngle
      ? svgElement("path", { d: anglePath(points, index, 17), class: "feature" })
      : svgElement("line", { x1: first[0], y1: first[1], x2: second[0], y2: second[1], class: "feature" });
    const [ax, ay] = anchor;
    svg.append(svgElement("line", { x1: ax, y1: ay, x2: x, y2: y, class: "leader" }), mark);

    const badge = document.createElement(onPick ? "button" : "span");
    badge.className = "evidence";
    badge.dataset.key = key;
    badge.style.left = 100 * x / boardWidth + "%";
    badge.style.top = 100 * y / boardHeight + "%";
    const name = document.createElement("span");
    name.className = key[0] === "s" ? "segment" : "";
    name.textContent = label;
    const amount = document.createElement("strong");
    amount.textContent = value;
    badge.append(name, amount);
    if (onPick) {
      badge.type = "button";
      badge.setAttribute("aria-label", label + " " + value);
      badge.addEventListener("click", () => onPick(key));
    }
    return { key, badge, mark };
  });

  points.forEach(([x, y], index) => {
    svg.append(svgElement("circle", { cx: x, cy: y, r: 3, class: "vertex" }));
    if (namePositions[index]) diagramLabel(svg, names[index], namePositions[index]);
  });
  board.replaceChildren(svg, ...items.map(item => item.badge));

  return (states, showExtra = false, locked = false) => {
    if (extraArc) extraArc.dataset.show = String(showExtra);
    items.forEach(({ key, badge, mark }) => {
      const state = states[key] ?? "";
      badge.dataset.mark = mark.dataset.mark = state;
      if (onPick) {
        badge.setAttribute("aria-pressed", String(state !== ""));
        badge.setAttribute("aria-disabled", String(locked || (state !== "" && state !== "active")));
      }
    });
  };
}
