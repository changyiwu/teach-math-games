const diagramColors = {
  outline: "#9db5cc",
  first: "#6ee7d2",
  second: "#ffc277",
  check: "#ffab91",
  diagonal: "#8199b4",
  label: "#edf8ff",
  halo: "#112131"
};

function vector(from, to) {
  return { x: to.x - from.x, y: to.y - from.y };
}

function offset(point, direction, distance) {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}

function unit(direction) {
  const length = Math.hypot(direction.x, direction.y);
  return { x: direction.x / length, y: direction.y / length };
}

function interpolate(from, to, fraction) {
  return offset(from, vector(from, to), fraction);
}

function intersection(a, b, c, d) {
  const ac = vector(a, c);
  const bd = vector(b, d);
  const ab = vector(a, b);
  const fraction = (ab.x * bd.y - ab.y * bd.x) / (ac.x * bd.y - ac.y * bd.x);
  return offset(a, ac, fraction);
}

function drawQuadrilateral(canvas, coordinates, marks, checking = false) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const xs = coordinates.map(([x]) => x);
  const ys = coordinates.map(([, y]) => y);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const scale = Math.min((width - 100) / (Math.max(...xs) - Math.min(...xs)),
    (height - 84) / (Math.max(...ys) - Math.min(...ys)));
  const vertices = coordinates.map(([x, y]) => ({
    x: width / 2 + (x - midX) * scale,
    y: height / 2 + (y - midY) * scale
  }));
  const [A, B, C, D] = vertices;
  const O = intersection(A, B, C, D);
  const points = { A, B, C, D, O };
  const names = ["A", "B", "C", "D"];
  const markColors = [diagramColors.first, diagramColors.second];

  function stroke(points, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  function dot(point, color, radius) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function label(name, point, color) {
    ctx.font = "700 20px Cambria, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5;
    ctx.strokeStyle = diagramColors.halo;
    ctx.strokeText(name, point.x, point.y);
    ctx.fillStyle = color;
    ctx.fillText(name, point.x, point.y);
  }

  function lineMark(segment, index, type) {
    let [from, to] = Array.from(segment, name => points[name]);
    if (type === "parallel" && (from.x > to.x || (from.x === to.x && from.y > to.y))) {
      [from, to] = [to, from];
    }
    const direction = unit(vector(from, to));
    const normal = { x: -direction.y, y: direction.x };
    // 同一雙邊兼有兩種記號時，箭頭與短線分開放。
    const fraction = type === "parallel" ? 0.39 : 0.64;
    const color = markColors[index];
    stroke([from, to], color, 3);
    for (let mark = 0; mark <= index; mark++) {
      const center = offset(interpolate(from, to, fraction), direction, (mark - index / 2) * 8);
      if (type === "parallel") {
        const back = offset(center, direction, -6);
        stroke([offset(back, normal, 5), center, offset(back, normal, -5)], color, 2.8);
      } else {
        stroke([offset(center, normal, -7), offset(center, normal, 7)], color, 2.8);
      }
    }
  }

  function angleMark(name, index) {
    const vertex = names.indexOf(name);
    const center = vertices[vertex];
    const next = vector(center, vertices[(vertex + 1) % 4]);
    const previous = vector(center, vertices[(vertex + 3) % 4]);
    const start = Math.atan2(next.y, next.x);
    const end = Math.atan2(previous.y, previous.x);
    // 圖形的頂點依畫面順時針排列，從下一邊到上一邊畫出內角。
    ctx.strokeStyle = markColors[index];
    ctx.lineWidth = 2.6;
    for (let arc = 0; arc <= index; arc++) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, 19 + arc * 6, start, end);
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  for (const point of [B, C, D]) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.fillStyle = "rgba(75, 160, 184, 0.11)";
  ctx.fill();
  ctx.strokeStyle = diagramColors.outline;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  if (marks.diagonals || checking) {
    ctx.setLineDash([6, 7]);
    stroke([A, C], diagramColors.diagonal, 2);
    stroke([B, D], diagramColors.diagonal, 2);
    ctx.setLineDash([]);
  }

  if (checking) {
    stroke([A, O], diagramColors.first, 4);
    stroke([O, C], diagramColors.check, 4);
  } else {
    marks.parallel?.forEach((pair, index) => pair.forEach(segment => lineMark(segment, index, "parallel")));
    marks.equal?.forEach((pair, index) => pair.forEach(segment => lineMark(segment, index, "equal")));
    marks.angles?.forEach((pair, index) => pair.forEach(name => angleMark(name, index)));
    if (marks.right) {
      const towardB = unit(vector(O, B));
      const towardC = unit(vector(O, C));
      const start = offset(O, towardB, 13);
      stroke([start, offset(start, towardC, 13), offset(O, towardC, 13)], diagramColors.second, 2.6);
    }
  }

  vertices.forEach((point, index) => {
    dot(point, diagramColors.label, 3.6);
    const outward = unit(vector({ x: width / 2, y: height / 2 }, point));
    label(names[index], offset(point, outward, 21), diagramColors.label);
  });
  if (marks.diagonals || checking) {
    dot(O, diagramColors.label, 4.2);
    const towardB = unit(vector(O, B));
    const towardC = unit(vector(O, C));
    const between = unit({ x: towardB.x + towardC.x, y: towardB.y + towardC.y });
    label("O", offset(O, between, 30), diagramColors.label);
  }
}
