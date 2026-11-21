const triangleCongruence = (() => {
  const { svg, line, label, animate, add, subtract, scale, length, unit, bounds } = geometryQuiz;
  const edges = [[0, 1], [1, 2], [2, 0]];
  const leftNames = [...'ABC'];
  const rules = {
    SSS: { sides: [0, 1, 2], angles: [], message: '三組對應邊分別相等。' },
    SAS: { sides: [0, 2], angles: [0], message: '兩組對應邊和這兩邊的夾角分別相等。' },
    ASA: { sides: [0], angles: [0, 1], message: '兩組對應角和這兩角的夾邊分別相等。' },
    AAS: { sides: [1], angles: [0, 1], message: '兩組對應角和其中一角的對邊分別相等。' },
    RHS: { sides: [1, 2], angles: [], rightAngle: 0, message: '兩個直角三角形的斜邊和一股分別相等。' },
    AAA: { sides: [], angles: [0, 1, 2], message: '三組對應角相等時，兩個三角形可以有不同大小。圖上的對應邊長不同。' },
    SSA: { sides: [0, 1], angles: [0], message: '題目給的是 ∠A，兩條已知邊 AB 和 BC 的夾角在 B。以 B 為圓心、BC 為半徑畫弧，弧和射線有兩個交點，所以這組條件可以畫出兩個不同的三角形。' },
  };
  const options = ['SSS', 'SAS', 'ASA', 'AAS', 'RHS', '條件不足'].map((value) => ({ value, label: value }));
  const rad = (degrees) => degrees * Math.PI / 180;
  const deg = (radians) => radians * 180 / Math.PI;
  const midpoint = (a, b) => scale(add(a, b), .5);
  const view = [540, 246];

  function rotate([x, y], degrees) {
    const sine = Math.sin(rad(degrees));
    const cosine = Math.cos(rad(degrees));
    return [cosine * x - sine * y, sine * x + cosine * y];
  }

  function makeQuestion(rule, { width, apex, turns, flip = false, names = 'DEF', ratio = .68, angle, radius }) {
    const match = rules[rule];
    const counter = rule === 'AAA' || rule === 'SSA';
    let left = [[0, 0], [width, 0], apex];
    let right = left;
    if (rule === 'AAA') right = left.map((point) => scale(point, ratio));
    if (rule === 'SSA') {
      const offset = Math.sqrt(radius ** 2 - (width * Math.sin(rad(angle))) ** 2);
      const center = width * Math.cos(rad(angle));
      const ray = rotate([1, 0], angle);
      left = [[0, 0], [width, 0], scale(ray, center - offset)];
      right = [[0, 0], [width, 0], scale(ray, center + offset)];
    }
    return {
      rule, left, right, turns, flip, names: [...names], match, options,
      answer: counter ? '條件不足' : rule,
      prompt: '這些記號能判定三角形全等嗎？',
      detail: '同樣的刻線標示等長，同樣的角弧標示等角。請選全等依據，或選「條件不足」。',
      explanation: counter ? match.message : `${rule}。${match.message}所以 △ABC ≅ △${names}。`,
    };
  }

  const basic = [
    ['SSS', { width: 113, apex: [43, 85], turns: [0, 20], names: 'EFD' }],
    ['SAS', { width: 110, apex: [34, 80], turns: [-8, 28], names: 'DEF' }],
    ['ASA', { width: 117, apex: [78, 61], turns: [10, -21], names: 'FDE' }],
    ['AAS', { width: 105, apex: [33, 70], turns: [5, 10], names: 'EDF' }],
    ['RHS', { width: 94, apex: [0, 73], turns: [-12, 17], names: 'DFE' }],
    ['AAA', { width: 112, apex: [63, 69], turns: [2, -14], names: 'FED' }],
    ['SSA', { width: 104, turns: [-15, 0], angle: 36, radius: 75, names: 'EFD' }],
    ['SAS', { width: 91, apex: [65, 82], turns: [7, 46], names: 'FDE' }],
  ].map(([rule, props]) => makeQuestion(rule, props));

  const challenge = [
    ['SSS', { width: 127, apex: [18, 72], turns: [-27, 111], flip: true, names: 'EDF' }],
    ['SAS', { width: 116, apex: [76, 70], turns: [41, 138], flip: true, names: 'FDE' }],
    ['ASA', { width: 85, apex: [52, 77], turns: [-32, 135], names: 'DFE' }],
    ['AAS', { width: 128, apex: [79, 90], turns: [22, -85], flip: true, names: 'FED' }],
    ['RHS', { width: 83, apex: [0, 107], turns: [36, 147], flip: true, names: 'EFD' }],
    ['AAA', { width: 124, apex: [31, 78], turns: [-23, 72], flip: true, ratio: .74, names: 'EDF' }],
    ['SSA', { width: 120, turns: [-28, 117], angle: 35, radius: 84, flip: true, names: 'FDE' }],
    ['SSA', { width: 105, turns: [19, -105], angle: 33, radius: 69, names: 'DFE' }],
  ].map(([rule, props]) => makeQuestion(rule, props));

  function poses(question) {
    const rotations = question.turns;
    const shapes = [question.left, question.right];
    const rotated = shapes.map((shape, index) => shape.map(([x, y]) =>
      rotate([index === 1 && question.flip ? -x : x, y], rotations[index])));
    const boxes = rotated.map(bounds);
    const factor = Math.min(...boxes.flatMap(([x, y, endX, endY]) => [157 / (endX - x), 136 / (endY - y)]));
    return boxes.map(([x, y, endX, endY], index) => ({
      origin: subtract([137 + 266 * index, 130], scale([(x + endX) / 2, (y + endY) / 2], factor)),
      angle: rotations[index], flip: index === 1 && question.flip ? -1 : 1, factor,
    }));
  }

  function project([x, y], pose) {
    return add(pose.origin, scale(rotate([x * pose.flip, y], pose.angle), pose.factor));
  }

  function edgeName(names, edge) {
    return edges[edge].map((index) => names[index]).join('');
  }

  function triangleName(points) {
    return `△${[...points].sort().join('')}`;
  }

  function evidence(question) {
    const { match, names } = question;
    const sides = match.sides.map((edge) => `${edgeName(leftNames, edge)} ＝ ${edgeName(names, edge)}`);
    const angles = match.angles.map((index) => `∠${leftNames[index]} ＝ ∠${names[index]}`);
    if (match.rightAngle !== undefined) angles.push(`∠A ＝ ∠${names[0]} ＝ 90°`);
    return [...sides, ...angles].join('，');
  }

  function angleMark(parent, points, index, count, rightAngle = false) {
    const pivot = points[index];
    const u = unit(subtract(points[(index + 1) % 3], pivot));
    const v = unit(subtract(points[(index + 2) % 3], pivot));
    if (rightAngle) {
      const corner = scale(add(u, v), 16);
      const marks = [add(pivot, scale(u, 16)), add(pivot, corner), add(pivot, scale(v, 16))];
      svg(parent, 'polyline', { points: marks.join(' '), class: 'angle-mark' });
      return;
    }
    const sweep = u[0] * v[1] - u[1] * v[0] >= 0 ? 1 : 0;
    for (let mark = 0; mark < count; mark++) {
      const radius = 18 + 6 * mark;
      const start = add(pivot, scale(u, radius));
      const end = add(pivot, scale(v, radius));
      svg(parent, 'path', { d: `M ${start.join(' ')} A ${radius} ${radius} 0 0 ${sweep} ${end.join(' ')}`, class: 'angle-mark' });
    }
  }

  function drawMarks(parent, points, match) {
    for (const [mark, edge] of match.sides.entries()) {
      const [a, b] = edges[edge].map((vertex) => points[vertex]);
      const along = unit(subtract(b, a));
      const normal = [-along[1], along[0]];
      for (let tick = 0; tick <= mark; tick++) {
        const center = add(midpoint(a, b), scale(along, (tick - mark / 2) * 7));
        const halfTick = scale(normal, 7);
        line(parent, subtract(center, halfTick), add(center, halfTick), 'edge-mark');
      }
    }
    for (const [count, vertex] of match.angles.entries()) angleMark(parent, points, vertex, count + 1);
    if (match.rightAngle !== undefined) angleMark(parent, points, match.rightAngle, 1, true);
  }

  function drawShape(parent, points, names, className, match) {
    const group = svg(parent, 'g', { class: className });
    svg(group, 'polygon', { points: points.join(' '), class: 'triangle-outline' });
    if (match) drawMarks(group, points, match);
    const center = scale(points.reduce(add, [0, 0]), 1 / 3);
    for (const [index, point] of points.entries()) {
      label(group, add(point, scale(unit(subtract(point, center)), 19)), names[index], 'diagram-label vertex');
    }
    return group;
  }

  function drawScene(host, question) {
    const [leftPose, rightPose] = poses(question);
    const diagram = svg(host, 'svg', {
      viewBox: `0 0 ${view.join(' ')}`, class: 'triangles-svg', role: 'img',
      'aria-label': `三角形 ABC 和三角形 DEF。已知條件：${evidence(question)}。`,
    });
    const leftPoints = question.left.map((point) => project(point, leftPose));
    const rightPoints = question.right.map((point) => project(point, rightPose));
    const divider = line(diagram, [270, 38], [270, 210], 'divider');
    drawShape(diagram, leftPoints, leftNames, 'left-shape', question.match);
    const rightGroup = drawShape(diagram, rightPoints, question.names, 'right-shape', question.match);
    label(diagram, [137, 19], '△ABC', 'diagram-label shape-name');
    label(diagram, [403, 19], triangleName(question.names), 'diagram-label shape-name');
    return { diagram, divider, leftPose, rightPose, rightGroup };
  }

  function drawSsaArc(parent, [a, b, c], far) {
    const rightRay = add(far, scale(unit(subtract(far, a)), 16));
    line(parent, a, rightRay, 'ssa-construction');
    const radius = length(subtract(c, b));
    const u = subtract(c, b);
    const v = subtract(far, b);
    const sweep = u[0] * v[1] - u[1] * v[0] >= 0 ? 1 : 0;
    svg(parent, 'path', { d: `M ${c.join(' ')} A ${radius} ${radius} 0 0 ${sweep} ${far.join(' ')}`, class: 'ssa-construction' });
    for (const [cx, cy] of [c, far]) svg(parent, 'circle', { cx, cy, r: 5, class: 'ssa-point' });
  }

  function finishDiagram(diagram, group, question, pose) {
    const left = question.left.map((point) => project(point, pose));
    const right = question.right.map((point) => project(point, pose));
    const center = scale(left.reduce(add, [0, 0]), 1 / 3);
    const positions = [];
    for (const [index, point] of left.entries()) {
      const combined = question.answer !== '條件不足' || (question.rule === 'AAA' && index === 0);
      const name = question.rule === 'SSA' && index === 2 ? 'C₁' : leftNames[index];
      const position = add(point, scale(unit(subtract(point, center)), 20));
      positions.push(position);
      label(group, position, combined ? `${name} · ${question.names[index]}` : name, 'diagram-label vertex');
    }
    if (question.rule === 'SSA') {
      const far = right[2];
      drawSsaArc(group, left, far);
      const position = add(far, scale(unit(subtract(far, left[0])), 22));
      positions.push(position);
      label(group, position, 'C₂', 'diagram-label vertex');
    }
    const [minX, minY, maxX, maxY] = bounds([...left, ...right, ...positions]);
    const height = Math.max(180, maxY - minY + 52, (maxX - minX + 76) * view[1] / view[0]);
    const width = height * view[0] / view[1];
    diagram.setAttribute('viewBox', `${(minX + maxX - width) / 2} ${(minY + maxY - height) / 2} ${width} ${height}`);
  }

  function demonstrate(host, caption, question) {
    const { diagram, divider, leftPose, rightPose, rightGroup } = drawScene(host, question);
    const alignedOrigin = [leftPose.origin[0] + 108, leftPose.origin[1]];
    const alignedPose = { ...leftPose, origin: alignedOrigin };
    const movedLeft = svg(diagram, 'g', { class: 'left-shape comparison-target', 'aria-hidden': 'true' });
    svg(movedLeft, 'polygon', { points: question.left.map((point) => project(point, alignedPose)).join(' '), class: 'triangle-outline' });
    const moved = svg(diagram, 'polygon', { points: question.right.join(' '), class: 'triangle-outline overlay-shape' });
    const construction = svg(diagram, 'g', { 'aria-hidden': 'true' });
    const leftOriginal = diagram.querySelector('.left-shape');
    const ghostParts = [leftOriginal, rightGroup, ...diagram.querySelectorAll('.shape-name')];
    const change = ((leftPose.angle - rightPose.angle + 540) % 360) - 180;
    divider.remove();
    for (const part of ghostParts) part.classList.add('ghost-shape');
    caption.textContent = question.flip ? '先翻面，再旋轉和平移，讓對應頂點對齊。' : '旋轉和平移，讓對應頂點對齊。';

    return animate(1400, (progress) => {
      const flipAt = question.flip ? .34 : 0;
      const translation = Math.max(0, (progress - flipAt) / (1 - flipAt));
      const flip = progress < flipAt ? -Math.cos(Math.PI * progress / flipAt) : 1;
      const origin = add(rightPose.origin, scale(subtract(alignedOrigin, rightPose.origin), translation));
      const angle = rightPose.angle + change * translation;
      moved.setAttribute('transform', `translate(${origin.join(' ')}) rotate(${angle}) scale(${flip * rightPose.factor} ${rightPose.factor})`);
      if (progress !== 1) return;
      for (const part of ghostParts) part.remove();
      finishDiagram(diagram, construction, question, alignedPose);
      if (question.rule === 'SSA') {
        caption.textContent = '把兩條對應底邊疊在 AB 上。射線上的 C₁ 和 C₂ 都符合條件，形成兩個不同的三角形。';
      } else if (question.rule === 'AAA') {
        caption.textContent = '將一組對應頂點和相連兩邊的方向對齊。兩圖的形狀相同，對應邊長不同。';
      } else {
        caption.textContent = `三組對應頂點全部重合，△ABC ≅ △${question.names.join('')}。`;
      }
      diagram.setAttribute('aria-label', caption.textContent);
    });
  }

  function draw(host, caption, question) {
    drawScene(host, question);
    caption.textContent = evidence(question);
    let cancel = () => {};
    function replay() {
      cancel();
      host.replaceChildren();
      cancel = demonstrate(host, caption, question);
    }
    return {
      reveal() {
        replay();
        return [[question.answer === '條件不足' ? '重播反例' : '重播疊合', replay]];
      },
      dispose() { cancel(); },
    };
  }

  const demo = makeQuestion('SAS', { width: 108, apex: [46, 75], turns: [-11, 34], names: 'FDE' });
  return { basic, challenge, draw, drawDemo: (host) => drawScene(host, demo) };
})();

if (typeof document !== 'undefined') {
  geometryQuiz.start({
    title: '三角形能疊合嗎？',
    unit: '第4冊・第3章 三角形的基本性質・第3節 三角形的全等性質',
    storage: 'triangle-congruence-settings',
    intro: '根據邊和角的記號選出全等依據。答完看兩個三角形如何疊合，或看看符合相同條件的反例。',
    startLabel: '開始判斷',
    learnLabel: '查看三角形全等小抄',
    demoCaption: '先找到對應記號，再檢查給的是夾角、夾邊，還是其中一角的對邊。',
    modes: {
      basic: { name: '基礎', description: '辨認邊、角與全等依據', questions: triangleCongruence.basic },
      challenge: { name: '挑戰', description: '旋轉、翻面與反例', questions: triangleCongruence.challenge },
    },
    draw: triangleCongruence.draw,
    drawDemo: triangleCongruence.drawDemo,
  });
}
