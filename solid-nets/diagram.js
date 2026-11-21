const netDiagram = (() => {
  const { svg, animate } = geometryQuiz;
  const mid = (a, b) => (a + b) / 2;
  const extent = ([low, high], value) => [Math.min(low, value), Math.max(high, value)];
  const view = { yaw: -0.63, pitch: 0.91 };
  const width = 260;
  const height = 180;
  let patternId = 0;

  function project([x, y, z], { yaw, pitch }) {
    const horizontal = x * Math.cos(yaw) - y * Math.sin(yaw);
    const vertical = x * Math.sin(yaw) + y * Math.cos(yaw);
    return [horizontal, -vertical * Math.cos(pitch) - z * Math.sin(pitch),
      z * Math.cos(pitch) - vertical * Math.sin(pitch)];
  }

  function projectedArea(points) {
    return points.reduce((area, [x, y], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length];
      return area + x * nextY - y * nextX;
    }, 0) / 2;
  }

  function cameraFor(net, target) {
    if (net.correct) return view;
    const duplicate = net.counts.indexOf(2);
    const missing = net.counts.indexOf(0);
    return Array.from({ length: 12 }, (_, i) => ({ yaw: view.yaw + (i - 5) * Math.PI / 6, pitch: view.pitch }))
      .map((camera) => {
        const area = (face) => projectedArea(target[face].map((point) => project(point, camera)));
        const score = Math.max(0, area(duplicate)) * 2 + Math.max(0, area(missing));
        return { camera, score };
      })
      .reduce((best, candidate) => candidate.score > best.score ? candidate : best).camera;
  }

  function exampleSeam(solid, net, camera) {
    if (!net.correct) return [];
    const hinges = new Set(net.pieces.slice(1).map((piece) => {
      const parent = net.pieces[piece.parent].face;
      return solid.faces[parent].edges[piece.hinge].slice().sort().join(',');
    }));
    const edges = new Map();
    net.pieces.forEach((piece, pieceIndex) => {
      solid.faces[piece.face].edges.forEach((ids, edge) => {
        const key = ids.slice().sort().join(',');
        if (!hinges.has(key)) {
          if (!edges.has(key)) edges.set(key, []);
          edges.get(key).push({ pieceIndex, edge });
        }
      });
    });
    const end = solidNets.folded(net, 1);
    const pairs = [...edges.values()];
    const facesViewer = ({ pieceIndex }) => projectedArea(end[pieceIndex].map((point) => project(point, camera))) > 0;
    return pairs.find((pair) => pair.every(facesViewer)) ?? pairs.find((pair) => pair.some(facesViewer)) ?? [];
  }

  function graphic(container) {
    const root = svg(container, 'svg', { viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });
    const defs = svg(root, 'defs');
    const id = `net-overlap-${++patternId}`;
    const pattern = svg(defs, 'pattern', { id, width: 8, height: 8, patternUnits: 'userSpaceOnUse' });
    svg(pattern, 'path', { d: 'M-2 2L2 -2 M0 8L8 0 M6 10L10 6', class: 'overlap-stripe' });
    const scene = svg(root, 'g');
    return { scene, hatch: `url(#${id})` };
  }

  function layout(polygons) {
    const points = polygons.flat();
    return {
      x: points.reduce((bounds, point) => extent(bounds, point[0]), [Infinity, -Infinity]),
      y: points.reduce((bounds, point) => extent(bounds, point[1]), [Infinity, -Infinity]),
    };
  }

  function fit(bounds) {
    return Math.min((width - 20) / (bounds.x[1] - bounds.x[0]), (height - 18) / (bounds.y[1] - bounds.y[0]));
  }

  function paint(graphic, polygons, solid, {
    bounds = layout(polygons), scale = fit(bounds), faces = solid.faces.map((_, index) => index),
    net, seam = [], missing = [], status = false, flat = false,
  } = {}) {
    const { scene, hatch } = graphic;
    scene.replaceChildren();
    const x = mid(...bounds.x);
    const y = mid(...bounds.y);
    const position = ([u, v]) => [width / 2 + (u - x) * scale, height / 2 + (v - y) * scale];
    const pointsAttribute = (points) => points.map(position).map((point) => point.join(',')).join(' ');
    const order = polygons.map((points, index) => ({
      index, points, depth: points.reduce((sum, point) => sum + point[2] / points.length, 0),
    })).sort((a, b) => a.depth - b.depth);
    function strokeEdge(points, index, className) {
      const [x1, y1] = position(points[index]);
      const [x2, y2] = position(points[(index + 1) % points.length]);
      svg(scene, 'line', { x1, y1, x2, y2, class: className });
    }
    for (const { index, points } of order) {
      const isBase = solid.faces[faces[index]].base && (solid.pyramid || solid.sides !== 4);
      const shade = flat ? 'paper-flat' : `paper-tone-${faces[index] % 3}`;
      if (status && net.counts[faces[index]] > 1 && index !== faces.indexOf(faces[index])) continue;
      svg(scene, 'polygon', { points: pointsAttribute(points), class: `paper-face ${shade}${isBase ? ' paper-base' : ''}` });
    }
    if (flat && net) {
      for (const piece of net.pieces.slice(1)) {
        strokeEdge(polygons[piece.parent], piece.hinge, 'hinge-under');
        strokeEdge(polygons[piece.parent], piece.hinge, 'hinge-line');
      }
    }
    for (const { pieceIndex, edge } of seam) strokeEdge(polygons[pieceIndex], edge, 'matching-edge');
    if (status && !net.correct) {
      for (const points of missing) {
        svg(scene, 'polygon', { points: pointsAttribute(points), class: 'missing-face' });
      }
      const overlap = net.pieces.findIndex(({ face }) => net.counts[face] > 1);
      svg(scene, 'polygon', { points: pointsAttribute(polygons[overlap]), fill: hatch, class: 'overlap-face' });
    }
  }

  function showSolid(container, solid) {
    container.replaceChildren();
    const polygons = solidNets.reference(solid).map((face) => face.map((point) => project(point, view)));
    paint(graphic(container), polygons, solid);
  }

  function panels(containers, solid, nets) {
    const target = solidNets.reference(solid);
    const panels = nets.map((net, index) => {
      const endView = cameraFor(net, target);
      containers[index].replaceChildren();
      return { net, endView, graphic: graphic(containers[index]), seam: exampleSeam(solid, net, endView) };
    });

    function draw(progress, review) {
      const frames = panels.map(({ net, endView }) => {
        const camera = { yaw: endView.yaw * progress, pitch: endView.pitch * progress };
        const polygons = solidNets.folded(net, progress).map((face) => face.map((point) => project(point, camera)));
        const missing = review && progress === 1 ? target.filter((_, index) => net.counts[index] === 0)
          .map((face) => face.map((point) => project(point, camera))) : [];
        return { polygons, missing, bounds: layout(polygons.concat(missing)) };
      });
      const scale = Math.min(...frames.map((frame) => fit(frame.bounds)));
      panels.forEach(({ net, graphic, seam }, index) => {
        const { polygons, missing, bounds } = frames[index];
        paint(graphic, polygons, solid, {
          bounds, scale, missing, net, faces: net.pieces.map(({ face }) => face),
          seam: review ? seam : [], flat: progress === 0, status: review && progress === 1,
        });
      });
    }
    return { draw, play: (duration = 1550) => animate(duration, (phase) => draw(phase, true)) };
  }

  return { showSolid, panels };
})();
