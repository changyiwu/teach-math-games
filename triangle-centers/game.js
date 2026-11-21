(() => {
  const constructions = [
    { value: 'circumcenter', label: '中垂線', name: '外心', symbol: 'O', caption: '外接圓通過 A、B、C，OA、OB、OC 等長。' },
    { value: 'incenter', label: '角平分線', name: '內心', symbol: 'I', caption: '內切圓與三邊相切，I 到三邊的垂直距離相等。' },
    { value: 'centroid', label: '中線', name: '重心', symbol: 'G', caption: 'M 是 BC 的中點，AG：GM ＝ 2：1。' },
  ];
  const positions = [
    { value: 'inside', label: '三角形內' },
    { value: 'edge', label: '三角形邊上' },
    { value: 'outside', label: '三角形外' },
  ];

  function makeQuestion(kind, angles, rotation, challenge = false) {
    const { name, symbol, caption } = constructions.find((option) => option.value === kind);
    const largest = Math.max(...angles);
    const shape = largest < 90 ? '銳角三角形' : largest === 90 ? '直角三角形' : '鈍角三角形';
    const [a, b, c] = angles.map((angle, index) => `∠${'ABC'[index]} ＝ ${angle}°`);
    const givens = [a, b, c].filter((_, index) => index !== angles.indexOf(largest)).join('、');
    const detail = challenge ? `已知${givens}。先用內角和判斷三角形是哪一類。` : `已知 △ABC 是${shape}。`;
    const position = kind !== 'circumcenter' || largest < 90 ? 'inside' : largest === 90 ? 'edge' : 'outside';
    const explanation = {
      circumcenter: {
        inside: '銳角三角形的外心在三角形內，到三個頂點等距。',
        edge: '直角三角形的外心在斜邊的中點，外接圓的直徑就是斜邊。',
        outside: '鈍角三角形的外心在三角形外，延長中垂線可看到交點。',
      }[position],
      incenter: '三條內角平分線交於內心。銳角、直角和鈍角三角形的內心都在三角形內。',
      centroid: '重心在三角形內。沿任一條中線，從頂點到重心是 2 份，從重心到對邊中點是 1 份。',
    }[kind];
    const missing = 'ABC'[angles.indexOf(largest)];
    const vertices = triangleCenters.makeTriangle(angles, rotation);
    return {
      kind, name, symbol, caption, shape, vertices, detail,
      prompt: `找出三角形的${name}`,
      explanation: `${challenge ? `∠${missing} ＝ ${largest}°，所以是${shape}。` : ''}${explanation}`,
      groups: [
        { legend: '作圖線', options: constructions, answer: kind },
        { legend: '交點位置', options: positions, answer: position },
      ],
    };
  }

  const basic = [
    makeQuestion('circumcenter', [63, 52, 65], -8),
    makeQuestion('circumcenter', [90, 57, 33], 9),
    makeQuestion('circumcenter', [108, 30, 42], -7),
    makeQuestion('incenter', [74, 45, 61], 9),
    makeQuestion('incenter', [53, 90, 37], -7),
    makeQuestion('incenter', [32, 106, 42], 11),
    makeQuestion('centroid', [52, 69, 59], 10),
    makeQuestion('centroid', [39, 51, 90], -12),
    makeQuestion('centroid', [32, 41, 107], 12),
  ];
  const challenge = [
    makeQuestion('circumcenter', [50, 73, 57], 12, true),
    makeQuestion('circumcenter', [38, 90, 52], 9, true),
    makeQuestion('circumcenter', [32, 34, 114], -9, true),
    makeQuestion('incenter', [56, 77, 47], -11, true),
    makeQuestion('incenter', [40, 50, 90], 6, true),
    makeQuestion('incenter', [112, 29, 39], 10, true),
    makeQuestion('centroid', [66, 61, 53], -12, true),
    makeQuestion('centroid', [90, 49, 41], 14, true),
    makeQuestion('centroid', [111, 39, 30], -11, true),
  ];

  geometryQuiz.start({
    title: '三心定位站',
    unit: '第5冊・第3章 幾何與證明・<wbr><span class="unit-lesson">第2節 三角形的外心、內心與重心</span>',
    intro: '選出要畫的線，再猜交點的位置。答完看三條線交在哪裡，核對外心、內心和重心的性質。',
    storage: 'triangle-centers-settings',
    startLabel: '開始挑戰',
    learnLabel: '查看三心小抄',
    demoCaption: '中垂線交於外心 O。這個鈍角三角形的外心在三角形外。',
    modes: {
      basic: { name: '基礎', description: '直接給三角形的種類', questions: basic },
      challenge: { name: '挑戰', description: '由兩個已知角推算第三角', questions: challenge },
    },
    draw: triangleCenters.draw,
    drawDemo: (host) => triangleCenters.drawDemo(host, basic[2]),
  });
})();
