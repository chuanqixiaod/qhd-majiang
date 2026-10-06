/**
 * 秦皇岛麻将 · 前端UI + 游戏流程控制
 * 单机模式：直接持有 Game 实例 + 本地机器人
 * 联机模式：主机持有 Game 实例，客户端只渲染
 */

// ============ 全局状态 ============
let game = null;            // Game 实例（单机/主机持有）
let net = null;             // Net 联机实例
let mode = 'single';        // 'single' | 'online'
let mySeat = 0;             // 我在4人局中的座位号（联机模式）
let selectedTileIdx = -1;   // 选中手牌索引（出牌用）
let currentRoomCode = null;

// ============ 大厅模式切换 ============
function setMode(m) {
  mode = m;
  document.getElementById('btn-single').classList.toggle('active', m === 'single');
  document.getElementById('btn-online').classList.toggle('active', m === 'online');
  document.getElementById('lobby-single').style.display = m === 'single' ? 'block' : 'none';
  document.getElementById('lobby-online').style.display = m === 'online' ? 'block' : 'none';
}

// ============ 牌面渲染 ============
const SUIT_CHAR = { w: '万', b: '饼', t: '条' };
const FENG_CHAR = ['东', '南', '西', '北'];
const JIAN_CHAR = ['中', '发', '白'];

function tileDisplay(t) {
  if (SUITS.includes(t.suit)) return { text: t.value + SUIT_CHAR[t.suit], cls: [t.suit] };
  if (t.suit === 'f') return { text: FENG_CHAR[t.value - 1], cls: ['feng'] };
  return { text: JIAN_CHAR[t.value - 1], cls: ['jian'] };
}

function renderTile(t, isWan = false, showFace = true) {
  const el = document.createElement('span');
  el.className = 'tile';
  if (showFace) {
    const d = tileDisplay(t);
    el.classList.add('tile-face', ...d.cls, d.cls[0] + '-zi');
    if (isWan) el.classList.add('wan-tile');
    el.textContent = d.text;
  } else {
    el.classList.add('tile-back');
  }
  return el;
}

// ============ 进入牌桌 ============
function enterTable() {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('table').style.display = 'block';
}

function renderAll() {
  if (!game) return;
  // 4个座位
  for (let i = 0; i < 4; i++) {
    renderSeat(i);
  }
  renderCenter();
  renderActions();
}

function renderSeat(seat) {
  const el = document.getElementById('seat-' + seat);
  const p = game.players[seat];
  const isMe = mode === 'single' || seat === mySeat;
  const isHost = game.bankerSeat === seat;

  // 名字
  el.querySelector('.name').textContent = SEATS[seat] + ' · ' + (isHost ? '庄' : seat === game.bankerSeat ? '庄' : '');
  el.querySelector('.name').classList.toggle('host', isHost);

  // 手牌
  const handBack = el.querySelector('.hand-back');
  const handMe = el.querySelector('.hand-me');
  handBack.innerHTML = '';
  handMe.innerHTML = '';

  if (isMe) {
    // 自己的手牌完整显示
    p.hand.forEach((t, idx) => {
      const isWan = game.wanTile && tileKey(t) === tileKey(game.wanTile);
      const tileEl = renderTile(t, isWan, true);
      if (game.phase === 'discard' && game.currentSeat === seat && !p.isGongzhu) {
        tileEl.onclick = () => selectTile(idx);
        tileEl.style.cursor = 'pointer';
      }
      if (idx === selectedTileIdx) tileEl.classList.add('selected');
      handMe.appendChild(tileEl);
    });
    handMe.style.display = 'flex';
    handBack.style.display = 'none';
  } else {
    // 别人只显示背面数量
    for (let k = 0; k < p.hand.length; k++) {
      handBack.appendChild(renderTile(null, false, false));
    }
    handMe.style.display = 'none';
    handBack.style.display = 'flex';
  }

  // 副露
  const meldsEl = el.querySelector('.melds');
  meldsEl.innerHTML = '';
  p.melds.forEach(m => {
    const group = document.createElement('div');
    group.className = 'meld-group';
    m.tiles.forEach((t, idx) => {
      // 碰：3张；明杠：4张；暗杠：背面+正面+正面+背面？简化全正面
      const showBack = m.isAnGang && (idx === 0 || idx === 3);
      const tileEl = renderTile(t, false, !showBack);
      group.appendChild(tileEl);
    });
    meldsEl.appendChild(group);
  });

  // 状态tag
  const tag = document.createElement('div');
  if (game.currentSeat === seat && (game.phase === 'draw' || game.phase === 'discard')) {
    tag.className = 'status-tag current';
    tag.textContent = '当前';
  } else if (p.isGongzhu) {
    tag.className = 'status-tag gongzhu';
    tag.textContent = '相公';
  }
  // 在名字旁边加tag
  const nameEl = el.querySelector('.name');
  if (tag.className) nameEl.appendChild(tag);
}

function renderCenter() {
  const info = document.getElementById('center-info');
  const g = game;
  let phaseText = '';
  switch (g.phase) {
    case 'waiting': phaseText = '等待开始'; break;
    case 'dealing': phaseText = '发牌中...'; break;
    case 'draw':
      phaseText = `轮到${SEATS[g.currentSeat]}家摸牌`; break;
    case 'discard':
      phaseText = `${SEATS[g.currentSeat]}家出牌`; break;
    case 'action': phaseText = '碰杠判定中...'; break;
    case 'gameover': phaseText = '本局结束'; break;
  }

  // 混儿信息
  let wanHtml = '';
  if (g.wanTile) {
    const d = tileDisplay(g.wanTile);
    wanHtml = `<div class="wan-info">混儿：<span class="tile tile-face ${d.cls[0]} ${d.cls[0]}-zi wan-tile">${d.text}</span>（1张）| 杠数：${g.gangCount}</div>`;
  }

  info.innerHTML = `<div class="phase">${phaseText}</div>${wanHtml}`;
}

// ============ 选牌出牌 ============
function selectTile(idx) {
  const p = game.players[game.currentSeat];
  if (p.isGongzhu) return;
  selectedTileIdx = idx;
  renderAll();
  // 自动出牌（单机模式）
  if (mode === 'single' && game.currentSeat === mySeat) {
    game.discard(game.currentSeat, idx);
    selectedTileIdx = -1;
    renderAll();
    afterDiscard();
  } else if (mode === 'online' && game.currentSeat === mySeat) {
    // 发送出牌到主机
    selectedTileIdx = -1;
    const tile = p.hand[idx];
    net.sendAction({ type: 'discard', seat: mySeat, tileIndex: idx });
  }
}

// ============ 出牌后流程 ============
function afterDiscard() {
  const discarderSeat = game.lastDiscard.fromSeat;
  // 检查碰杠优先级（主机/单机做）
  const action = game.resolveActionPriority(discarderSeat);
  if (action) {
    if (action.action === 'pong') {
      if (mode === 'single') {
        setTimeout(() => {
          logMsg(`${SEATS[action.seat]}家碰！`);
          game.executePong(action.seat);
          renderAll();
          afterPongGang(action.seat);
        }, 500);
      } else {
        // 主机：广播给目标玩家有碰选项
        net.sendStateTo(action.seat, { type: 'offer-pong', fromSeat: discarderSeat });
      }
    } else if (action.action === 'mingGang') {
      if (mode === 'single') {
        setTimeout(() => {
          logMsg(`${SEATS[action.seat]}家明杠！`);
          game.executeMingGang(action.seat);
          renderAll();
          afterPongGang(action.seat);
        }, 500);
      }
    }
  } else {
    // 没人碰杠 → 进下家摸牌
    if (mode === 'single') {
      setTimeout(nextSeatDraw, 400);
    }
  }
}

function afterPongGang(targetSeat) {
  // 碰/杠后由目标家出牌
  renderAll();
}

function nextSeatDraw() {
  if (!game.canDraw()) {
    // 流局
    const r = game.settleLiuJu();
    logMsg('🚫 流局！');
    showResult({ liuju: true });
    return;
  }
  const nextSeat = game.currentSeat;
  const result = game.drawTile(nextSeat);
  renderAll();
  if (result && result.hu) {
    // 自摸胡了
    handleZiMoHu(nextSeat, result.hu);
  }
}

// ============ 自摸胡处理 ============
function handleZiMoHu(seat, huInfo) {
  logMsg(`🎉 ${SEATS[seat]}家自摸胡！`);
  const r = game.settle(seat, huInfo);
  showResult(r);
}

// ============ 结算弹窗 ============
function showResult(r) {
  renderAll();
  const overlay = document.getElementById('result-overlay');
  const title = document.getElementById('result-title');
  const total = document.getElementById('result-total');
  const detail = document.getElementById('result-detail');
  if (r.liuju) {
    title.textContent = '🚫 流局';
    total.textContent = '无人得分';
    detail.textContent = '';
  } else {
    title.textContent = '🎉 自摸胡！';
    total.textContent = r.totalMultiplier + ' 倍';
    const fenList = r.fenpai.fans.map(f => `${f.name}(${f.m})`).join(' × ');
    detail.innerHTML = `番型：${fenList}<br>赢家：${SEATS[r.winnerSeat]}家<br>` +
      r.payments.map(p => `${SEATS[p.from]} → ${SEATS[p.to]}：${p.amount}分`).join('<br>');
  }
  overlay.style.display = 'flex';
}
function closeResult() {
  document.getElementById('result-overlay').style.display = 'none';
}

// ============ 消息日志 ============
function logMsg(msg) {
  const log = document.getElementById('msg-log');
  const div = document.createElement('div');
  div.textContent = msg;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// ============ 按钮栏 ============
function renderActions() {
  const bar = document.getElementById('action-bar');
  bar.innerHTML = '';
  bar.style.display = 'none';

  if (!game) return;
  const g = game;

  // 单机模式自动摸牌（轮到自己时自动摸）
  if (mode === 'single' && g.phase === 'draw' && g.currentSeat === mySeat) {
    setTimeout(() => {
      const r = game.drawTile(mySeat);
      renderAll();
      if (r && r.hu) handleZiMoHu(mySeat, r.hu);
      else renderAll();
    }, 600);
  }
}

// ============ 单机模式 ============
function startSingleGame() {
  mode = 'single';
  mySeat = 0; // 自己固定坐北（上家位）
  enterTable();
  hostStartGame();
}

// ============ 主机开始游戏 ============
function hostStartGame() {
  game = new QHDMahjongGame();
  // 模拟掷骰：随机定摸牌位置和混儿
  const wallStart = Math.floor(Math.random() * 34);
  // 发牌 + 定混儿
  const rawDeck = buildFullDeck();
  // 先随机翻一张
  const wanIdx = Math.floor(Math.random() * rawDeck.length);
  const wanTile = { suit: rawDeck[wanIdx].suit, value: rawDeck[wanIdx].value };
  // 混儿 = nextTile
  const realWan = nextTile(wanTile);
  // 混儿必须在牌墙中存在
  const actualWan = findTile(rawDeck, realWan.suit, realWan.value);

  game.newRound();
  game.dealTiles(wallStart, actualWan);

  logMsg('🎮 游戏开始！');
  logMsg(`🀄 混儿：${actualWan.value}${SUIT_CHAR[actualWan.suit] || FENG_CHAR[actualWan.value-1] || JIAN_CHAR[actualWan.value-1]}`);

  // 起手风牌暗杠提示（单机自动执行）
  const dk = game.findStartDarkGang();
  for (const item of dk) {
    logMsg(`${SEATS[item.seat]}家起手风牌暗杠！`);
    game.executeStartDarkGang(item.seat, item.fengKeys[0]);
  }

  renderAll();
  // 开始摸牌（单机自动）
  setTimeout(() => {
    nextSeatDraw();
  }, 800);
}

// ============ 联机模式 ============
async function createRoom() {
  document.getElementById('lobby-status').textContent = '正在创建房间...';
  net = new MahjongNet((type, data) => netOnMessage(type, data));
  try {
    const code = MahjongNet.genRoomCode();
    await net.createRoom(code);
    currentRoomCode = code;
    document.getElementById('create-info').innerHTML = `房间号：<b style="color:#e9c46a;font-size:24px">${code}</b><br>朋友输入此号加入<br>已加入 ${net.guestConnections.size}/3`;
    document.getElementById('lobby-status').textContent = '等待朋友加入...';
    // 定时刷新人数
    setInterval(() => {
      const info = document.getElementById('create-info');
      if (info && currentRoomCode) {
        const count = net.guestConnections.size;
        info.innerHTML = `房间号：<b style="color:#e9c46a;font-size:24px">${currentRoomCode}</b><br>朋友输入此号加入<br>已加入 ${count}/3`;
        if (count >= 1 && game === null) {
          // 有朋友加入，显示开始按钮位置（但还在大厅，等满）
        }
      }
    }, 1000);
  } catch (e) {
    document.getElementById('lobby-status').textContent = '创建失败：' + e.message;
  }
}

async function joinRoom() {
  const code = document.getElementById('join-code').value.trim();
  if (!code) { document.getElementById('lobby-status').textContent = '请输入6位房间号'; return; }
  document.getElementById('lobby-status').textContent = '正在连接...';
  net = new MahjongNet((type, data) => netOnMessage(type, data));
  try {
    // 主机peerId格式：qhdmj-{code}-{timestamp}
    // 但主机peerId里有随机timestamp，客户端无法直接join
    // PeerJS需要知道确切的peerId。主机应在房间创建后通过某种方式广播...
    // 简化：客户端输入房间号后，用固定后缀尝试连接
    // 实际上PeerJS的join需要peerId，这里需要一个更简单的方案
    // → 改用固定peerId规则：qhdmj-{code}
    // 主机在createRoom时也用 qhdmj-{code} 作为peerId（不加timestamp）
    // 这样两边用同一个peerId字符串就能匹配上
    const hostPeerId = `qhdmj-${code}`;
    await net.joinRoom(hostPeerId);
    document.getElementById('lobby-status').textContent = '连接成功，等待主机开始游戏...';
    enterTable();
    mySeat = -1; // 等主机分配座位
  } catch (e) {
    document.getElementById('lobby-status').textContent = '连接失败：' + e.message;
  }
}

// ============ PeerJS 消息处理 ============
function netOnMessage(type, data) {
  console.log('[NET]', type, data);
  switch (type) {
    case 'state':
      // 客户端收到主机的状态快照
      game = new QHDMahjongGame();
      Object.assign(game, data.state);
      mySeat = data.mySeat;
      renderAll();
      break;
    case 'connected':
      logMsg('✅ 已连接到主机');
      break;
    case 'disconnected':
      logMsg('❌ 与主机断开');
      break;
    case 'guest-join':
      logMsg(`👥 玩家 ${data.peerId.slice(-6)} 加入`);
      break;
    case 'action':
      // 主机收到客户端的操作
      handleHostAction(data.fromPeerId, data.action);
      break;
  }
}

function handleHostAction(fromPeerId, action) {
  // 主机处理客户端发来的操作
  if (!game || game.phase === 'gameover') return;
  switch (action.type) {
    case 'discard':
      game.discard(action.seat, action.tileIndex);
      selectedTileIdx = -1;
      renderAll();
      afterDiscard();
      break;
  }
  // 广播最新状态给所有客户端
  net.broadcastState({ state: serializeGame(), mySeat: null });
}

// 序列化游戏状态（发给客户端）
function serializeGame() {
  return {
    players: game.players.map(p => ({
      seat: p.seat,
      name: p.name,
      hand: p.hand, // 客户端只看自己的；其他玩家hand要清空
      handCount: p.hand.length,
      melds: p.melds,
      isGongzhu: p.isGongzhu,
      scores: p.scores
    })),
    deck: game.deck,
    drawCursor: game.drawCursor,
    wanTile: game.wanTile,
    bankerSeat: game.bankerSeat,
    currentSeat: game.currentSeat,
    phase: game.phase,
    lastDiscard: game.lastDiscard,
    gangCount: game.gangCount,
    handStartSeat: game.handStartSeat
  };
}

// ============ 启动 ============
// 在 DOM ready 时初始化
setMode('single');
