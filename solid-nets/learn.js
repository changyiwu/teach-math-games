(() => {
  const get = (id) => document.getElementById(id);
  const { solid, options } = netQuestions.demo;
  const preview = netDiagram.panels([get('valid'), get('invalid')], solid, options);
  let cancel = () => {};
  preview.draw(0, false);
  get('study-fold').addEventListener('click', () => {
    cancel();
    cancel = preview.play();
  });
  get('study-reset').addEventListener('click', () => {
    cancel();
    preview.draw(0, false);
  });
})();
