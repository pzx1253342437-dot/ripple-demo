const WebSocket = require('ws');

const port = process.env.PORT || 3000;
const url = 'ws://localhost:' + port;
const sockets = [];
const results = { missed: 0, stoppedState: 0, match: 0 };
let contacts = 0;
let finished = false;

function finish(error) {
  if (finished) return;
  finished = true;
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) socket.close();
  }
  if (error) {
    console.error(error);
    process.exitCode = 1;
  } else {
    console.log('WebSocket stop flow ok');
  }
}

function maybeFinish() {
  if (results.missed < 2 || results.stoppedState < 2) return;
  setTimeout(() => {
    if (finished) return;
    if (results.match > 0) {
      finish('选择不一致时不应产生配对');
      return;
    }
    console.log('one skip and one accept stopped both ripples');
    finish();
  }, 1000);
}

function connect(name, decision) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  let sentDecision = false;
  let stopped = false;
  let stoppedStateSeen = false;

  socket.on('error', error => finish(name + ' 连接失败：' + error.message));
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());

    if (message.type === 'welcome') {
      socket.send(JSON.stringify({
        type: 'setPosition',
        x: name === 'E' ? -550 : 550,
        y: 0
      }));
      socket.send(JSON.stringify({ type: 'emit' }));
    }

    if (message.type === 'contact') {
      contacts++;
      if (contacts > 2) {
        finish('同一组相遇被重复触发');
        return;
      }
      if (sentDecision) return;
      sentDecision = true;
      const delay = decision === 'accept' ? 180 : 0;
      setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({
          type: 'respondContact',
          contactId: message.contact.contactId,
          decision
        }));
      }, delay);
    }

    if (message.type === 'contactResult') {
      if (message.outcome !== 'missed' || message.reason !== 'decisions') {
        finish(name + ' 收到了错误的结束结果：' + JSON.stringify(message));
        return;
      }
      stopped = true;
      results.missed++;
      maybeFinish();
    }

    if (message.type === 'match') {
      results.match++;
      finish('选择不一致时仍然收到配对消息');
    }

    if (stopped && !stoppedStateSeen && message.type === 'state' &&
        message.me.ripple && message.me.ripple.status === 'stopped') {
      stoppedStateSeen = true;
      results.stoppedState++;
      maybeFinish();
    }
  });
}

connect('E', 'skip');
setTimeout(() => connect('F', 'accept'), 100);

const deadline = setTimeout(() => {
  if (!finished) finish('25 秒内没有完成选择不一致流程');
}, 25000);
deadline.unref();
