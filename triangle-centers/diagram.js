const triangleCenters = (() => {
  const { svg, line, label, animate, add, subtract, scale, length, unit, bounds } = geometryQuiz;
  const width = 460;
  const height = 280;
  const radians = (degrees) => degrees * Math.PI / 180;
  const dot = ([x, y], [u, v]) => x * u + y * v;
  const perpendicular = ([x, y]) => [-y, x];
  const average = (p, q) => scale(add(p, q), .5);

  function makeTriangle([angleA, angleB, angleC], rotation) {
    const sideAB = Math.sin(radians(angleC)) / Math.sin(radians(angleA));
    const a = [sideAB * Math.cos(radians(angleB)), -sideAB * Math.sin(radians(angleB))];
    const cos = Math.cos(radians(rotation));
    const sin = Math.sin(radians(rotation));
    return [a, [0, 0], [1, 0]].map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
  }

  function construct(vertices, kind) {
    const [a, b, c] = vertices;
    const edges = [[b, c], [c, a], [a, b]];
    const sides = edges.map(([p, q]) => length(subtract(q, p)));
    const midpoints = edges.map(([p, q]) => average(p, q));
    const centroid = scale(add(add(a, b), c), 1 / 3);

    if (kind === 'centroid') {
      return { center: centroid, midpoints, guides: vertices.map((p, i) => [p, midpoints[i]]) };
    }

    if (kind === 'incenter') {
      const weighted = vertices.map((p, i) => scale(p, sides[i]));
      const center = scale(add(add(weighted[0], weighted[1]), weighted[2]), 1 / (sides[0] + sides[1] + sides[2]));
      const guides = vertices.map((p, i) => {
        const j = (i + 1) % 3;
        const k = (i + 2) % 3;
        const end = scale(add(scale(vertices[j], sides[j]), scale(vertices[k], sides[k])), 1 / (sides[j] + sides[k]));
        return [p, end];
      });
      const feet = edges.map(([p, q]) => {
        const tangent = unit(subtract(q, p));
        return add(p, scale(tangent, dot(subtract(center, p), tangent)));
      });
      return { center, guides, feet, radius: length(subtract(center, feet[0])) };
    }

    const u = subtract(b, a);
    const v = subtract(c, a);
    const doubledCross = 2 * (u[0] * v[1] - u[1] * v[0]);
    const center = add(a, scale([
      dot(u, u) * v[1] - dot(v, v) * u[1],
      u[0] * dot(v, v) - v[0] * dot(u, u),
    ], 1 / doubledCross));
    const guides = edges.map(([p, q], i) => {
      const middle = midpoints[i];
      const normal = perpendicular(unit(subtract(q, p)));
      const reach = dot(subtract(center, middle), normal);
      return [Math.min(0, reach) - .095, Math.max(0, reach) + .095].map((offset) => add(middle, scale(normal, offset)));
    });
    return { center, midpoints, guides, radius: length(subtract(center, a)) };
  }

  function fit(vertices, { guides, center, radius }) {
    const points = [...vertices, ...guides.flat()];
    if (radius) points.push(add(center, [-radius, -radius]), add(center, [radius, radius]));
    const [left, top, right, bottom] = bounds(points);
    const middle = average([left, top], [right, bottom]);
    const factor = Math.min((width - 76) / (right - left), (height - 78) / (bottom - top));
    return { project: (point) => add([width / 2, height / 2], scale(subtract(point, middle), factor)), factor };
  }

  function circle(parent, [cx, cy], r, className) {
    return svg(parent, 'circle', { cx, cy, r, class: className });
  }

  function rightAngle(parent, foot, tangent, normal) {
    const side = scale(tangent, 9);
    const inward = scale(normal, 9);
    const corners = [add(foot, side), add(foot, add(side, inward)), add(foot, inward)];
    svg(parent, 'polyline', { points: corners.join(' '), class: 'perpendicular-mark' });
  }

  function centerLabelPoint(center, avoid) {
    const directions = [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]];
    let best;
    let clearance = -Infinity;
    for (const direction of directions) {
      const candidate = add(center, scale(unit(direction), 23));
      const space = Math.min(30, ...avoid.map((p) => length(subtract(candidate, p))));
      if (space > clearance) {
        best = candidate;
        clearance = space;
      }
    }
    return best;
  }

  function makeBoard(host, question) {
    const { vertices, kind, name, symbol, shape } = question;
    const solution = construct(vertices, kind);
    const { project, factor } = fit(vertices, solution);
    const [a, b, c] = vertices.map(project);
    const center = project(solution.center);
    const centroid = scale(add(add(a, b), c), 1 / 3);
    const triangle = [a, b, c];
    const edges = [[b, c], [c, a], [a, b]];
    const diagram = svg(host, 'svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': '三角形 ABC，三個頂點已標示。' });
    const circleLayer = svg(diagram, 'g', { visibility: 'hidden' });
    svg(diagram, 'polygon', { points: triangle.join(' '), class: 'triangle-outline' });
    const construction = svg(diagram, 'g', { visibility: 'hidden' });
    const marks = svg(diagram, 'g', { visibility: 'hidden' });
    const vertexLabels = triangle.map((p, i) => {
      circle(diagram, p, 3.7, 'vertex-point');
      const place = add(p, scale(unit(subtract(p, centroid)), 17));
      label(diagram, place, 'ABC'[i], 'diagram-label');
      return place;
    });

    const guides = solution.guides.map(([p, q]) => {
      const from = project(p);
      const to = project(q);
      return { from, to, stroke: line(construction, from, from, 'construction-line') };
    });

    function finish() {
      circleLayer.removeAttribute('visibility');
      marks.removeAttribute('visibility');
      diagram.setAttribute('aria-label', `三角形 ABC。${shape}${name} ${symbol} 的作圖與位置。${question.caption}`);
    }

    if (solution.radius) circle(circleLayer, center, solution.radius * factor, 'center-circle');

    if (kind === 'circumcenter') {
      for (const vertex of triangle) line(marks, center, vertex, 'equal-radius');
      solution.midpoints.map(project).forEach((middle, i) => {
        const [p, q] = edges[i];
        const tangent = unit(subtract(q, p));
        rightAngle(marks, middle, tangent, perpendicular(tangent));
        circle(marks, middle, 3, 'midpoint');
      });
    }

    if (kind === 'incenter') {
      solution.feet.map(project).forEach((foot, i) => {
        const [p, q] = edges[i];
        line(marks, center, foot, 'equal-radius');
        rightAngle(marks, foot, unit(subtract(q, p)), unit(subtract(center, foot)));
        circle(marks, foot, 3.7, 'midpoint');
      });
    }

    if (kind === 'centroid') {
      const projectedMidpoints = solution.midpoints.map(project);
      const middle = projectedMidpoints[0];
      line(marks, a, center, 'median-long');
      line(marks, center, middle, 'median-short');
      for (const point of projectedMidpoints) circle(marks, point, 3.7, 'midpoint');
      const middleLabel = add(middle, scale(unit(subtract(middle, centroid)), 16));
      label(marks, middleLabel, 'M', 'diagram-label');
      vertexLabels.push(middleLabel);
    }

    circle(marks, center, 5.3, 'center-point');
    label(marks, centerLabelPoint(center, [...triangle, ...vertexLabels]), symbol, 'diagram-label center-label');

    return (progress) => {
      construction.removeAttribute('visibility');
      guides.forEach(({ from, to, stroke }, i) => {
        const part = Math.max(0, Math.min(1, 2 * progress - .5 * i));
        const end = add(from, scale(subtract(to, from), part));
        stroke.setAttribute('x2', end[0]);
        stroke.setAttribute('y2', end[1]);
      });
      if (progress === 1) finish();
    };
  }

  function draw(host, caption, question) {
    caption.textContent = '答完會畫出三條線，標出它們的交點。';
    let render = makeBoard(host, question);
    let cancel = () => {};
    function reveal() {
      cancel = animate(850, (progress) => {
        render(progress);
        if (progress === 1) caption.textContent = question.caption;
      });
    }
    return {
      reveal() {
        reveal();
        return [['重播圖解', () => {
          cancel();
          host.replaceChildren();
          render = makeBoard(host, question);
          caption.textContent = '觀察三條線交在哪裡。';
          reveal();
        }]];
      },
      dispose() { cancel(); },
    };
  }

  return { makeTriangle, construct, draw, drawDemo: (host, question) => makeBoard(host, question)(1) };
})();
