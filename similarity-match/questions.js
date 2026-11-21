const similarityRules = {
  AA: "AA 相似",
  SAS: "SAS 相似",
  SSS: "SSS 相似",
  insufficient: "條件不足"
};

// 邊的索引等於對頂角的索引。例如 s0 是 ∠A 的對邊 BC。
const edgeEnds = [[1, 2], [2, 0], [0, 1]];
const radians = degrees => degrees * Math.PI / 180;
const pointOnRay = (length, angle) => [
  length * Math.cos(radians(angle)),
  length * Math.sin(radians(angle))
];

function byAngleAndSides(angle, ac, ab) {
  return [[0, 0], [ab, 0], pointOnRay(ac, angle)];
}

function byTwoAngles(a, b, ab) {
  const ac = ab * Math.sin(radians(b)) / Math.sin(radians(180 - a - b));
  return byAngleAndSides(a, ac, ab);
}

function byThreeSides(a, b, c) {
  const x = (b ** 2 + c ** 2 - a ** 2) / (2 * c);
  return [[0, 0], [c, 0], [x, Math.sqrt(b ** 2 - x ** 2)]];
}

function withNonIncludedAngle(angle, ac, bc, branch) {
  const [x, y] = pointOnRay(ac, angle);
  return [[0, 0], [x + branch * Math.sqrt(bc ** 2 - y ** 2), 0], [x, y]];
}

function angleAt(points, vertex) {
  const [a, b] = edgeEnds[vertex].map(index => points[index]);
  const [x, y] = points[vertex];
  const u = [a[0] - x, a[1] - y];
  const v = [b[0] - x, b[1] - y];
  return Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]) * 180 / Math.PI;
}

function labelFor(names, key) {
  const index = Number(key[1]);
  return key[0] === "a" ? "∠" + names[index] : edgeEnds[index].map(i => names[i]).sort().join("");
}

function similarityQuestion(rule, [left, right], keys, explanation, includedAngle) {
  return { rule, points: [left, right], keys, explanation, includedAngle };
}

function aaQuestion(a, b, leftBase, rightBase) {
  return similarityQuestion("AA", [byTwoAngles(a, b, leftBase), byTwoAngles(a, b, rightBase)],
    ["a0", "a1"], "兩組對應角分別相等，符合 AA 相似性質。");
}

function sasQuestion(angle, left, right) {
  return similarityQuestion("SAS", [byAngleAndSides(angle, ...left), byAngleAndSides(angle, ...right)],
    ["s1", "s2", "a0"], "兩組對應邊成比例，而且這兩組邊的夾角相等，符合 SAS 相似性質。", 0);
}

function sssQuestion(left, right) {
  return similarityQuestion("SSS", [byThreeSides(...left), byThreeSides(...right)],
    ["s0", "s1", "s2"], "由短到長配對後，三組對應邊的長度比都相同，符合 SSS 相似性質。");
}

function nonIncludedQuestion(angle, ac, bc, scale) {
  return similarityQuestion("insufficient",
    [withNonIncludedAngle(angle, ac, bc, -1), withNonIncludedAngle(angle, ac * scale, bc * scale, 1)],
    ["s0", "s1", "a0"], "兩組邊成比例，已知相等的角在另一個頂點。圖中這對三角形就是反例。", 2);
}

const similarityBank = {
  basic: [
    aaQuestion(54, 78, 6, 9),
    sasQuestion(63, [5, 7], [10, 14]),
    sssQuestion([5, 7, 8], [10, 14, 16]),
    similarityQuestion("insufficient", [byTwoAngles(52, 57, 6), byTwoAngles(52, 74, 9)],
      ["a0", "s2"], "只知道一組角相等和一組邊長。圖中的另一個角還能改變，所以無法保證相似。"),
    aaQuestion(72, 43, 9, 6),
    sssQuestion([8, 10, 12], [6, 7.5, 9]),
    sasQuestion(82, [12, 8], [9, 6]),
    similarityQuestion("insufficient", [byAngleAndSides(56, 6, 9), byAngleAndSides(87, 10, 15)],
      ["s1", "s2"], "兩組對應邊成比例。夾角可以改變，第三組邊的比也會跟著改變，所以無法保證相似。", 0)
  ],
  challenge: [
    aaQuestion(42, 107, 7, 10),
    nonIncludedQuestion(30, 10, 7, 1.5),
    sasQuestion(104, [4, 6], [7, 10.5]),
    sssQuestion([10, 13, 17], [15, 19.5, 25.5]),
    aaQuestion(98, 37, 12, 7),
    sssQuestion([8, 12, 13], [14, 21, 22.75]),
    sasQuestion(47, [12, 15], [8, 10]),
    nonIncludedQuestion(45, 10, 8, 1.25)
  ]
};

function evidenceValue(points, key) {
  const index = Number(key[1]);
  if (key[0] === "a") return angleAt(points, index);
  const [[ax, ay], [bx, by]] = edgeEnds[index].map(i => points[i]);
  return Math.hypot(bx - ax, by - ay);
}

function displayEvidence(points, key) {
  const value = Number(evidenceValue(points, key).toFixed(2));
  return key[0] === "a" ? value + "°" : String(value);
}
