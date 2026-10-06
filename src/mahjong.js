/**
 * 秦皇岛麻将民间版 · 核心规则层
 * 纯逻辑，零DOM依赖，零网络依赖，可直接单测
 *
 * 特色规则：
 *   - 仅自摸胡，不能点炮
 *   - 有1张混儿（翻牌+1），可代任意牌但不能凑碰杠
 *   - 仅起手风牌可暗杠
 *   - 碰杠4次后手牌剩1张=大吊车
 *   - 豪华七对等级按真实四张数量分级
 *   - 流局墩数随杠数变化（0杠13墩/1杠7墩/2杠8墩/3杠13墩/4杠直接流局）
 */

// ========= 牌组定义 =========
const SUITS = ['w', 'b', 't'];        // 万、饼、条
const SUIT_NAMES = { w: '万', b: '饼', t: '条' };
const FENG_NAMES = ['东', '南', '西', '北'];
const JIAN_NAMES = ['中', '发', '白'];

/**
 * 生成全部136张牌
 * 每张牌 { id: 0-135, suit, value, name }
 * id 编码：
 *   0-35   : 万 (0-3=1万×4, 4-7=2万×4, ...)
 *   36-71  : 饼
 *   72-107 : 条
 *   108-123: 风 (东=108-111, 南=112-115, 西=116-119, 北=120-123)
 *   124-135: 箭 (中=124-127, 发=128-131, 白=132-135)
 */
function buildFullDeck() {
  const deck = [];
  let id = 0;
  // 万饼条各9种×4
  for (const s of SUITS) {
    for (let v = 1; v <= 9; v++) {
      for (let k = 0; k < 4; k++) {
        deck.push({ id: id++, suit: s, value: v, name: v + SUIT_NAMES[s] });
      }
    }
  }
  // 风牌4种×4
  for (let v = 1; v <= 4; v++) {
    for (let k = 0; k < 4; k++) {
      deck.push({ id: id++, suit: 'f', value: v, name: FENG_NAMES[v - 1] });
    }
  }
  // 箭牌3种×4
  for (let v = 1; v <= 3; v++) {
    for (let k = 0; k < 4; k++) {
      deck.push({ id: id++, suit: 'j', value: v, name: JIAN_NAMES[v - 1] });
    }
  }
  return deck;
}

/** 洗牌（Fisher-Yates） */
function shuffle(deck) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 牌的类型键（suit+value唯一标识一种牌） */
function tileKey(t) { return t.suit + t.value; }

/** 比较两张牌是否同一种 */
function isSameTile(a, b) { return a.suit === b.suit && a.value === b.value; }

/**
 * 牌+1算法（确定混儿）
 * 9→1（数牌循环）；东→南→西→北（风牌循环）；中→发→白→中（箭牌循环）
 */
function nextTile(tile) {
  if (SUITS.includes(tile.suit)) {
    const v = tile.value === 9 ? 1 : tile.value + 1;
    return { suit: tile.suit, value: v };
  }
  if (tile.suit === 'f') {
    const v = tile.value === 4 ? 1 : tile.value + 1;
    return { suit: 'f', value: v };
  }
  if (tile.suit === 'j') {
    const v = tile.value === 3 ? 1 : tile.value + 1;
    return { suit: 'j', value: v };
  }
  throw new Error('未知牌型: ' + tile.suit);
}

/**
 * 从牌堆中找到与给定(suit,value)匹配的第一张牌
 * 用于根据翻牌结果定位混儿的具体id
 */
function findTile(deck, suit, value) {
  return deck.find(t => t.suit === suit && t.value === value);
}

// ========= 手牌计数工具 =========

/**
 * 统计手牌中每种牌的数量（返回 Map<key, count>）
 */
function countTiles(tiles) {
  const map = new Map();
  for (const t of tiles) {
    const k = tileKey(t);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

/** 排序手牌：万→饼→条→风→箭，同suit内value升序 */
function sortHand(hand) {
  const suitOrder = { w: 0, b: 1, t: 2, f: 3, j: 4 };
  return hand.slice().sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.value - b.value;
  });
}

// ========= 胡牌判定（含混儿） =========

/**
 * 检查一组牌（手牌+副露）是否满足胡牌条件
 * @param {Array} hand 手牌数组（每张带suit/value）
 * @param {Array} melds 副露数组，每项 {type:'pong'|'kong'|'chow', suit, value, tiles:[...]}
 * @param {Object} wanTile 混儿牌（可为null表示无混儿）
 * @returns {Object|null} 胡牌信息 或 null
 */
function checkHu(hand, melds, wanTile) {
  // 七对优先检测（独立路径）
  const qidui = checkQiDui(hand, wanTile);
  if (qidui) {
    return { type: 'qidui', details: qidui };
  }
  // 常规胡牌检测
  const normal = checkNormalHu(hand, melds, wanTile);
  if (normal) {
    return { type: 'normal', details: normal };
  }
  return null;
}

/**
 * 七对检测
 * 规则：7个对子，混儿可辅助凑对子，但豪华等级（真实四张）不靠混儿
 */
function checkQiDui(hand, wanTile) {
  const count = countTiles(hand);
  const wanKey = wanTile ? tileKey(wanTile) : null;
  let wanCount = wanKey ? (count.get(wanKey) || 0) : 0;
  // 先统计非混儿牌的对子情况
  const nonWanPairs = [];     // 真实对子：[{key, count}]
  const fourOfAKinds = [];    // 真实四张（用于豪华等级）
  let singlesWithWan = [];    // 单张（需混儿补对子）
  let purePairs = 0;          // 纯对子数（不依赖混儿）
  let needWanPairs = 0;       // 需要混儿才能凑的对数

  for (const [k, c] of count) {
    if (k === wanKey) continue;
    if (c >= 4) {
      fourOfAKinds.push(k);
      nonWanPairs.push({ key: k, count: c });
      purePairs += 2; // 4张=2对
    } else if (c === 3) {
      nonWanPairs.push({ key: k, count: c });
      purePairs += 1;
      needWanPairs += 1; // 3张需要1张混儿变成2对
    } else if (c === 2) {
      nonWanPairs.push({ key: k, count: c });
      purePairs += 1;
    } else if (c === 1) {
      singlesWithWan.push(k);
    }
  }

  // 需要混儿的总数
  const totalWanNeeded = needWanPairs + singlesWithWan.length;
  // 混儿可贡献的"对子能力"：每张混儿可以补一个单张成一对
  // 但每张混儿本身也是一张牌，也要被配对
  // 简单计算：可用混儿数 = hand中混儿总数
  // 混儿配对能力 = wanCount 张混儿可以配对 (wanCount) 张单张混儿
  // 非混儿单张需要混儿：singlesWithWan.length - wanCount + (wanCount % 2)
  // 不对，更简单的方式：
  // 设 wan = 混儿总数，S = 非混儿单张数，T = 非混儿总数
  // 胡牌条件：T + wan = 14，且 T 中每张都能配成对子（可用wan代）
  // 每个非混儿单张需要1个混儿；混儿之间可以两两配对
  // 设 a = singlesWithWan.length, w = wanCount
  // 需要 a <= w + (w - a) 不对
  
  // 重新推导：
  // 非混儿 c 张，其中 pair 张（c//2对），single = c%2 + 3张的情况
  // 简化版：非混儿牌能凑出 maxPairs = Math.floor(nonWanTotal / 2)
  // 但要考虑3张的情况也能凑1对+1单

  // 更简单正确的算法：
  // 把所有非混儿牌尽可能拆成对子，剩下的单张数 = singles
  // 混儿数量 wanCount，需要 singles <= wanCount（每个单张消耗1个混儿补对子）
  // 混儿用完后，混儿自身也要配对，所以 wanCount - singles 必须是偶数
  // 且最终总对数 = 非混儿对数 + singles（用混儿补的） + (wanCount - singles)/2（混儿自己配对） = 7

  const nonWanTotal = hand.length - wanCount;
  // 贪心拆对子：对每种非混儿牌，先拿偶数张做对子
  let nonWanPairCount = 0;
  let nonWanSingleCount = 0;
  for (const [k, c] of count) {
    if (k === wanKey) continue;
    nonWanPairCount += Math.floor(c / 2);
    nonWanSingleCount += c % 2;
  }

  // 条件1：非混儿单张需要用混儿补，混儿数必须 >= 单张数
  if (wanCount < nonWanSingleCount) return null;
  const remainingWan = wanCount - nonWanSingleCount;
  // 条件2：剩下的混儿必须能两两配对（偶数）
  if (remainingWan % 2 !== 0) return null;
  // 条件3：总对数 = nonWanPairCount + nonWanSingleCount + remainingWan/2 = 7
  const totalPairs = nonWanPairCount + nonWanSingleCount + remainingWan / 2;
  if (totalPairs !== 7) return null;

  // 豪华等级：统计真实四张（不靠混儿）
  // 注意：3张的牌型如果用了混儿变成4张，不算豪华
  // 只有非混儿的 count >= 4 才算
  let realFours = 0;
  for (const [k, c] of count) {
    if (k === wanKey) continue;
    if (c >= 4) realFours++;
  }

  const level = realFours >= 3 ? 3 : realFours >= 2 ? 2 : realFours >= 1 ? 1 : 0;
  const multiplier = [4, 8, 16, 32][level];

  return {
    level,               // 0=普通, 1=豪华, 2=双豪华, 3=三豪华
    realFours,
    multiplier,
    isPure: nonWanTotal === 14  // 全部是真实牌（无混儿）也没关系，素胡判断在外面
  };
}

/**
 * 常规胡牌检测（4副刻子/顺子 + 1对将）
 * 使用递归 + 混儿兜底策略
 *
 * 核心思路：
 *   1. 从非混儿牌中枚举"将"（先拿2张），剩下去拆4副
 *   2. 也枚举"非混儿1张 + 混儿1张"凑将
 *   3. 也枚举"混儿2张"做将
 *   4. 剩下去递归拆刻子/顺子（混儿作为万能牌池）
 */
function checkNormalHu(hand, melds, wanTile) {
  const wanKey = wanTile ? tileKey(wanTile) : null;
  // 构建 countMap 副本 + 提取混儿数量
  const rawCount = countTiles(hand);
  let wanCount = wanKey ? (rawCount.get(wanKey) || 0) : 0;

  // 把 countMap 中混儿那一项清掉（当作抽象万能牌）
  const countMap = new Map();
  for (const [k, c] of rawCount) {
    if (k !== wanKey) countMap.set(k, c);
  }

  const nonWanKeys = [...countMap.keys()];

  // === 方案1：用非混儿牌做将（2张相同）===
  for (const key of nonWanKeys) {
    const cnt = countMap.get(key);
    if (cnt >= 2) {
      countMap.set(key, cnt - 2);
      const ok = canFormAllSets(countMap, wanCount);
      countMap.set(key, cnt); // 回溯
      if (ok) return { jiang: key, wanUsedAs: 'none' };
    }
  }

  // === 方案2：1张非混儿 + 1张混儿 凑将 ===
  if (wanCount >= 1) {
    for (const key of nonWanKeys) {
      const cnt = countMap.get(key);
      if (cnt >= 1) {
        countMap.set(key, cnt - 1);
        const ok = canFormAllSets(countMap, wanCount - 1);
        countMap.set(key, cnt);
        if (ok) return { jiang: key + '+wan', wanUsedAs: 'jiang' };
      }
    }
  }

  // === 方案3：2张混儿做将 ===
  if (wanCount >= 2) {
    const ok = canFormAllSets(countMap, wanCount - 2);
    if (ok) return { jiang: 'wan', wanUsedAs: 'jiang' };
  }

  return null;
}

/**
 * 递归拆牌：给定剩余牌 countMap + 剩余混儿数量，能否全部拆成刻子/顺子
 * 混儿已从 countMap 中移除，单独由 wanLeft 表示
 */
function canFormAllSets(countMap, wanLeft) {
  // 找第一个还有剩余的牌
  let firstKey = null;
  for (const [k, c] of countMap) {
    if (c > 0) { firstKey = k; break; }
  }
  if (!firstKey) {
    // 没有非混儿剩余了 → 混儿数量必须是3的倍数（全部凑成刻子/顺子）
    return wanLeft > 0 && wanLeft % 3 === 0;
  }

  const count = countMap.get(firstKey);
  const suit = firstKey[0];
  const val = parseInt(firstKey.slice(1), 10);

  // === 尝试刻子 ===
  // 自然刻子：3张相同
  if (count >= 3) {
    countMap.set(firstKey, count - 3);
    if (canFormAllSets(countMap, wanLeft)) { countMap.set(firstKey, count); return true; }
    countMap.set(firstKey, count);
  }
  // 2张 + 1混儿 补刻
  if (count >= 2 && wanLeft >= 1) {
    countMap.set(firstKey, count - 2);
    if (canFormAllSets(countMap, wanLeft - 1)) { countMap.set(firstKey, count); return true; }
    countMap.set(firstKey, count);
  }
  // 1张 + 2混儿 补刻
  if (count >= 1 && wanLeft >= 2) {
    countMap.set(firstKey, count - 1);
    if (canFormAllSets(countMap, wanLeft - 2)) { countMap.set(firstKey, count); return true; }
    countMap.set(firstKey, count);
  }
  // 纯混儿刻子（3混儿）—— 但这种情况 firstKey 不会有剩余，已在上面 return 处处理

  // === 尝试顺子（仅万饼条，且 val<=7）===
  if (['w', 'b', 't'].includes(suit) && val <= 7) {
    const k2 = suit + (val + 1);
    const k3 = suit + (val + 2);
    const c2 = countMap.get(k2) || 0;
    const c3 = countMap.get(k3) || 0;

    // 枚举 k2 和 k3 是"真实牌"还是"用混儿代"
    // mask: bit0=k2用混儿(0=真实/1=混儿), bit1=k3用混儿
    for (let mask = 0; mask < 4; mask++) {
      const wanNeed = (mask & 1 ? 1 : 0) + (mask & 2 ? 1 : 0);
      if (wanNeed > wanLeft) continue;
      // 真实牌数量够不够
      const needReal_k2 = (mask & 1) ? 0 : 1;
      const needReal_k3 = (mask & 2) ? 0 : 1;
      if (c2 < needReal_k2 || c3 < needReal_k3) continue;

      // 扣减
      countMap.set(firstKey, count - 1);
      if (!(mask & 1)) countMap.set(k2, c2 - 1);
      if (!(mask & 2)) countMap.set(k3, c3 - 1);

      if (canFormAllSets(countMap, wanLeft - wanNeed)) {
        // 回溯
        countMap.set(firstKey, count);
        countMap.set(k2, c2);
        countMap.set(k3, c3);
        return true;
      }

      // 回溯
      countMap.set(firstKey, count);
      countMap.set(k2, c2);
      countMap.set(k3, c3);
    }
  }

  return false;
}

// ========= 番型计算 =========

/**
 * 计算胡牌的所有番型和总倍数
 * @param {Object} huResult checkHu()的返回
 * @param {Array} hand 手牌
 * @param {Array} melds 副露 [{type:'pong'|'kong', ...}]
 * @param {Object} wanTile 混儿
 * @param {Object} opts { isZiMo, isTian, isDi, isGangShangHua, isHaiDiLaoYue, gameState... }
 * @returns {Object} { fans: [{name, multiplier}], totalMultiplier, desc }
 */
function calcFenpai(huResult, hand, melds, wanTile, opts = {}) {
  const fans = [];
  let total = 1;

  // 基础平胡
  fans.push({ name: '平胡', m: 1 });

  // 自摸
  if (opts.isZiMo) { fans.push({ name: '自摸', m: 2 }); total *= 2; }

  // 天胡/地胡
  if (opts.isTian) { fans.push({ name: '天胡', m: 10 }); total *= 10; }
  else if (opts.isDi) { fans.push({ name: '地胡', m: 10 }); total *= 10; }

  // 七对系列
  if (huResult.type === 'qidui') {
    const m = huResult.details.multiplier;
    const name = huResult.details.level === 0 ? '七对'
               : huResult.details.level === 1 ? '豪华七对'
               : huResult.details.level === 2 ? '双豪华七对'
               : '三豪华七对';
    fans.push({ name, m });
    total *= m;
  }

  // 碰碰胡（碰过/杠过就算）
  const hasPong = melds.some(m => m.type === 'pong' || m.type === 'kong' || m.type === 'buKong');
  if (hasPong) {
    fans.push({ name: '碰碰胡', m: 3 });
    total *= 3;
  }

  // 大吊车（碰杠3次后打出1张剩1张）
  // 由外部通过 opts.isDaDiaoChe 传入（游戏引擎在胡牌前检测）
  if (opts.isDaDiaoChe) {
    fans.push({ name: '大吊车', m: 4 });
    total *= 4;
  }

  // 杠上花
  if (opts.isGangShangHua) {
    fans.push({ name: '杠上花', m: 2 });
    total *= 2;
  }

  // 海底捞月
  if (opts.isHaiDiLaoYue) {
    fans.push({ name: '海底捞月', m: 2 });
    total *= 2;
  }

  // 门清（胡牌时没碰/没明杠；暗杠不算开门）
  const hasOpenMeld = melds.some(m => m.type === 'pong' || m.type === 'kong' || m.type === 'buKong');
  if (!hasOpenMeld && !opts.isTian && !opts.isDi) {
    fans.push({ name: '门清', m: 2 });
    total *= 2;
  }

  // 素胡（胡牌结构中没有混儿）
  if (wanTile) {
    const wanKey = tileKey(wanTile);
    const hasWanInHand = hand.some(t => tileKey(t) === wanKey);
    if (!hasWanInHand) {
      // 还要检查胡牌结构中是否用混儿代替过
      // 简化：如果手牌里完全没有混儿 → 肯定是素胡
      // 更精确的：需要从 checkHu 的 details 中看是否用到了混儿
      fans.push({ name: '素胡', m: 2 });
      total *= 2;
    }
  } else {
    // 没有混儿的牌局（理论上秦皇岛麻将都有混儿）也算素胡
    fans.push({ name: '素胡', m: 2 });
    total *= 2;
  }

  // 混吊（手牌只剩1张混儿做将，自摸任意牌胡）
  if (opts.isHuangDiao) {
    fans.push({ name: '混吊', m: 2 });
    total *= 2;
  }

  return {
    fans,
    totalMultiplier: total,
    desc: fans.map(f => f.name).join(' + ')
  };
}

// ========= 其他工具 =========

/** 计算流局保留墩数（根据杠数） */
function liuJuDun(gangCount) {
  const table = { 0: 13, 1: 7, 2: 8, 3: 13 };
  if (gangCount >= 4) return 0; // 4杠直接流局
  return table[gangCount] ?? 13;
}

/** 检测某玩家手里是否有可暗杠的风牌（仅起手阶段） */
function findDarkGangFeng(hand) {
  const count = countTiles(hand);
  const result = [];
  for (const [k, c] of count) {
    if (c === 4 && k[0] === 'f') {
      result.push(k);
    }
  }
  return result;
}

/** 混儿不能被碰/杠的判断：如果tile是混儿，返回false */
function canPongOrKong(tile, wanTile) {
  if (!wanTile) return true;
  return !isSameTile(tile, wanTile);
}

// ========= 导出 =========
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildFullDeck,
    shuffle,
    tileKey,
    isSameTile,
    nextTile,
    findTile,
    countTiles,
    sortHand,
    checkHu,
    checkQiDui,
    checkNormalHu,
    calcFenpai,
    liuJuDun,
    findDarkGangFeng,
    canPongOrKong,
    SUITS, SUIT_NAMES, FENG_NAMES, JIAN_NAMES
  };
}
