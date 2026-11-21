const polygonTurn = (() => {
  const { svg, line, label, animate, add, subtract, scale, length, unit, bounds } = geometryQuiz;
  const radians = (degrees) => degrees * Math.PI / 180;
  const direction = (degrees) => [Math.cos(radians(degrees)), Math.sin(radians(degrees))];
  const heading = ([x, y]) => Math.atan2(y, x) * 180 / Math.PI;
  const midpoint = (a, b) => scale(add(a, b), 0.5);
  const centerOf = (points) => scale(points.reduce(add, [0, 0]), 1 / points.length);
  const names = 'ABCDEFGHIJKL';
  const viewWidth = 520;
  const viewHeight = 262;

  function normalize(raw) {
    const [minX, minY, maxX, maxY] = bounds(raw);
    const factor = Math.min(324 / (maxX - minX), 153 / (maxY - minY));
    const center = [(minX + maxX) / 2, (minY + maxY) / 2];
    return raw.map((point) => add(scale(subtract(point, center), factor), [260, 132]));
  }

  function triangle(angles) {
    const b = radians(angles[1]);
    const c = radians(angles[2]);
    return normalize([[0, 0], [1, 0], scale(direction(angles[0]), Math.sin(b) / Math.sin(c))]);
  }

  function regularPolygon(sides) {
    return normalize(Array.from({ length: sides }, (_, index) => direction(-90 + 360 * index / sides)));
  }

  function angleQuestion(angles, target) {
    const interior = angles[target];
    const answer = 180 - interior;
    const values = [...new Set([answer, interior, answer + 15, answer - 15, answer + 25])].slice(0, 4);
    return {
      kind: 'triangle', points: triangle(angles), angles, target, answer,
      turns: angles.map((angle) => 180 - angle),
      prompt: `在 ${names[target]} 點，小車要轉幾度？`,
      detail: `小車沿 A → B → C → A 行駛。${names[target]} 點的內角是 ${interior}°。`,
      options: values.map((value) => ({ value, label: `${value}°` })),
      explanation: `內角和同一頂點的這個外角互補。180° − ${interior}° ＝ ${answer}°，所以在 ${names[target]} 點要轉 ${answer}°。`,
    };
  }

  function sidesQuestion(sides) {
    const turn = 360 / sides;
    return {
      kind: 'regular', points: regularPolygon(sides), turns: Array(sides).fill(turn), answer: sides,
      prompt: '這個正多邊形有幾條邊？',
      detail: `小車沿著正多邊形的邊走一圈，每個頂點都轉 ${turn}°。`,
      options: [sides, sides === 3 ? 6 : sides - 1, sides + 1, sides + 2].map((value) => ({ value, label: `${value} 邊` })),
      explanation: `一圈共有 360°，每個外角都等於 ${turn}°。360° ÷ ${turn}° ＝ ${sides}，所以有 ${sides} 條邊。`,
    };
  }

  const basic = [
    [[48, 58, 74], 0], [[40, 55, 85], 1], [[29, 48, 103], 2], [[97, 37, 46], 0],
    [[41, 92, 47], 1], [[54, 66, 60], 2], [[68, 48, 64], 0], [[33, 72, 75], 1],
  ].map(([angles, target]) => angleQuestion(angles, target));
  const challenge = [4, 5, 6, 8, 9, 10, 12, 3].map(sidesQuestion);

  function board(host, description) {
    return svg(host, 'svg', { viewBox: `0 0 ${viewWidth} ${viewHeight}`, class: 'route-svg', role: 'img', 'aria-label': description });
  }

  function turnArc(parent, pivot, from, degrees, radius, className) {
    const start = add(pivot, scale(direction(from), radius));
    const end = add(pivot, scale(direction(from + degrees), radius));
    return svg(parent, 'path', { d: `M ${start.join(' ')} A ${radius} ${radius} 0 0 1 ${end.join(' ')}`, class: className });
  }

  function drawTurn(parent, pivot, from, degrees, reach = 43) {
    line(parent, pivot, add(pivot, scale(direction(from), reach)), 'turn-extension');
    turnArc(parent, pivot, from, degrees, reach * .66, 'turn-arc');
  }

  function cornerPreview(host, turn) {
    const diagram = board(host, `正多邊形的其中一個頂點，外角是 ${turn} 度。`);
    const pivot = [235, 169];
    const from = -turn / 2;
    const start = add(pivot, scale(direction(from), -112));
    const end = add(pivot, scale(direction(from + turn), 112));
    line(diagram, start, pivot, 'road');
    line(diagram, pivot, end, 'road');
    line(diagram, start, pivot, 'road-center');
    line(diagram, pivot, end, 'road-center');
    drawTurn(diagram, pivot, from, turn, 115);
    svg(diagram, 'circle', { cx: pivot[0], cy: pivot[1], r: 8, class: 'route-dot is-current' });
    label(diagram, [374, 169], `${turn}°`, 'diagram-label route-value');
  }

  function drawRoad(host, question, reveal) {
    const { points, target, kind, turns } = question;
    const center = centerOf(points);
    const start = midpoint(points[0], points[1]);
    const diagram = board(host, reveal ? `行駛路線。各頂點外角依序是 ${turns.join('、')} 度。` :
      `三角形 A、B、C 路線。${names[target]} 點內角 ${question.angles[target]} 度，求外角。`);
    svg(diagram, 'polygon', { points: points.join(' '), class: 'road' });
    svg(diagram, 'polygon', { points: points.join(' '), class: 'road-center' });
    const passed = svg(diagram, 'g', { 'aria-hidden': 'true' });
    const markers = points.map((point, index) => {
      const [cx, cy] = point;
      const dot = svg(diagram, 'circle', { cx, cy, r: points.length > 8 ? 5 : 8, class: 'route-dot' });
      if (kind === 'triangle') {
        const radial = unit(subtract(point, center));
        const display = index === target && !reveal ? `${names[index]}  ?°` : `${names[index]}  ${turns[index]}°`;
        label(diagram, add(point, scale(radial, 36)), display, 'diagram-label route-point');
      }
      return dot;
    });
    label(diagram, add(start, [0, -28]), '起點', 'diagram-label route-point');
    if (!reveal && kind === 'triangle') {
      const pivot = points[target];
      const previous = points[(target + 2) % 3];
      const next = points[(target + 1) % 3];
      turnArc(diagram, pivot, heading(subtract(next, pivot)), question.angles[target], 23, 'inner-arc');
      const inward = unit(add(unit(subtract(previous, pivot)), unit(subtract(next, pivot))));
      label(diagram, add(pivot, scale(inward, 48)), `${question.angles[target]}°`, 'diagram-label route-point');
    }
    const steering = svg(diagram, 'g', { 'aria-hidden': 'true' });
    const car = svg(diagram, 'g', { 'aria-hidden': 'true', transform: `translate(${start.join(' ')}) rotate(${heading(subtract(points[1], points[0]))})` });
    svg(car, 'path', { d: 'M -12 -8 L 6 -8 L 14 0 L 6 8 L -12 8 Z', class: 'car' });
    return { car, passed, start, markers, steering };
  }

  function drive(host, caption, question, attempted) {
    const { points, turns, target } = question;
    const { car, passed, start, markers, steering } = drawRoad(host, question, true);
    const firstHeading = heading(subtract(points[1], points[0]));
    const legs = [];
    let from = start;
    let angle = firstHeading;
    let total = 0;
    for (let stop = 1; stop <= points.length; stop++) {
      const index = stop % points.length;
      const to = points[index];
      const turn = index === target && attempted !== undefined ? attempted : turns[index];
      legs.push({ from, to, angle, total });
      legs.push({ from: to, to, angle, turn, index, total });
      from = to;
      angle += turn;
      total += turn;
      if (index === target && attempted !== undefined) {
        const exit = add(to, scale(direction(angle), 47));
        legs.push({ from: to, to: exit, angle, total, offRoad: true });
        break;
      }
    }
    if (attempted === undefined) legs.push({ from, to: start, angle, total });
    const durations = legs.map((leg) => leg.turn === undefined ? 155 + length(subtract(leg.to, leg.from)) * .7 : 215);
    const duration = durations.reduce((sum, value) => sum + value, 0);
    let shownLeg = -1;
    return animate(duration, (progress) => {
      let elapsed = progress * duration;
      let current = 0;
      while (current < legs.length - 1 && elapsed >= durations[current]) elapsed -= durations[current++];
      const part = Math.min(1, elapsed / durations[current]);
      const leg = legs[current];
      const position = add(leg.from, scale(subtract(leg.to, leg.from), part));
      car.setAttribute('transform', `translate(${position.join(' ')}) rotate(${leg.angle + (leg.turn ?? 0) * part})`);
      if (shownLeg !== current) {
        passed.replaceChildren();
        for (const travelled of legs.slice(0, current)) {
          if (travelled.turn === undefined) line(passed, travelled.from, travelled.to, 'travelled');
        }
        if (leg.offRoad) line(passed, leg.from, leg.to, 'wrong-road');
        for (const [index, marker] of markers.entries()) marker.classList.toggle('is-current', leg.index === index);
        steering.replaceChildren();
        if (leg.turn !== undefined) drawTurn(steering, leg.from, leg.angle, leg.turn, 31);
        caption.textContent = leg.turn === undefined ? `累計轉彎 ${leg.total}°` :
          `${names[leg.index]} 點轉 ${leg.turn}°，完成後累計 ${leg.total + leg.turn}°。`;
        shownLeg = current;
      }
      if (progress === 1) {
        if (attempted === undefined) {
          line(passed, leg.from, leg.to, 'travelled');
          caption.textContent = '回到起點，車頭回到原方向。累計轉彎 360°。';
        } else {
          caption.textContent = `在 ${names[target]} 點轉 ${attempted}°，小車會偏離下一段路。`;
        }
      }
    });
  }

  function draw(host, caption, question) {
    if (question.kind === 'regular') {
      cornerPreview(host, question.turns[0]);
      caption.textContent = '先看一個頂點，答完會展開整圈路線。';
    } else {
      drawRoad(host, question, false);
      caption.textContent = '外角是沿原本的方向往前延伸後，車頭轉向下一段路的角。';
    }
    let cancel = () => {};
    function replay(attempted) {
      cancel();
      host.replaceChildren();
      cancel = drive(host, caption, question, attempted);
    }
    return {
      reveal(selected) {
        replay();
        const actions = [['重播正解', () => replay()]];
        if (question.kind === 'triangle' && selected !== undefined && selected !== question.answer) {
          actions.push(['試走我的答案', () => replay(selected)]);
        }
        return actions;
      },
      dispose() { cancel(); },
    };
  }

  return { basic, challenge, draw, drawDemo: (host) => cornerPreview(host, 24) };
})();

if (typeof document !== 'undefined') {
  geometryQuiz.start({
    title: '轉彎一圈',
    unit: '第4冊・第3章 三角形的基本性質・第1節 三角形與多邊形的內角與外角',
    storage: 'polygon-turn-settings',
    intro: '算出小車該轉幾度，或從每次轉彎的角度找出邊數。答完就沿著路線走一圈。',
    startLabel: '開始挑戰',
    learnLabel: '查看內外角小抄',
    demoCaption: '車頭從原來的行進方向轉向下一段路，這個轉角就是外角。',
    modes: {
      basic: { name: '基礎', description: '三角形內角換外角', questions: polygonTurn.basic },
      challenge: { name: '挑戰', description: '用外角找正多邊形邊數', questions: polygonTurn.challenge },
    },
    draw: polygonTurn.draw,
    drawDemo: polygonTurn.drawDemo,
  });
}
