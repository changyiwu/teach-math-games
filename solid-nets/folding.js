const solidNets = (() => {
  const add = ([x, y, z], [a, b, c]) => [x + a, y + b, z + c];
  const sub = ([x, y, z], [a, b, c]) => [x - a, y - b, z - c];
  const scale = ([x, y, z], k) => [x * k, y * k, z * k];
  const dot = ([x, y, z], [a, b, c]) => x * a + y * b + z * c;
  const cross = ([x, y, z], [a, b, c]) => [y * c - z * b, z * a - x * c, x * b - y * a];
  const unit = (v) => scale(v, 1 / Math.hypot(...v));
  const normal = ([a, b, c]) => unit(cross(sub(b, a), sub(c, a)));
  const identity = (point) => point;

  function shape(name, sides, pyramid = false) {
    const radius = 0.5 / Math.sin(Math.PI / sides);
    const height = pyramid ? 0.86 : sides === 4 ? 1 : 1.14;
    const ring = Array.from({ length: sides }, (_, index) => {
      const angle = 2 * Math.PI * (index - 0.5) / sides;
      return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
    });
    const vertices = ring.concat(pyramid ? [[0, 0, height]] : ring.map(([x, y]) => [x, y, height]));
    const bottom = ring.map((_, index) => (sides - index) % sides);
    const faces = [bottom, ...ring.map((_, index) => {
      const next = (index + 1) % sides;
      return pyramid ? [index, next, sides] : [index, next, sides + next, sides + index];
    })];
    if (!pyramid) faces.push(ring.map((_, index) => sides + index));
    return {
      name, pyramid, sides,
      faces: faces.map((ids, index) => {
        const points = ids.map((id) => vertices[id]);
        const edges = ids.map((id, i) => [id, ids[(i + 1) % ids.length]]);
        return { points, edges, normal: normal(points), base: index === 0 || (!pyramid && index > sides) };
      }),
    };
  }

  const shapes = {
    cube: shape('正立方體', 4),
    triangle: shape('直三角柱', 3),
    pentagon: shape('直五角柱', 5),
    squarePyramid: shape('正四角錐', 4, true),
    pentagonPyramid: shape('正五角錐', 5, true),
  };

  function frame(points, edge) {
    const origin = points[edge];
    const direction = unit(sub(points[(edge + 1) % points.length], origin));
    return { origin, direction, across: cross(normal(points), direction) };
  }

  // Each pair names an earlier piece and the solid face across its free hinge.
  // Repeating a solid face models two pieces that close onto the same position.
  function prepare(solid, joints) {
    const root = solid.faces[0];
    const baseFrame = frame(root.points, 0);
    const pieces = [{
      face: 0,
      points: root.points.map((point) => {
        const offset = sub(point, baseFrame.origin);
        return [dot(offset, baseFrame.direction), dot(offset, baseFrame.across), 0];
      }),
    }];
    for (const [parent, face] of joints) {
      const parentPiece = pieces[parent];
      const parentFace = solid.faces[parentPiece.face];
      const child = solid.faces[face];
      const hinge = parentFace.edges.findIndex(([from, to]) =>
        child.edges.some(([a, b]) => a === to && b === from));
      const [from, to] = parentFace.edges[hinge];
      const childEdge = child.edges.findIndex(([a, b]) => a === to && b === from);
      const start = parentPiece.points[hinge];
      const end = parentPiece.points[(hinge + 1) % parentPiece.points.length];
      const axis = unit(sub(end, start));
      const backward = scale(axis, -1);
      const left = cross([0, 0, 1], backward);
      const childFrame = frame(child.points, childEdge);
      const points = child.points.map((point) => {
        const offset = sub(point, childFrame.origin);
        return add(end, add(scale(backward, dot(offset, childFrame.direction)), scale(left, dot(offset, childFrame.across))));
      });
      const angle = -Math.acos(Math.max(-1, Math.min(1, dot(parentFace.normal, child.normal))));
      pieces.push({ face, parent, hinge, start, end, axis, angle, points });
    }
    const counts = solid.faces.map((_, face) => pieces.filter((piece) => piece.face === face).length);
    return { pieces, counts, correct: counts.every((count) => count === 1) };
  }

  function folded(net, progress) {
    const transforms = [];
    return net.pieces.map((piece) => {
      let transform = identity;
      if (piece.parent !== undefined) {
        const { axis, start, angle, parent } = piece;
        // Slightly stagger the hinges while keeping each cut edge rigid.
        const phase = Math.max(0, Math.min(1, progress * 1.24 - parent / net.pieces.length * 0.24));
        const theta = angle * phase * phase * (3 - 2 * phase);
        const cosine = Math.cos(theta);
        const sine = Math.sin(theta);
        transform = (point) => {
          const offset = sub(point, start);
          const rotated = add(add(scale(offset, cosine), scale(cross(axis, offset), sine)),
            scale(axis, dot(axis, offset) * (1 - cosine)));
          return transforms[parent](add(start, rotated));
        };
      }
      transforms.push(transform);
      return piece.points.map(transform);
    });
  }

  function reference(solid) {
    const root = frame(solid.faces[0].points, 0);
    return solid.faces.map((face) => face.points.map((point) => {
      const offset = sub(point, root.origin);
      return [dot(offset, root.direction), dot(offset, root.across), -dot(offset, solid.faces[0].normal)];
    }));
  }

  return { shapes, prepare, folded, reference };
})();
