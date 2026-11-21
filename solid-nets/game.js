(() => {
  const { shuffle } = geometryQuiz;
  const get = (id) => document.getElementById(id);
  const limit = get('limit');
  const modes = ['basic', 'challenge'];
  const storageKey = 'solid-nets-settings';
  const modeInput = (mode) => document.querySelector(`input[name="mode"][value="${mode}"]`);
  const labels = ['A', 'B', 'C'];
  let settings;
  try { settings = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Settings are optional. */ }
  if (modes.includes(settings?.mode)) modeInput(settings.mode).checked = true;
  if (['0', '15', '25', '40', '60'].includes(settings?.limit)) limit.value = settings.limit;

  let state = 'menu';
  let timer;
  let deadline = 0;
  let cancelAnimation = () => {};
  let deck;
  let index;
  let correctCount;
  let expiredCount;
  let question;
  let cards;
  let panels;
  let comparing = false;
  const demo = netQuestions.demo;
  const preview = netDiagram.panels([get('preview-net')], demo.solid, [demo.options[0]]);
  preview.draw(0, false);
  netDiagram.showSolid(get('preview-solid'), demo.solid);
  get('preview').addEventListener('click', () => {
    cancelAnimation();
    cancelAnimation = preview.play();
  });

  function show(section, heading) {
    for (const id of ['menu', 'round', 'results']) get(id).hidden = id !== section;
    get(heading).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function menu() {
    clearInterval(timer);
    cancelAnimation();
    preview.draw(0, false);
    state = 'menu';
    show('menu', 'title');
  }

  function start() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    try { localStorage.setItem(storageKey, JSON.stringify({ mode, limit: limit.value })); } catch { /* Play without storage. */ }
    deck = shuffle(netQuestions[mode]);
    index = 0;
    correctCount = 0;
    expiredCount = 0;
    nextQuestion();
  }

  function updateSelectedCount() {
    const count = cards.filter(({ input }) => input.checked).length;
    get('selected-count').textContent = `已選 ${count} 張`;
    get('submit').disabled = count === 0;
  }

  function makeCard(net, index) {
    const card = document.createElement('label');
    card.className = 'net-card';
    card.innerHTML = `
      <input type="checkbox" aria-label="紙型 ${labels[index]}">
      <span class="net-card-top"><span class="net-letter">${labels[index]}</span><span class="check-mark" aria-hidden="true"></span></span>
      <span class="net-graphic"></span>
      <span class="net-result" hidden></span>`;
    const input = card.querySelector('input');
    input.addEventListener('change', updateSelectedCount);
    return { net, input, card, letter: labels[index], graphic: card.querySelector('.net-graphic') };
  }

  function nextQuestion() {
    clearInterval(timer);
    cancelAnimation();
    if (index >= deck.length) {
      state = 'results';
      get('score').textContent = `${correctCount} / ${deck.length}`;
      get('score-detail').textContent = expiredCount ? `${expiredCount} 題時間到。選齊正確紙型才算答對。` : '選齊正確紙型才算答對。';
      show('results', 'result-title');
      return;
    }

    question = deck[index];
    cards = shuffle(question.options).map(makeCard);
    state = 'playing';
    comparing = false;
    get('cards').replaceChildren(...cards.map(({ card }) => card));
    get('cards').classList.remove('comparing');
    get('choices').classList.remove('reviewing');
    get('target-name').textContent = question.solid.name;
    netDiagram.showSolid(get('target-solid'), question.solid);
    get('progress').textContent = `第 ${index + 1}／${deck.length} 題`;
    get('instructions').textContent = '點選所有能摺合的紙型，可複選。';
    get('feedback').hidden = true;
    get('answer-actions').hidden = false;
    updateSelectedCount();
    show('round', 'prompt');
    render(false);

    const seconds = Number(limit.value);
    deadline = seconds > 0 ? performance.now() + seconds * 1000 : 0;
    get('timer').hidden = !deadline;
    if (deadline) {
      get('clock').max = seconds;
      timer = setInterval(tick, 100);
      tick();
    }
  }

  function tick() {
    const remaining = Math.max(0, deadline - performance.now()) / 1000;
    get('clock').value = remaining;
    get('seconds').textContent = `${Math.ceil(remaining)} 秒`;
    if (!remaining) answer(true);
  }

  function render(review) {
    cancelAnimation();
    const visible = cards.filter(({ net }) => !comparing || net.correct);
    panels = netDiagram.panels(visible.map(({ graphic }) => graphic), question.solid, visible.map(({ net }) => net));
    if (review) cancelAnimation = panels.play();
    else panels.draw(0, false);
  }

  function answer(expired = false) {
    if (state !== 'playing') return;
    expired ||= deadline > 0 && performance.now() >= deadline;
    if (!expired && cards.every(({ input }) => !input.checked)) return;
    clearInterval(timer);
    state = 'review';
    const correct = !expired && cards.every(({ net, input }) => net.correct === input.checked);
    const solution = cards.filter(({ net }) => net.correct);
    correctCount += Number(correct);
    expiredCount += Number(expired);
    for (const { net, input, card } of cards) {
      input.disabled = true;
      card.dataset.folds = net.correct;
      const result = card.querySelector('.net-result');
      result.textContent = `${net.correct ? '能摺合' : '重疊、缺面'}${input.checked ? '（已選）' : ''}`;
      result.hidden = false;
    }
    get('choices').classList.add('reviewing');
    get('instructions').textContent = '金線標出一對接邊，紅斜線標重疊，紅虛線圈出缺面。';
    get('answer-actions').hidden = true;
    get('feedback').dataset.correct = correct;
    get('verdict').textContent = correct ? '答對了！' : expired ? '時間到' : '看看哪些紙型能摺合';
    get('explanation').textContent = `${solution.map(({ letter }) => letter).join('、')} 能摺成${question.solid.name}。`;
    get('compare').hidden = solution.length < 2;
    get('compare').setAttribute('aria-pressed', 'false');
    get('compare').textContent = '並排看兩種摺法';
    get('next').textContent = index === deck.length - 1 ? '看本輪結果' : '下一題';
    get('feedback').hidden = false;
    get('verdict').focus({ preventScroll: true });
    render(true);
  }

  get('submit').addEventListener('click', () => answer());
  get('compare').addEventListener('click', () => {
    comparing = !comparing;
    get('cards').classList.toggle('comparing', comparing);
    get('compare').setAttribute('aria-pressed', String(comparing));
    get('compare').textContent = comparing ? '顯示全部紙型' : '並排看兩種摺法';
    for (const { card, net } of cards) card.hidden = comparing && !net.correct;
    render(true);
  });
  get('replay').addEventListener('click', () => {
    cancelAnimation();
    cancelAnimation = panels.play();
  });
  get('next').addEventListener('click', () => {
    index++;
    nextQuestion();
  });
  get('start').addEventListener('click', start);
  get('retry').addEventListener('click', start);
  get('back').addEventListener('click', menu);
  get('settings').addEventListener('click', menu);
})();
