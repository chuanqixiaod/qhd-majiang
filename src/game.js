/**
 * 秦皇岛麻将民间版 · 游戏状态机
 * 负责：发牌、混儿确定、摸牌、碰杠、自摸胡、流局、结算
 * 核心规则：仅自摸胡 | 混儿1张(+1) | 仅起手风牌可暗杠 | 不能吃
 */
const {
  buildFullDeck, shuffle, tileKey, isSameTile, nextTile, findTile,
  countTiles, sortHand, checkHu, calcFenpai, liuJuDun, findDarkGangFeng,
  canPongOrKong, SUITS, SUIT_NAMES, FENG_NAMES, JIAN_NAMES
} = typeof module !== 'undefined' ? require('./mahjong.js') : window.Mahjong;

// 4个座位：0=北(上家/北风), 1=东(庄家/东风), 2=南(下家/南风), 3=西(对家/西风)
// 门风：庄=东, 庄下=南, 庄主=西, 庄上=北
const SEATS = ['北', '东', '南', '西'];

class QHDMahjongGame {
  constructor() {
    this.players = [0, 1, 2, 3].map(i => ({
      seat: i,
      name: `玩家${i + 1}`,
      hand: [],           // 手牌
      melds: [],          // 副露 [{type:'pong'|'kong'|'buKong', tiles:[tile,...], isAnGang}]
      isGongzhu: false,   // 打出混儿=相公
      scores: 0           // 累计分数
    }));
    this.deck = [];       // 牌墙（34墩共68张）
    this.drawCursor = 0;  // 下一张要摸的牌的索引
    this.wanTile = null;  // 混儿（真实那张牌）
    this.wanKey = null;
    this.bankerSeat = 1;  // 起始庄在东位
    this.currentSeat = 1; // 当前轮到谁摸牌
    this.phase = 'waiting'; // waiting | dealing | draw | discard | gameover
    this.lastDiscard = null; // 最后打出的牌 {tile, fromSeat}
    this.gangCount = 0;   // 本局杠数（影响流局墩数）
    this.handStartSeat = 1; // 起手发牌时的庄家位置
    this.isFirstDraw = [true, true, true, true]; // 每人首轮是否还没摸过（用于地胡判定）
    this.gangAfterDraw = false; // 上一步是否刚杠完补的牌（杠上花判定）
    this.actionsThisRound = []; // 本轮已执行的动作日志
  }

  /** === 新开局 === */
  newRound(newBankerSeat = null) {
    // 庄变更
    if (newBankerSeat !== null) {
      this.bankerSeat = newBankerSeat;
    }
    this.handStartSeat = this.bankerSeat;

    // 重置玩家
    for (const p of this.players) {
      p.hand = [];
      p.melds = [];
      p.isGongzhu = false;
    }
    this.gangCount = 0;
    this.isFirstDraw = [true, true, true, true];
    this.gangAfterDraw = false;
    this.lastDiscard = null;

    // 洗牌码牌
    const full = shuffle(buildFullDeck());
    // 牌墙 34墩，取前68张（实际不需要保留太多，这里简化直接用）
    this.deck = full.slice(0, 68);
    this.drawCursor = 0;

    this.phase = 'dealing';
  }

  /** === 掷骰定摸牌位置 + 定混儿 + 发牌 ===
   * 纯模拟，不需要真的掷骰UI
   * 返回：{ wallStartIndex, wanTile, dealt: [ [tile,...], ... ] }
   */
  dealTiles(wallStartIndex, wanTile) {
    // 切牌墙起始位置（wallStartIndex: 0-33 表示哪个墩）
    // 每墩2张，所以实际起始摸牌点 = wallStartIndex * 2
    const start = wallStartIndex * 2;
    // 重排牌墙：把 [start...end] 移到前面
    const before = this.deck.slice(0, start);
    const after = this.deck.slice(start);
    this.deck = [...after, ...before];

    // 开混儿（混儿牌也在牌墙中）
    this.wanTile = wanTile;
    this.wanKey = tileKey(wanTile);

    // 国标式轮拿：
    // 庄家起手坐 handStartSeat 位
    // 每人先拿3次×4张 = 12张（轮3圈）
    // 然后庄家补2张=14，闲家补1张=13
    const order = [0, 1, 2, 3].map(i => (this.handStartSeat + i) % 4);
    // 轮3次：每次4人各拿4张？不，每次轮流拿4张（一轮=4人各4张=16张）
    let cursor = 0;
    const dealt = [[], [], [], []];
    for (let round = 0; round < 3; round++) {
      for (const seat of order) {
        for (let k = 0; k < 4; k++) {
          dealt[seat].push(this.deck[cursor++]);
        }
      }
    }
    // 庄家（order[0]）补2张，其他补1张
    for (let i = 0; i < 4; i++) {
      const seat = order[i];
      const extra = i === 0 ? 2 : 1;
      for (let k = 0; k < extra; k++) {
        dealt[seat].push(this.deck[cursor++]);
      }
    }
    this.drawCursor = cursor;

    // 发给玩家 + 排序
    for (let i = 0; i < 4; i++) {
      this.players[i].hand = sortHand(dealt[i]);
    }

    this.currentSeat = this.handStartSeat;
    this.phase = 'draw';

    return { dealt };
  }

  /** === 起手风牌暗杠机会 ===
   * 返回可暗杠的风牌列表（每人各自的）
   */
  findStartDarkGang() {
    const result = [];
    for (let i = 0; i < 4; i++) {
      const p = this.players[i];
      const fk = findDarkGangFeng(p.hand);
      if (fk.length > 0) {
        result.push({ seat: i, fengKeys: fk });
      }
    }
    return result;
  }

  /** 执行起手暗杠（起手风牌，暗杠后补牌） */
  executeStartDarkGang(seat, fengKey) {
    const p = this.players[seat];
    // 从手牌中移除4张
    const removed = [];
    const remaining = [];
    for (const t of p.hand) {
      if (tileKey(t) === fengKey && removed.length < 4) {
        removed.push(t);
      } else {
        remaining.push(t);
      }
    }
    p.hand = remaining;
    p.melds.push({ type: 'darkKong', tiles: removed, isAnGang: true });
    this.gangCount++;
    // 补牌
    this.drawCursor++; // 跳过暗杠位置？不用，直接摸下一张
    if (this.drawCursor < this.deck.length) {
      p.hand.push(this.deck[this.drawCursor++]);
      p.hand = sortHand(p.hand);
    }
  }

  /** === 摸牌 === */
  drawTile(seat) {
    if (this.phase !== 'draw') return null;
    if (seat !== this.currentSeat) return null;
    if (!this.canDraw()) return null;

    const tile = this.deck[this.drawCursor++];
    this.players[seat].hand.push(tile);
    this.players[seat].hand = sortHand(this.players[seat].hand);
    this.phase = 'discard';
    this.isFirstDraw[seat] = false;

    // 检查自摸胡
    const hu = this.checkZiMoHu(seat);
    if (hu) {
      return { tile, hu };
    }
    return { tile };
  }

  /** 是否还能摸（未到流局墩数） */
  canDraw() {
    const remainingAfterDraw = this.deck.length - this.drawCursor;
    const liudun = liuJuDun(this.gangCount);
    if (liudun === 0) return false; // 4杠直接流局
    // 流局条件：剩余 <= 保留墩数×2
    return remainingAfterDraw > liudun * 2;
  }

  /** === 检查自摸胡 === */
  checkZiMoHu(seat) {
    const p = this.players[seat];
    if (p.isGongzhu) return null;
    const huResult = checkHu(p.hand, p.melds, this.wanTile);
    if (!huResult) return null;

    // 收集状态标记
    const opts = { isZiMo: true };
    // 天胡：庄家起手14张自摸胡（庄家还没摸过任何牌 = isFirstDraw 没被设过 false）
    const isBanker = seat === this.handStartSeat;
    // 地胡：闲家首轮自摸胡（闲家第一次摸牌就胡）
    const firstDraw = this.isFirstDraw[seat] === false; // 刚摸完，现在是 false...
    // 不对：isFirstDraw 在 drawTile 里设为 false 了，所以在 check 时已经是 false
    // 需要用别的方式判断首轮：看有没有碰杠过、是否是第一圈
    opts.isTian = isBanker && this.players.every(pp => pp.melds.length === 0) && this.drawCursor <= 14 + 12;
    opts.isDi = !isBanker && this.isFirstDraw[seat] === false && this.drawCursor <= 14 + 12 && !isBanker;

    // 杠上花：上一张动作是杠
    opts.isGangShangHua = this.gangAfterDraw;

    // 海底捞月：最后一张可摸牌自摸
    const remaining = this.deck.length - this.drawCursor;
    const liudun = liuJuDun(this.gangCount);
    opts.isHaiDiLaoYue = remaining <= liudun * 2 + 1; // 刚摸的是最后一张

    // 大吊车：碰杠3次后手牌剩1张
    const meldCount = p.melds.filter(m => m.type === 'pong' || m.type === 'kong' || m.type === 'buKong').length;
    opts.isDaDiaoChe = meldCount >= 3 && p.hand.length <= 2;
    // 精确：碰杠3次后打出1张剩1张，下轮自摸胡 → 此时手牌数 = 1（因为刚自摸的牌已经在手里了）
    // 等于是摸后手牌数 = melds*3 + hand = 总牌；如果 meldCount=3 → 9张副露 + hand = 14 → hand=5？不对
    // 14张牌 = 3副露×3 + 2将 + 2摸后？ 摸后是14张
    // 如果有3个碰/杠（各3张）= 9张副露，剩下手牌5张，其中如果刚摸的是凑胡的...
    // 大吊车定义：碰杠3次后，打出1张剩1张，下轮自摸胡。此时手牌 = 1（打出后剩）+ 1（新摸的）= 2张
    // 胡牌后手牌2张应该是一个将。如果剩下的是混儿，那混儿做将，摸任何牌都能凑4副+1将
    // 简化：碰杠≥3次 且 胡牌时手牌数≤2
    opts.isDaDiaoChe = meldCount >= 3 && p.hand.length <= 2;

    // 混吊：手牌只剩1张混儿
    if (this.wanTile) {
      const wanKey = tileKey(this.wanTile);
      const realWanCount = p.hand.filter(t => tileKey(t) === wanKey).length;
      opts.isHuangDiao = meldCount >= 3 && p.hand.length === 2 && realWanCount >= 1;
    }

    // 门清/素胡在 calcFenpai 里自动算
    const fenpai = calcFenpai(huResult, p.hand, p.melds, this.wanTile, opts);
    return { huResult, opts, fenpai };
  }

  /** === 出牌 === */
  discard(seat, tileIndex) {
    if (this.phase !== 'discard') return null;
    if (seat !== this.currentSeat) return null;

    const p = this.players[seat];
    const [discarded] = p.hand.splice(tileIndex, 1);
    p.hand = sortHand(p.hand);
    this.lastDiscard = { tile: discarded, fromSeat: seat };
    this.phase = 'action'; // 等待碰/杠/胡响应

    // 打出混儿 → 相公
    if (this.wanTile && tileKey(discarded) === this.wanKey) {
      p.isGongzhu = true;
    }

    this.gangAfterDraw = false;
    return discarded;
  }

  /** === 碰（响应别人的出牌）=== */
  canPong(discarderSeat, targetSeat) {
    if (!this.lastDiscard) return false;
    if (targetSeat === discarderSeat) return false;
    const p = this.players[targetSeat];
    if (p.isGongzhu) return false;
    const tile = this.lastDiscard.tile;
    // 混儿不能被碰
    if (!canPongOrKong(tile, this.wanTile)) return false;
    // 只数非混儿的真实牌（混儿不能用来凑碰）
    const targetKey = tileKey(tile);
    const wanKey = this.wanKey;
    const realCount = p.hand.filter(t => tileKey(t) === targetKey && (!wanKey || tileKey(t) !== wanKey)).length;
    return realCount >= 2;
  }

  executePong(targetSeat) {
    const discarderSeat = this.lastDiscard.fromSeat;
    const p = this.players[targetSeat];
    const tile = this.lastDiscard.tile;
    // 从手牌移除2张，优先移除非混儿牌（混儿留在手里）
    const targetKey = tileKey(tile);
    const wanKey = this.wanKey;
    const removed = [];
    const remaining = [];
    // 第一遍：优先移除真实牌（非混儿）
    for (const t of p.hand) {
      if (removed.length < 2 && tileKey(t) === targetKey && (!wanKey || tileKey(t) !== wanKey)) {
        removed.push(t);
      } else remaining.push(t);
    }
    // 如果真实牌不够（理论上 canPong 已经保证够了），才用混儿补
    if (removed.length < 2) {
      const stillRemaining = remaining.slice();
      remaining.length = 0;
      for (const t of stillRemaining) {
        if (removed.length < 2 && tileKey(t) === targetKey) removed.push(t);
        else remaining.push(t);
      }
    }
    p.hand = sortHand(remaining);
    p.melds.push({ type: 'pong', tiles: [tile, ...removed] });
    this.lastDiscard = null;
    this.currentSeat = targetSeat;
    this.phase = 'discard';
  }

  /** === 明杠 === */
  canMingGang(discarderSeat, targetSeat) {
    if (!this.lastDiscard) return false;
    if (targetSeat === discarderSeat) return false;
    const p = this.players[targetSeat];
    if (p.isGongzhu) return false;
    const tile = this.lastDiscard.tile;
    if (!canPongOrKong(tile, this.wanTile)) return false;
    // 只数非混儿真实牌
    const targetKey = tileKey(tile);
    const wanKey = this.wanKey;
    const realCount = p.hand.filter(t => tileKey(t) === targetKey && (!wanKey || tileKey(t) !== wanKey)).length;
    return realCount >= 3;
  }

  executeMingGang(targetSeat) {
    const discarderSeat = this.lastDiscard.fromSeat;
    const p = this.players[targetSeat];
    const tile = this.lastDiscard.tile;
    // 优先移除非混儿牌
    const targetKey = tileKey(tile);
    const wanKey = this.wanKey;
    const removed = [];
    const remaining = [];
    for (const t of p.hand) {
      if (removed.length < 3 && tileKey(t) === targetKey && (!wanKey || tileKey(t) !== wanKey)) {
        removed.push(t);
      } else remaining.push(t);
    }
    if (removed.length < 3) {
      const stillRemaining = remaining.slice();
      remaining.length = 0;
      for (const t of stillRemaining) {
        if (removed.length < 3 && tileKey(t) === targetKey) removed.push(t);
        else remaining.push(t);
      }
    }
    p.hand = sortHand(remaining);
    p.melds.push({ type: 'kong', tiles: [tile, ...removed] });
    this.gangCount++;
    this.lastDiscard = null;
    if (this.drawCursor < this.deck.length) {
      p.hand.push(this.deck[this.drawCursor++]);
      p.hand = sortHand(p.hand);
    }
    this.currentSeat = targetSeat;
    this.phase = 'discard';
    this.gangAfterDraw = true;
  }

  /** === 补杠（碰后摸到第4张）=== */
  canBuKong(targetSeat) {
    const p = this.players[targetSeat];
    if (p.isGongzhu) return false;
    const wanKey = this.wanKey;
    // 找碰的副露
    const pengMelds = p.melds.filter(m => m.type === 'pong');
    for (const m of pengMelds) {
      const tileKeyPeng = tileKey(m.tiles[0]);
      // 只算非混儿的真实牌（混儿不能用来补杠）
      const inHand = p.hand.filter(t => tileKey(t) === tileKeyPeng && (!wanKey || tileKey(t) !== wanKey)).length;
      if (inHand >= 1) return true;
    }
    return false;
  }

  executeBuKong(targetSeat, meldIndex) {
    const p = this.players[targetSeat];
    const meld = p.melds[meldIndex];
    if (meld.type !== 'pong') return false;
    const targetKey = tileKey(meld.tiles[0]);
    const wanKey = this.wanKey;
    // 优先移除非混儿牌
    const removed = [];
    const remaining = [];
    let removedWan = false;
    for (const t of p.hand) {
      if (removed.length < 1 && tileKey(t) === targetKey && (!wanKey || tileKey(t) !== wanKey)) {
        removed.push(t);
      } else remaining.push(t);
    }
    if (removed.length < 1) {
      // 真实牌不够（不应发生），用混儿也算了
      const stillRemaining = remaining.slice();
      remaining.length = 0;
      for (const t of stillRemaining) {
        if (removed.length < 1 && tileKey(t) === targetKey) {
          removed.push(t);
          removedWan = true;
        } else remaining.push(t);
      }
    }
    p.hand = sortHand(remaining);
    meld.type = 'buKong';
    meld.tiles.push(...removed);
    this.gangCount++;
    // 补牌
    if (this.drawCursor < this.deck.length) {
      p.hand.push(this.deck[this.drawCursor++]);
      p.hand = sortHand(p.hand);
    }
    this.gangAfterDraw = true;
    return true;
  }

  /** === 碰杠优先级仲裁（逆时针优先）=== */
  resolveActionPriority(discarderSeat) {
    // 逆时针顺序：discarderSeat+1, +2, +3 (mod 4)
    const candidates = [];
    for (let i = 1; i <= 3; i++) {
      const seat = (discarderSeat + i) % 4;
      if (this.canMingGang(discarderSeat, seat)) candidates.push({ seat, action: 'mingGang' });
      else if (this.canPong(discarderSeat, seat)) candidates.push({ seat, action: 'pong' });
    }
    // 逆时针最近的优先（i最小的）
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (a.seat - discarderSeat + 4) % 4 <= (b.seat - discarderSeat + 4) % 4 ? a : b);
  }

  /** === 流局检查 === */
  checkLiuJu() {
    if (this.gangCount >= 4) return true;
    const liudun = liuJuDun(this.gangCount);
    const remainingAfterDraw = this.deck.length - this.drawCursor;
    return remainingAfterDraw <= liudun * 2;
  }

  /** === 主动选择不碰杠（进入下家摸牌）=== */
  passAction() {
    this.lastDiscard = null;
    this.currentSeat = (this.currentSeat + 1) % 4;
    this.phase = 'draw';
  }

  /** === 结束本局，计算结算 === */
  settle(winnerSeat, huInfo) {
    const winner = this.players[winnerSeat];
    const fenpai = huInfo.fenpai;
    const base = 1; // 底分1
    // 三家都付
    const payments = [];
    for (let i = 0; i < 4; i++) {
      if (i === winnerSeat) continue;
      const amount = base * fenpai.totalMultiplier;
      winner.scores += amount;
      this.players[i].scores -= amount;
      payments.push({ from: i, to: winnerSeat, amount });
    }
    // 杠分：只有胡牌时才结算（简化：跟胡牌一起算）
    this.phase = 'gameover';
    return { winnerSeat, fenpai, payments, totalMultiplier: fenpai.totalMultiplier };
  }

  /** 流局结算 */
  settleLiuJu() {
    this.phase = 'gameover';
    // 流局杠分无效，无人得分
    return { liuju: true };
  }

  /** 下一局轮庄：荒庄→轮庄；胡牌→胡家连庄 */
  nextBanker(huWinnerSeat) {
    if (huWinnerSeat !== null) {
      return huWinnerSeat; // 胡牌连庄
    }
    return (this.bankerSeat + 1) % 4; // 荒庄轮庄
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QHDMahjongGame, SEATS };
}
