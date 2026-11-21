const netQuestions = (() => {
  // Each two-digit entry is a hinge: parent piece index, then target face index.
  // Piece 0 is the marked base. Face numbers follow the solid around that base.
  function question(type, ...patterns) {
    const solid = solidNets.shapes[type];
    return {
      solid,
      options: patterns.map((pattern) => solidNets.prepare(solid,
        pattern.split(' ').map(([parent, face]) => [Number(parent), Number(face)]))),
    };
  }

  const demo = question('squarePyramid', '01 04 03 02', '02 11 01 24');
  return {
    demo,
    basic: [
      question('cube', '02 03 15 34 41', '02 15 24 23 21', '03 15 04 31 21'),
      question('cube', '02 11 04 25 13', '04 13 11 22 41', '03 01 15 34 04'),
      question('cube', '01 02 25 14 43', '03 04 25 31 12', '03 15 24 22 04'),
      question('triangle', '02 03 14 01', '02 03 21 14', '03 11 01 14'),
      question('triangle', '03 12 01 24', '02 13 14 24', '01 14 02 31'),
      question('triangle', '02 14 13 11', '01 13 22 34', '02 14 01 34'),
    ],
    challenge: [
      question('pentagon', '04 01 05 03 02 46', '02 11 26 33 35 34', '03 14 26 12 05 46'),
      question('pentagon', '03 12 05 14 16 31', '01 16 03 32 34 22', '05 04 01 26 02 41'),
      question('squarePyramid', '01 04 03 02', '01 14 23 32', '02 11 01 24'),
      question('squarePyramid', '02 11 13 24', '02 04 21 32', '04 03 13 11'),
      question('pentagonPyramid', '05 01 03 02 04', '03 12 21 35 14', '04 02 05 03 44'),
      question('pentagonPyramid', '04 05 13 32 41', '01 03 15 24 04', '02 04 01 32 05'),
    ],
  };
})();
