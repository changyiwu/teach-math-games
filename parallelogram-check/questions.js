// 頂點依序為 A、B、C、D，繪圖時兩軸等比例。
const shapes = {
  parallelogram: [[0, 0], [9, 0], [12, 4], [3, 4]],
  trapezoid: [[1, 0], [7, 0], [10, 5], [-2, 5]],
  scaleneTrapezoid: [[0, 0], [6, 0], [9, 5], [-1, 5]],
  kite: [[0, 0], [5, 3], [0, 10], [-5, 3]]
};

const rules = {
  parallel: "兩雙對邊分別平行",
  sides: "兩雙對邊分別等長",
  samePair: "同一雙對邊平行且等長",
  bisect: "兩條對角線互相平分",
  angles: "兩雙對角分別相等"
};

const questionBank = {
  basic: [
    {
      conditions: ["兩雙對邊分別平行"],
      rule: rules.parallel,
      reason: "兩雙對邊分別平行，符合平行四邊形的定義。",
      marks: { parallel: [["AB", "CD"], ["AD", "BC"]] },
      caption: "同樣數目的箭頭標在互相平行的一雙對邊上。"
    },
    {
      conditions: ["兩雙對邊分別等長"],
      rule: rules.sides,
      reason: "連接 AC，可用 SSS 證明兩個三角形全等，再利用兩組內錯角相等，推出兩雙對邊分別平行。",
      marks: { equal: [["AB", "CD"], ["AD", "BC"]] },
      caption: "同樣數目的短線代表等長，兩雙對邊各有一組等長記號。"
    },
    {
      conditions: ["有一雙對邊同時平行且等長"],
      rule: rules.samePair,
      reason: "平行和等長都發生在同一雙對邊上，符合平行四邊形的判別性質。",
      marks: { parallel: [["AB", "CD"]], equal: [["AB", "CD"]] },
      caption: "AB 和 CD 同時有平行箭頭和等長短線。"
    },
    {
      conditions: ["兩條對角線互相平分"],
      rule: rules.bisect,
      reason: "交點同時是兩條對角線的中點，符合平行四邊形的判別性質。",
      marks: { diagonals: true, equal: [["AO", "OC"], ["BO", "OD"]] },
      caption: "AO = OC，而且 BO = OD。O 同時是兩條對角線的中點。"
    },
    {
      conditions: ["至少有一雙對邊平行"],
      counterexample: "scaleneTrapezoid",
      reason: "這個梯形的上下底平行，另外一雙對邊沒有平行。",
      marks: { parallel: [["AB", "CD"]] },
      caption: "箭頭標出這雙對邊 AB ∥ CD。"
    },
    {
      conditions: ["至少有一雙對邊等長"],
      counterexample: "trapezoid",
      reason: "這個等腰梯形的兩腰是一雙等長的對邊，全圖只有一雙對邊平行。",
      marks: { equal: [["AD", "BC"]] },
      caption: "短線標出兩腰 AD = BC。"
    },
    {
      conditions: ["兩條對角線等長"],
      counterexample: "trapezoid",
      reason: "等腰梯形也有兩條一樣長的對角線，但它們沒有互相平分。",
      marks: { diagonals: true, equal: [["AC", "BD"]] },
      caption: "兩條對角線上的短線標出 AC = BD。"
    },
    {
      conditions: ["至少有一條對角線平分另一條"],
      counterexample: "kite",
      reason: "圖中的箏形有一條對角線 AC 平分 BD，但 BD 沒有平分 AC。",
      marks: { diagonals: true, equal: [["BO", "OD"]] },
      caption: "AC 通過 BD 的中點 O，所以 BO = OD。"
    }
  ],
  challenge: [
    {
      conditions: ["∠A = ∠C", "∠B = ∠D"],
      rule: rules.angles,
      reason: "四邊形內角和為 360°。兩雙對角分別相等，所以任兩個相鄰內角的和都是 180°，由同側內角互補可推出兩雙對邊分別平行。",
      marks: { angles: [["A", "C"], ["B", "D"]] },
      caption: "同樣數目的角弧標在相等的角上；單弧是一雙對角，雙弧是另一雙。"
    },
    {
      conditions: ["AD ∥ BC", "BC = AD"],
      rule: rules.samePair,
      reason: "把等式倒過來讀，仍是 AD 和 BC 這同一雙對邊既平行又等長。",
      marks: { parallel: [["AD", "BC"]], equal: [["AD", "BC"]] },
      caption: "AD 和 BC 同時有平行箭頭和等長短線。"
    },
    {
      conditions: ["AB = CD = 9", "BC = DA = 5"],
      rule: rules.sides,
      reason: "互相對應的是 AB 和 CD、BC 和 DA，兩雙對邊分別等長。",
      marks: { equal: [["AB", "CD"], ["BC", "AD"]] },
      caption: "一條短線代表這組長度是 9，兩條短線代表另一組長度是 5。"
    },
    {
      conditions: ["AO = OC", "DO = OB"],
      rule: rules.bisect,
      reason: "O 把 AC 和 BD 各自分成等長的兩段，所以兩條對角線互相平分。",
      marks: { diagonals: true, equal: [["AO", "OC"], ["DO", "OB"]] },
      caption: "一組短線標出 AO = OC，另一組標出 DO = OB。"
    },
    {
      conditions: ["AB ∥ CD", "AD = BC"],
      counterexample: "trapezoid",
      reason: "平行的是上下底，等長的是兩腰。兩個條件落在不同雙對邊上，這個等腰梯形就符合。",
      marks: { parallel: [["AB", "CD"]], equal: [["AD", "BC"]] },
      caption: "箭頭標在上下底，等長短線標在兩腰。"
    },
    {
      conditions: ["∠A = ∠B", "∠C = ∠D"],
      counterexample: "trapezoid",
      reason: "相等的是兩組相鄰角。這個等腰梯形的兩組底角各自相等，也符合題目條件。",
      marks: { angles: [["A", "B"], ["C", "D"]] },
      caption: "單弧標出上方的一組底角，雙弧標出下方的另一組底角。"
    },
    {
      conditions: ["AC ⟂ BD", "AC = BD"],
      counterexample: "kite",
      reason: "這個箏形的兩條對角線等長且互相垂直，但交點 O 只平分 BD。",
      marks: { diagonals: true, right: true, equal: [["AC", "BD"]] },
      caption: "小方角標出垂直，短線標出 AC = BD。"
    },
    {
      conditions: ["AB = AD", "CB = CD"],
      counterexample: "kite",
      reason: "等長的是兩雙鄰邊。這個箏形符合這兩組等式，而且對角線沒有互相平分。",
      marks: { equal: [["AB", "AD"], ["CB", "CD"]] },
      caption: "兩組等長短線分別標在相鄰的兩條邊上。"
    }
  ]
};
