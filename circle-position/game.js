(() => {
  const { start, svg, line, label, animate, add, scale } = geometryQuiz;
  const center = [190, 130];
  const relations = {
    point: [
      { value: 'less', label: '圓內', result: '點 P 在圓內。' },
      { value: 'equal', label: '圓上', result: '點 P 在圓周上。' },
      { value: 'greater', label: '圓外', result: '點 P 在圓外。' },
    ],
    line: [
      { value: 'less', label: '相交', hits: 2, result: '直線與圓相交，有 2 個交點。這條直線是割線。' },
      { value: 'equal', label: '相切', hits: 1, result: '直線與圓相切，只有 1 個交點。切點半徑垂直切線。' },
      { value: 'greater', label: '相離', hits: 0, result: '直線與圓相離，有 0 個交點。' },
    ],
  };

  function makeQuestion(kind, radius, distance, angle, diameter = false) {
    const comparison = Math.sign(distance - radius);
    const relation = relations[kind][comparison + 1];
    const point = kind === 'point';
    const given = diameter ? `直徑 ${radius * 2} 公分` : `半徑 ${radius} 公分`;
    const measure = point ? '圓心 O 到點 P 的距離' : '圓心 O 到直線 L 的距離';
    const conversion = diameter ? `半徑是 ${radius * 2} ÷ 2 ＝ ${radius} 公分。` : '';
    const zero = distance === 0 ? (point ? '點 P 與圓心 O 重合。' : '直線 L 通過圓心 O。') : '';
    return {
      kind, radius, distance, angle, relation, answer: relation.value,
      options: relations[kind],
      prompt: point ? '點 P 在圓的什麼位置？' : '直線 L 和圓是什麼關係？',
      detail: `圓的${given}，${measure}是 ${distance} 公分。`,
      explanation: `${conversion}距離 ${distance} ${['<', '＝', '>'][comparison + 1]} 半徑 ${radius}（公分）。${zero}${relation.result}`,
    };
  }

  const basic = [
    makeQuestion('point', 6, 4, -28),
    makeQuestion('point', 7, 7, 18),
    makeQuestion('point', 5, 8, -26),
    makeQuestion('line', 5, 3, -30),
    makeQuestion('line', 8, 8, -90),
    makeQuestion('line', 6, 9, 0),
  ];
  const challenge = [
    makeQuestion('point', 9, 0, 0, true),
    makeQuestion('point', 6, 6, -42, true),
    makeQuestion('point', 7, 9, 38, true),
    makeQuestion('line', 4, 0, 32, true),
    makeQuestion('line', 5, 5, 35, true),
    makeQuestion('line', 8, 10, -35, true),
  ];

  function dot(parent, [cx, cy], radius, className) {
    return svg(parent, 'circle', { cx, cy, r: radius, class: className });
  }

  function drawBoard(host, question) {
    const { kind, radius, distance, angle, relation } = question;
    const point = kind === 'point';
    const radians = angle * Math.PI / 180;
    const normal = [Math.cos(radians), Math.sin(radians)];
    const tangent = [-normal[1], normal[0]];
    const factor = Math.min(90 / radius, 104 / Math.max(radius, distance));
    const displayRadius = radius * factor;
    const at = (offset, along = 0) => add(center, add(scale(normal, offset), scale(tangent, along)));
    const diagram = svg(host, 'svg', {
      viewBox: '0 0 440 260', role: 'img', 'aria-label': '圓 O 與半徑 r。',
    });
    dot(diagram, center, displayRadius, 'circle-outline');
    line(diagram, center, add(center, scale([-.8, .6], displayRadius)), 'radius-line');
    label(diagram, add(center, [-43, 43]), 'r', 'diagram-label radius-label');
    const measurement = svg(diagram, 'g');
    const moving = svg(diagram, 'g', { visibility: 'hidden' });
    if (point) {
      dot(moving, [0, 0], 7, 'position-point');
    } else {
      line(moving, scale(tangent, -260), scale(tangent, 260), 'target-line');
    }
    dot(diagram, center, 4, 'center-point');
    const centerLabel = label(diagram, add(center, [-17, -15]), 'O', 'diagram-label center-label');
    const marks = svg(diagram, 'g');

    function frame(offset) {
      moving.removeAttribute('visibility');
      moving.setAttribute('transform', `translate(${at(offset).join(' ')})`);
    }

    function reveal() {
      const offset = distance * factor;
      frame(offset);
      const foot = at(offset);
      if (distance > 0) {
        line(measurement, center, foot, 'distance-line');
        label(measurement, at(offset / 2, -16), 'd', 'diagram-label distance-label');
      }
      if (point) {
        if (distance === 0) {
          centerLabel.textContent = 'O = P';
          centerLabel.setAttribute('x', center[0] - 30);
        } else label(marks, at(offset + 16, 12), 'P', 'diagram-label');
      } else {
        label(marks, at(offset - 14, angle < 0 ? 102 : -102), 'L', 'diagram-label');
        if (distance > 0) {
          const square = [at(offset - 12), at(offset - 12, 12), at(offset, 12)];
          svg(marks, 'polyline', { points: square.join(' '), class: 'right-angle' });
        }
        if (relation.hits === 1) dot(marks, foot, 7, 'intersection');
        if (relation.hits === 2) {
          const halfChord = factor * Math.sqrt(radius ** 2 - distance ** 2);
          dot(marks, at(offset, halfChord), 7, 'intersection');
          dot(marks, at(offset, -halfChord), 7, 'intersection');
        }
      }
      diagram.setAttribute('aria-label', `圓 O 的半徑 ${radius} 公分，距離 ${distance} 公分。${relation.result}`);
    }

    return {
      slide(progress) {
        const end = distance * factor;
        frame(end + (129 - end) * (1 - progress) ** 2);
      },
      reveal,
    };
  }

  function draw(host, caption, question) {
    const point = question.kind === 'point';
    const objectName = point ? '點 P' : '直線 L';
    caption.textContent = `先比較距離與半徑，作答後顯示${objectName}。`;
    drawBoard(host, question);
    let cancel = () => {};

    function replay() {
      cancel();
      host.replaceChildren();
      const board = drawBoard(host, question);
      caption.textContent = `${objectName}移到題目指定的位置。`;
      cancel = animate(540, (progress) => {
        if (progress < 1) {
          board.slide(progress);
          return;
        }
        board.reveal();
        caption.textContent = point ? question.relation.result : `交點 ${question.relation.hits} 個。${question.relation.hits ? '黃色圓點標出交點。' : ''}`;
      });
    }

    return {
      reveal() {
        replay();
        return [['重播圖解', replay]];
      },
      dispose() { cancel(); },
    };
  }

  start({
    title: '會碰到圓嗎？',
    unit: '第5冊・第2章 圓・第1節 點、直線與圓之間的位置關係',
    intro: '先用距離與半徑判斷點或直線的位置，答完看圖形移動，再數數交點。',
    storage: 'circle-position-settings',
    startLabel: '開始挑戰',
    learnLabel: '查看圓的位置小抄',
    demoCaption: '圓心到直線的距離等於半徑時，直線恰好碰到圓一點。',
    modes: {
      basic: { name: '基礎', description: '已知半徑，直接比較', questions: basic },
      challenge: { name: '挑戰', description: '先由直徑求半徑', questions: challenge },
    },
    draw,
    drawDemo: (host) => drawBoard(host, basic[4]).reveal(),
  });
})();
