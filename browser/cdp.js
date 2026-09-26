class CdpSession {
  constructor(webSocketUrl, { WebSocketImpl = globalThis.WebSocket, commandTimeoutMs = 5000 } = {}) {
    const parsed = new URL(webSocketUrl);
    if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) throw new Error('CDP_REMOTE_HOST_FORBIDDEN');
    this.url = webSocketUrl;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.WebSocketImpl = WebSocketImpl;
    this.commandTimeoutMs = commandTimeoutMs;
    this.closed = false;
  }

  async connect() {
    if (!this.WebSocketImpl) throw new Error('WEBSOCKET_UNAVAILABLE');
    if (this.socket?.readyState === this.WebSocketImpl.OPEN) return;
    this.socket = new this.WebSocketImpl(this.url);
    this.socket.addEventListener('message', event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject, timer } = this.pending.get(message.id);
        clearTimeout(timer);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (!message.method) return;
      for (const handler of [...(this.listeners.get(message.method) || [])]) {
        try { handler(message.params || {}); } catch { /* listener failures must not break CDP */ }
      }
    });
    this.socket.addEventListener('close', () => this.rejectPending('CDP_CONNECTION_CLOSED'), { once: true });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP_CONNECT_TIMEOUT')), 3000);
      this.socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP_CONNECT_FAILED')); }, { once: true });
    });
  }

  async send(method, params = {}) {
    await this.connect();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP_COMMAND_TIMEOUT'));
      }, this.commandTimeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (typeof handler !== 'function') throw new TypeError('CDP_EVENT_HANDLER_REQUIRED');
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(handler);
    return this;
  }

  off(method, handler) {
    const handlers = this.listeners.get(method);
    if (!handlers) return this;
    handlers.delete(handler);
    if (!handlers.size) this.listeners.delete(method);
    return this;
  }

  rejectPending(code) {
    for (const { reject, timer } of this.pending.values()) { clearTimeout(timer); reject(new Error(code)); }
    this.pending.clear();
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (result.exceptionDetails) throw new Error('PAGE_EVALUATION_FAILED');
    return result.result?.value;
  }

  close() {
    this.closed = true;
    this.listeners.clear();
    this.rejectPending('CDP_SESSION_CLOSED');
    if (this.socket && this.socket.readyState < this.WebSocketImpl.CLOSING) this.socket.close();
  }
}

module.exports = { CdpSession };
