(() => {
  const { start, svg, line, label, animate } = geometryQuiz;
  const options = [0, 1, 2].map((value) => ({ value, label: `${value} 個` }));
  const number = (value) => String(value).replace('-', '−');

  function intersectionCount(a, k) {
    if (k === 0) return 1;
    return Math.sign(a) === Math.sign(k) ? 0 : 2;
  }

  function formula(a, h, k, constantFirst) {
    const fraction = { 0.25: [1, 4], 0.5: [1, 2], 1.5: [3, 2] }[Math.abs(a)];
    const coefficient = fraction ? `<mfrac><mn>${fraction[0]}</mn><mn>${fraction[1]}</mn></mfrac>`
      : Math.abs(a) === 1 ? '' : `<mn>${Math.abs(a)}</mn>`;
    const x = '<mi>x</mi>';
    const base = h === 0 ? x : `<mrow><mo>(</mo>${x}<mo>${h > 0 ? '−' : '+'}</mo><mn>${Math.abs(h)}</mn><mo>)</mo></mrow>`;
    const square = `${coefficient}<msup>${base}<mn>2</mn></msup>`;
    const constant = `<mo>${k < 0 ? '−' : '+'}</mo><mn>${Math.abs(k)}</mn>`;
    const signedSquare = `${a < 0 ? '<mo>−</mo>' : ''}${square}`;
    const expression = constantFirst
      ? `${k < 0 ? '<mo>−</mo>' : ''}<mn>${Math.abs(k)}</mn><mo>${a < 0 ? '−' : '+'}</mo>${square}`
      : signedSquare + (k === 0 ? '' : constant);
    const template = document.createElement('template');
    template.innerHTML = `<math><mi>y</mi><mo>=</mo>${expression}</math>`;
    return template.content.firstElementChild;
  }

  function makeQuestion(a, h, k, constantFirst = false) {
    const answer = intersectionCount(a, k);
    const position = k === 0 ? '在 x 軸上' : `在 x 軸${k > 0 ? '上' : '下'}方`;
    const reasons = ['整條曲線都在 x 軸的同一側，有 0 個交點。', '頂點就是唯一的交點。', '曲線在對稱軸左右各穿過 x 軸一次，有 2 個交點。'];
    return {
      a, h, k, answer, options,
      prompt: () => formula(a, h, k, constantFirst),
      detail: '這條拋物線與 x 軸有幾個交點？',
      explanation: `開口向${a > 0 ? '上' : '下'}，頂點 (${number(h)}, ${number(k)}) ${position}。${reasons[answer]}`,
    };
  }

  const basic = [
    makeQuestion(1, -2, 2), makeQuestion(1, 2, 0), makeQuestion(2, 0, -3),
    makeQuestion(-1, 1, -2), makeQuestion(-2, -2, 0), makeQuestion(-1, 0, 3),
  ];
  const challenge = [
    makeQuestion(0.5, 3, 1, true), makeQuestion(0.25, -2, 0), makeQuestion(0.5, 2, -3, true),
    makeQuestion(-1.5, -3, -1, true), makeQuestion(-0.25, 3, 0), makeQuestion(-0.5, -2, 3, true),
  ];

  function drawGraph(host, { a, h }, zoom = false) {
    host.replaceChildren();
    const left = 36;
    const right = 444;
    const top = 24;
    const bottom = 248;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    const step = zoom ? 48 : 26;
    const centerX = zoom ? h : 0;
    const toX = (x) => midX + (x - centerX) * step;
    const toY = (y) => midY - y * step;
    const axisX = toX(0);
    const minX = centerX + (left - midX) / step;
    const maxX = centerX + (right - midX) / step;
    const maxY = Math.floor((midY - top) / step);
    const diagram = svg(host, 'svg', { viewBox: '0 0 480 272', role: 'img', 'aria-label': '空白坐標平面。' });
    const grid = svg(diagram, 'g');
    const ticks = svg(diagram, 'g');
    for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
      if (x === 0) continue;
      line(grid, [toX(x), top], [toX(x), bottom], 'gridline');
      label(ticks, [toX(x), midY + 21], number(x), 'diagram-label tick x-tick');
    }
    for (let y = -maxY; y <= maxY; y++) {
      if (y === 0) continue;
      line(grid, [left, toY(y)], [right, toY(y)], 'gridline');
      label(ticks, [axisX - 13, toY(y)], number(y), 'diagram-label tick');
    }
    const clip = svg(diagram, 'clipPath', { id: `plot-${host.id}` });
    svg(clip, 'rect', { x: left, y: top, width: right - left, height: bottom - top });
    const plot = svg(diagram, 'g', { 'clip-path': `url(#plot-${host.id})` });
    const curve = svg(plot, 'path', { class: 'parabola' });
    line(diagram, [left, midY], [right + 6, midY], 'axis horizontal-axis');
    line(diagram, [axisX, bottom], [axisX, top - 6], 'axis');
    svg(diagram, 'path', {
      d: `M ${right + 6} ${midY} l -8 -4 v 8 Z M ${axisX} ${top - 6} l -4 8 h 8 Z`, class: 'axis-arrow',
    });
    label(diagram, [right + 16, midY], 'x', 'diagram-label axis-label');
    label(diagram, [axisX + 12, top - 8], 'y', 'diagram-label axis-label');
    label(diagram, [axisX + 10, midY + 21], 'O', 'diagram-label origin');
    diagram.append(ticks);
    const marks = svg(diagram, 'g');

    return function render(k, markPoints = true) {
      // 用二次貝茲曲線畫出精確拋物線。控制點由左端點與該處切線斜率決定。
      const y = (x) => a * (x - h) ** 2 + k;
      const controlY = y(minX) + a * (minX - h) * (maxX - minX);
      curve.setAttribute('d', `M ${left} ${toY(y(minX))} Q ${midX} ${toY(controlY)} ${right} ${toY(y(maxX))}`);
      marks.replaceChildren();
      if (!markPoints) return;

      const count = intersectionCount(a, k);
      svg(marks, 'circle', { cx: toX(h), cy: toY(k), r: count === 1 ? 12 : 6, class: 'vertex' });
      const offset = Math.sqrt(Math.abs(k / a));
      const roots = count === 2 ? [h - offset, h + offset] : count === 1 ? [h] : [];
      for (const x of roots) svg(marks, 'circle', { cx: toX(x), cy: midY, r: 6, class: 'intersection' });
      diagram.setAttribute('aria-label', `拋物線開口向${a > 0 ? '上' : '下'}，頂點 (${number(h)}, ${number(k)})，與 x 軸有 ${count} 個交點。`);
    };
  }

  function draw(host, caption, question) {
    let render = drawGraph(host, question);
    const { a, k, answer } = question;
    let height = k;
    let cancel = () => {};
    caption.textContent = '作答後顯示拋物線與交點。';

    function show(target) {
      render(target);
      const count = intersectionCount(a, target);
      const shift = target === 0 ? '頂點恰好在 x 軸上。' : `頂點在 x 軸${target > 0 ? '上' : '下'}方。`;
      caption.textContent = `${shift}交點 ${count} 個。${count > 0 ? '金色圓點標出交點。' : ''}`;
    }

    function move(target) {
      cancel();
      const from = height;
      if (from === target) {
        show(target);
        return;
      }
      caption.textContent = '拋物線平移中…';
      cancel = animate(440, (progress) => {
        height = progress === 1 ? target : from + (target - from) * progress;
        if (progress === 1) show(target);
        else render(height, false);
      });
    }

    return {
      reveal() {
        if (answer === 1) render = drawGraph(host, question, true);
        show(k);
        if (answer !== 1) return [];
        return [
          ['上移 1 格', () => move(1)],
          ['回到原位', () => move(0)],
          ['下移 1 格', () => move(-1)],
        ];
      },
      dispose() { cancel(); },
    };
  }

  start({
    title: '會碰到 x 軸幾次？',
    unit: '第6冊・第1章 二次函數・第1節 二次函數的圖形與最大值、最小值',
    intro: '看函數式，猜拋物線與 x 軸有幾個交點。選好再送出，看看圖形怎麼回答。',
    storage: 'quadratic-intersections-settings',
    startLabel: '開始挑戰',
    learnLabel: '查看交點判斷小抄',
    demoCaption: '金色圓點標出拋物線與 x 軸的交點。',
    shuffleOptions: false,
    modes: {
      basic: { name: '基礎', description: '從頂點式判斷，6 題', questions: basic },
      challenge: { name: '挑戰', description: '分數係數與常數項在前，6 題', questions: challenge },
    },
    draw,
    drawDemo: (host) => drawGraph(host, { a: 0.5, h: -1 })(-2),
  });
})();
