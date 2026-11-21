(() => {
  const { start, svg, line, label } = geometryQuiz;
  const classes = ['甲班', '乙班'];
  const options = [
    { value: 'a', label: '甲班' },
    { value: 'b', label: '乙班' },
    { value: 'tie', label: '一樣' },
  ];
  const metrics = {
    range: {
      name: '全距',
      left: 0,
      right: 4,
      definition: '最大值 − 最小值',
      prompt: '哪一班的分數從最低到最高跨得比較廣？',
      legend: '全距較大',
      explanation: '比全距，要量從最小值到最大值的整段。',
    },
    iqr: {
      name: '四分位距',
      left: 1,
      right: 3,
      definition: 'Q₃ − Q₁',
      prompt: '哪一班中間一半的分數範圍較窄？',
      legend: '四分位距較小',
      explanation: '比中間一半的分布範圍，要量盒子的寬度。',
    },
  };
  const example = [[35, 55, 60, 65, 95], [45, 50, 65, 80, 90]];

  function measure(summary, { left, right }) {
    return summary[right] - summary[left];
  }

  function comparison(rows, key) {
    const [a, b] = rows.map((summary) => measure(summary, metrics[key]));
    if (a === b) return 'tie';
    const aMatches = key === 'range' ? a > b : a < b;
    return aMatches ? 'a' : 'b';
  }

  function basicQuestion(key, a, b) {
    const rows = [a, b];
    const metric = metrics[key];
    const answer = comparison(rows, key);
    const result = answer === 'tie'
      ? `兩班的${metric.name}一樣。`
      : `${metric.legend}的是${options.find((option) => option.value === answer).label}。`;
    return {
      rows,
      keys: [key],
      options,
      answer,
      prompt: metric.prompt,
      detail: `從盒狀圖比較兩班的${metric.name}。`,
      explanation: `${result}${metric.explanation}`,
    };
  }

  function challengeQuestion(a, b) {
    const rows = [a, b];
    const keys = ['range', 'iqr'];
    return {
      rows,
      keys,
      groups: keys.map((key) => ({ legend: metrics[key].legend, options, answer: comparison(rows, key) })),
      prompt: '同一對盒狀圖，兩種比法',
      detail: '各選一個答案，再一起送出。',
      explanation: '全距看兩端，四分位距看盒寬。兩種量法的比較結果可能不同。',
    };
  }

  const basic = [
    basicQuestion('range', [35, 50, 65, 75, 95], [45, 55, 65, 75, 85]),
    basicQuestion('range', [45, 50, 65, 80, 85], [35, 55, 60, 70, 90]),
    basicQuestion('range', [35, 45, 60, 70, 85], [40, 55, 65, 80, 90]),
    basicQuestion('iqr', [40, 50, 65, 75, 85], [35, 55, 60, 70, 95]),
    basicQuestion('iqr', [35, 55, 65, 70, 95], [45, 50, 60, 75, 90]),
    basicQuestion('iqr', [40, 45, 65, 70, 90], [50, 55, 60, 80, 95]),
  ];
  const challenge = [
    challengeQuestion([35, 55, 60, 70, 90], [45, 50, 65, 75, 85]),
    challengeQuestion([45, 50, 60, 80, 90], [35, 60, 65, 70, 95]),
    challengeQuestion([35, 45, 60, 80, 90], [45, 55, 65, 75, 85]),
    challengeQuestion([45, 55, 65, 75, 85], [40, 50, 65, 80, 95]),
    challengeQuestion([40, 50, 65, 75, 90], [45, 55, 65, 70, 95]),
    challengeQuestion([40, 55, 60, 75, 85], [35, 50, 65, 70, 95]),
  ];

  function drawChart(host, rows) {
    const left = 85;
    const right = 522;
    const axisY = 194;
    const positions = [60, 137];
    const toX = (score) => left + (score - 30) * (right - left) / 70;
    const diagram = svg(host, 'svg', {
      viewBox: '0 0 560 244',
      role: 'img',
      'aria-label': rows.map((summary, index) =>
        `${classes[index]}的最小值、第一四分位數、中位數、第三四分位數、最大值依序是 ${summary.join('、')} 分`).join('。'),
    });

    for (let score = 30; score <= 100; score += 5) {
      const x = toX(score);
      const major = score % 10 === 0;
      line(diagram, [x, 17], [x, axisY], major ? 'grid-line major' : 'grid-line');
      line(diagram, [x, axisY], [x, axisY + (major ? 7 : 4)], 'axis-line');
      if (major) label(diagram, [x, axisY + 20], String(score), 'diagram-label tick-label');
    }
    line(diagram, [left, axisY], [right + 13, axisY], 'axis-line');
    svg(diagram, 'path', { d: `M ${right + 17} ${axisY} l -7 -4 v 8 Z`, class: 'axis-arrow' });
    label(diagram, [right, 230], '分數（分）', 'diagram-label axis-unit');

    rows.forEach((summary, index) => {
      const [min, q1, median, q3, max] = summary.map(toX);
      const y = positions[index];
      const plot = svg(diagram, 'g', { class: `plot class-${index}` });
      label(plot, [43, y], classes[index], 'diagram-label class-label');
      line(plot, [min, y], [q1, y], 'whisker');
      line(plot, [q3, y], [max, y], 'whisker');
      for (const end of [min, max]) line(plot, [end, y - 9], [end, y + 9], 'whisker');
      svg(plot, 'rect', { x: q1, y: y - 14, width: q3 - q1, height: 28, class: 'box' });
      line(plot, [median, y - 14], [median, y + 14], 'median');
      summary.forEach((score) => label(plot, [toX(score), y - 27], String(score), 'diagram-label value-label'));
    });

    const marks = svg(diagram, 'g', { 'aria-hidden': 'true' });
    return function highlight(metric) {
      marks.replaceChildren();
      rows.forEach((summary, index) => {
        const x1 = toX(summary[metric.left]);
        const x2 = toX(summary[metric.right]);
        const y = positions[index] + 23;
        const bracket = svg(marks, 'g', { class: 'measurement' });
        svg(bracket, 'path', { d: `M ${x1} ${y - 4} v 7 H ${x2} v -7` });
      });
    };
  }

  function showMeasure(caption, paint, rows, key) {
    const metric = metrics[key];
    paint(metric);
    const heading = document.createElement('p');
    heading.textContent = `${metric.name}＝${metric.definition}`;
    const equations = document.createElement('div');
    equations.className = 'equations';
    rows.forEach((summary, index) => {
      const equation = document.createElement('div');
      const name = document.createElement('strong');
      name.className = `class-${index}`;
      name.textContent = classes[index];
      const calculation = document.createElement('span');
      calculation.textContent = `${summary[metric.right]} − ${summary[metric.left]} ＝ ${measure(summary, metric)} 分`;
      equation.append(name, calculation);
      equations.append(equation);
    });
    caption.replaceChildren(heading, equations);
  }

  const study = document.querySelector('#study-diagram');
  if (study) {
    const paint = drawChart(study, example);
    const caption = document.querySelector('#study-caption');
    const buttons = [...document.querySelectorAll('[data-metric]')];
    showMeasure(caption, paint, example, 'range');
    buttons.forEach((button) => button.addEventListener('click', () => {
      showMeasure(caption, paint, example, button.dataset.metric);
      buttons.forEach((item) => item.setAttribute('aria-pressed', item === button));
    }));
    return;
  }

  start({
    title: '哪一班比較集中？',
    unit: '第6冊・第2章 統計與機率・第1節 資料的分析',
    intro: '看兩班的盒狀圖，判斷哪一班的分數跨得更廣，或哪一班的中間一半更集中。',
    storage: 'boxplot-compare-settings',
    startLabel: '開始挑戰',
    learnLabel: '查看盒狀圖小抄',
    demoCaption: '兩班共用同一分數刻度。盒內的直線是中位數。',
    shuffleOptions: false,
    modes: {
      basic: { name: '基礎', description: '每題比較一種距離，6 題', questions: basic },
      challenge: { name: '挑戰', description: '同時比較兩種距離，6 題', questions: challenge },
    },
    draw(host, caption, { rows, keys }) {
      const paint = drawChart(host, rows);
      caption.setAttribute('aria-live', 'polite');
      caption.textContent = '兩班同一次小考的分數。';
      return {
        reveal() {
          showMeasure(caption, paint, rows, keys[0]);
          if (keys.length === 1) return [];
          return keys.map((key) => [
            `標出${metrics[key].name}`,
            () => showMeasure(caption, paint, rows, key),
          ]);
        },
        dispose() {},
      };
    },
    drawDemo: (host) => drawChart(host, example),
  });
})();
