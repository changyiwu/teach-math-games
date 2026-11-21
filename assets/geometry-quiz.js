const geometryQuiz = (() => {
  const svgNS = 'http://www.w3.org/2000/svg';

  function svg(parent, tag, attributes = {}, label = '') {
    const element = document.createElementNS(svgNS, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (label) element.textContent = label;
    parent.append(element);
    return element;
  }

  const add = ([x, y], [u, v]) => [x + u, y + v];
  const subtract = ([x, y], [u, v]) => [x - u, y - v];
  const scale = ([x, y], factor) => [x * factor, y * factor];
  const length = ([x, y]) => Math.hypot(x, y);
  const unit = (vector) => scale(vector, 1 / length(vector));
  const bounds = (points) => {
    const x = points.map((point) => point[0]);
    const y = points.map((point) => point[1]);
    return [Math.min(...x), Math.min(...y), Math.max(...x), Math.max(...y)];
  };

  function line(parent, from, to, className) {
    return svg(parent, 'line', { x1: from[0], y1: from[1], x2: to[0], y2: to[1], class: className });
  }

  function label(parent, [x, y], text, className) {
    return svg(parent, 'text', { x, y, class: className }, text);
  }

  function animate(duration, draw, instant = matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (instant) {
      draw(1);
      return () => {};
    }
    let frame;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      draw(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    draw(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function start(config) {
    const root = document.querySelector('main');
    root.innerHTML = `
      <section id="menu" class="menu" aria-labelledby="title">
        <div class="intro">
          <h1 id="title" tabindex="-1">${config.title}</h1>
          <p class="unit">${config.unit}</p>
          <p class="lead">${config.intro}</p>
          <fieldset class="modes">
            <legend>選擇難度</legend>
            <div class="mode-options">${Object.entries(config.modes).map(([key, mode]) => `
              <label><input type="radio" name="mode" value="${key}"><span><strong>${mode.name}</strong><small>${mode.description}</small></span></label>`).join('')}</div>
          </fieldset>
          <div class="start-controls">
            <label for="limit">每題限時</label>
            <select id="limit"><option value="0">不限時</option><option value="15">15 秒</option><option value="25">25 秒</option><option value="40">40 秒</option><option value="60">60 秒</option></select>
            <button id="start" class="primary" type="button">${config.startLabel}</button>
          </div>
          <a class="text-link" href="learn.html">${config.learnLabel}</a>
        </div>
        <figure class="board demo">
          <div id="demo"></div>
          <figcaption>${config.demoCaption}</figcaption>
        </figure>
      </section>
      <section id="round" aria-labelledby="prompt" hidden>
        <div class="round-top">
          <span id="progress"></span>
          <div id="timer" class="timer" hidden><progress id="clock" aria-label="剩餘時間"></progress><span id="seconds"></span></div>
          <button id="back" class="quiet" type="button">回難度選單</button>
        </div>
        <h1 id="prompt" tabindex="-1"></h1>
        <div class="play-layout">
          <figure class="board round-board"><div id="diagram"></div><figcaption id="caption"></figcaption></figure>
          <div class="answer-panel">
            <p id="detail"></p>
            <div id="answer-controls">
              <div id="options" class="options" role="group" aria-label="作答選項"></div>
              <button id="submit" class="primary" type="button" disabled>確認作答</button>
            </div>
            <div id="feedback" class="feedback" hidden>
              <h2 id="verdict" tabindex="-1"></h2>
              <ul id="answer-review" class="answer-review" hidden></ul>
              <p id="explanation"></p>
              <div id="replays" class="replays"></div>
              <button id="next" class="primary" type="button">下一題</button>
            </div>
          </div>
        </div>
      </section>
      <section id="results" class="results" aria-labelledby="result-title" hidden>
        <h1 id="result-title" tabindex="-1">挑戰完成</h1>
        <p id="score" class="score"></p>
        <p id="score-detail"></p>
        <div class="result-controls">
          <button id="retry" class="primary" type="button">再玩一輪</button>
          <button id="settings" class="quiet" type="button">回難度選單</button>
        </div>
      </section>`;

    const get = (id) => document.getElementById(id);
    const limit = get('limit');
    const firstMode = Object.keys(config.modes)[0];
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem(config.storage)) ?? {}; } catch { /* Settings are optional. */ }
    const radios = [...root.querySelectorAll('input[name="mode"]')];
    const selectedMode = Object.hasOwn(config.modes, settings.mode) ? settings.mode : firstMode;
    radios.find((radio) => radio.value === selectedMode).checked = true;
    limit.value = ['0', '15', '25', '40', '60'].includes(settings.limit) ? settings.limit : '0';
    function save() {
      const mode = radios.find((radio) => radio.checked).value;
      try { localStorage.setItem(config.storage, JSON.stringify({ mode, limit: limit.value })); } catch { /* Play without storage. */ }
      return mode;
    }

    let deck;
    let index;
    let correctCount;
    let expiredCount;
    let state;
    let question;
    let groups;
    let selected;
    let viewed;
    let timer;
    let deadline;

    function show(id) {
      for (const section of ['menu', 'round', 'results']) get(section).hidden = section !== id;
    }

    function makeButton(text, className, action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = text;
      button.addEventListener('click', action);
      return button;
    }

    function answer(expired = false) {
      if (state !== 'playing') return;
      expired ||= deadline > 0 && performance.now() >= deadline;
      if (!expired && selected.includes(undefined)) return;
      state = 'review';
      clearInterval(timer);
      const correct = !expired && groups.every((group, index) => selected[index] === group.answer);
      correctCount += Number(correct);
      expiredCount += Number(expired);
      get('detail').hidden = true;
      get('answer-controls').hidden = true;
      get('feedback').hidden = false;
      get('feedback').dataset.correct = correct;
      get('verdict').textContent = correct ? '答對了！' : expired ? '時間到' : '再看一次這題';
      const review = get('answer-review');
      review.hidden = !question.groups;
      if (question.groups) {
        review.replaceChildren(...groups.map((group, groupIndex) => {
          const item = document.createElement('li');
          const expected = group.options.find((option) => option.value === group.answer).label;
          const attempted = group.options.find((option) => option.value === selected[groupIndex])?.label;
          if (attempted) item.dataset.correct = selected[groupIndex] === group.answer;
          item.textContent = `${group.legend}：${expected}${attempted && attempted !== expected ? `（你選了${attempted}）` : ''}`;
          return item;
        }));
      }
      const attempted = question.options?.find((option) => option.value === selected[0]);
      get('explanation').textContent = `${!expired && !correct && attempted ? `你選了 ${attempted.label}。` : ''}${question.explanation}`;
      get('next').textContent = index === deck.length - 1 ? '看本輪結果' : '下一題';
      const selection = question.groups ? selected : selected[0];
      const actions = viewed.reveal(expired ? undefined : selection);
      get('replays').replaceChildren(...actions.map(([text, action]) => makeButton(text, 'quiet', action)));
      get('verdict').focus({ preventScroll: true });
    }

    function openQuestion() {
      viewed?.dispose();
      clearInterval(timer);
      state = 'playing';
      question = deck[index];
      groups = question.groups ?? [{ options: shuffle(question.options), answer: question.answer }];
      selected = Array(groups.length).fill(undefined);
      get('progress').textContent = `第 ${index + 1} / ${deck.length} 題`;
      get('prompt').textContent = question.prompt;
      get('detail').textContent = question.detail;
      get('detail').hidden = false;
      get('answer-controls').hidden = false;
      get('submit').disabled = true;
      get('feedback').hidden = true;
      get('diagram').replaceChildren();
      get('caption').replaceChildren();
      viewed = config.draw(get('diagram'), get('caption'), question);

      const options = get('options');
      options.replaceChildren();
      options.classList.toggle('option-groups', Boolean(question.groups));
      groups.forEach((group, groupIndex) => {
        let choices = options;
        if (group.legend) {
          const field = document.createElement('fieldset');
          const legend = document.createElement('legend');
          legend.textContent = group.legend;
          choices = document.createElement('div');
          choices.className = 'options';
          field.append(legend, choices);
          options.append(field);
        }
        for (const option of group.options) {
          const button = makeButton(option.label, 'choice', () => {
            selected[groupIndex] = option.value;
            for (const choice of choices.children) choice.setAttribute('aria-pressed', choice === button);
            get('submit').disabled = selected.includes(undefined);
          });
          button.setAttribute('aria-pressed', 'false');
          choices.append(button);
        }
      });

      const seconds = Number(limit.value);
      get('timer').hidden = seconds === 0;
      deadline = seconds ? performance.now() + seconds * 1000 : 0;
      if (seconds) {
        get('clock').max = seconds;
        const update = () => {
          const remaining = Math.max(0, (deadline - performance.now()) / 1000);
          get('clock').value = remaining;
          get('seconds').textContent = `${Math.ceil(remaining)} 秒`;
          if (!remaining) answer(true);
        };
        update();
        timer = setInterval(update, 80);
      }
      get('prompt').focus({ preventScroll: true });
    }

    function startRound() {
      const mode = save();
      deck = shuffle(config.modes[mode].questions);
      index = correctCount = expiredCount = 0;
      show('round');
      openQuestion();
    }

    function openMenu() {
      clearInterval(timer);
      viewed?.dispose();
      state = 'menu';
      show('menu');
      get('title').focus({ preventScroll: true });
    }

    get('start').addEventListener('click', startRound);
    get('retry').addEventListener('click', startRound);
    get('submit').addEventListener('click', () => answer());
    get('back').addEventListener('click', openMenu);
    get('settings').addEventListener('click', openMenu);
    get('next').addEventListener('click', () => {
      if (++index < deck.length) {
        openQuestion();
        get('round').scrollIntoView({ block: 'start' });
        return;
      }
      viewed.dispose();
      state = 'results';
      get('score').textContent = `${correctCount} / ${deck.length}`;
      get('score-detail').textContent = `答對 ${correctCount} 題，答錯 ${deck.length - correctCount - expiredCount} 題，超時 ${expiredCount} 題。`;
      show('results');
      get('result-title').focus();
    });
    for (const radio of radios) radio.addEventListener('change', save);
    limit.addEventListener('change', save);
    config.drawDemo(get('demo'));
  }

  return { start, svg, line, label, animate, add, subtract, scale, length, unit, bounds };
})();
