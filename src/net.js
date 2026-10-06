/**
 * 秦皇岛麻将 · 联机层（MQTT over WebSocket）
 *
 * 零注册、零后端、国内可直连！
 * 公共 Broker：broker.emqx.io:8084（EMQX 免费公共 MQTT）
 * 架构：
 *   - 主机创建房间 → 订阅 topic qhd-mj/{code}，广播游戏状态快照
 *   - 客户端加入 → 订阅同一 topic，发送动作指令
 *   - 任何消息带 type 字段区分：state | action | chat | join | leave
 */
class MahjongNet {
  constructor(onMsg) {
    this.onMsg = onMsg;
    this.client = null;
    this.roomCode = null;
    this.myId = null;
    this.isHost = false;
    this.topic = '';
    this._msgBuffer = []; // 连接前的缓冲消息
    this._connected = false;
  }

  static MQTT_URL = 'wss://broker.emqx.io:8084/mqtt';
  static genRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** 创建房间（主机） */
  async createRoom(code) {
    this.isHost = true;
    this.roomCode = code;
    this.topic = 'qhd-mj/' + code;
    this.myId = 'host-' + Math.random().toString(36).slice(2, 8);
    await this._connect();
    await this._subscribe();
    // 广播我来了
    await this._publish({ type: 'join', from: this.myId, isHost: true });
    return this.myId;
  }

  /** 加入房间（客户端） */
  async joinRoom(code) {
    this.isHost = false;
    this.roomCode = code;
    this.topic = 'qhd-mj/' + code;
    this.myId = 'guest-' + Math.random().toString(36).slice(2, 8);
    await this._connect();
    await this._subscribe();
    await this._publish({ type: 'join', from: this.myId, isHost: false });
    return this.myId;
  }

  /** 主机广播游戏状态给所有人 */
  broadcastState(state) {
    this._publish({ type: 'state', from: this.myId, data: state });
  }

  /** 客户端发送操作到房间（主机收到后执行） */
  sendAction(action) {
    this._publish({ type: 'action', from: this.myId, data: action });
  }

  /** 发送聊天 */
  sendChat(text) {
    this._publish({ type: 'chat', from: this.myId, text });
  }

  /** 主动离开 */
  async leave() {
    await this._publish({ type: 'leave', from: this.myId });
    await this._unsubscribe();
    if (this.client) this.client.end(true);
  }

  // ===== 内部实现 =====
  _connect() {
    return new Promise((resolve, reject) => {
      if (typeof mqtt === 'undefined') {
        reject(new Error('MQTT.js 未加载'));
        return;
      }
      this.client = mqtt.connect(MahjongNet.MQTT_URL, {
        clientId: this.myId,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 0 // 不自动重连（避免抖动）
      });

      this.client.on('connect', () => {
        this._connected = true;
        // 发送缓冲的消息
        while (this._msgBuffer.length) {
          const t = this._msgBuffer.shift();
          this.client.publish(this.topic, JSON.stringify(t), { qos: 1 });
        }
        resolve();
      });

      this.client.on('message', (topic, payload) => {
        try {
          const msg = JSON.parse(payload.toString());
          // 忽略自己发出的消息（MQTT 会回发给订阅者）
          if (msg.from === this.myId) return;
          this._onMessage(msg);
        } catch (e) {
          console.warn('MQTT parse error:', e);
        }
      });

      this.client.on('error', (err) => {
        console.warn('MQTT error:', err.message);
        if (!this._connected) reject(err);
      });

      this.client.on('close', () => {
        if (this._connected) this.onMsg('disconnected', {});
        this._connected = false;
      });

      // 超时
      setTimeout(() => {
        if (!this._connected) {
          try { this.client.end(true); } catch(e) {}
          reject(new Error('连接超时，请检查网络'));
        }
      }, 15000);
    });
  }

  _subscribe() {
    return new Promise((resolve) => {
      this.client.subscribe(this.topic, { qos: 1 }, () => resolve());
    });
  }

  _unsubscribe() {
    return new Promise((resolve) => {
      if (!this.client) { resolve(); return; }
      this.client.unsubscribe(this.topic, () => resolve());
    });
  }

  _publish(msg) {
    const payload = JSON.stringify(msg);
    if (!this._connected || !this.client) {
      this._msgBuffer.push(msg);
      return;
    }
    this.client.publish(this.topic, payload, { qos: 1 });
  }

  _onMessage(msg) {
    switch (msg.type) {
      case 'state':
        this.onMsg('state', msg.data);
        break;
      case 'action':
        // action 只给主机处理，客户端忽略（主机广播 state 给所有人）
        if (this.isHost) {
          this.onMsg('action', { fromPeerId: msg.from, action: msg.data });
        }
        break;
      case 'join':
        this.onMsg('guest-join', { peerId: msg.from, isHost: msg.isHost });
        break;
      case 'leave':
        this.onMsg('guest-leave', { peerId: msg.from });
        break;
      case 'chat':
        this.onMsg('chat', { peerId: msg.from, text: msg.text });
        break;
      default:
        console.log('[MQTT] unknown type:', msg.type);
    }
  }

  destroy() {
    try { this.client && this.client.end(true); } catch(e) {}
    this.client = null;
    this._connected = false;
  }
}
