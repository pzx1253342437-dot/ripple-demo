const WebSocket = require('ws');

const port = process.env.PORT || 3000;
const url = 'ws://localhost:' + port;
const sockets = [];
const results = { continue: 0, match: 0, activeState: 0, advanced: 0 };
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
    console.log('WebSocket skip flow ok');
  }
}

function maybeFinish() {
  if (results.continue < 2 || results.activeState < 2 || results.advanced < 2) return;
  setTimeout(() => {
    if (finished) return;
    if (results.match > 0) {
      finish('双方跳过之后不应产生配对');
      return;
    }
    console.log('both ripples resumed, no match was created');
    finish();
  }, 1200);
}

function connect(name) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  let sentDecision = false;
  let continued = false;
  let activeStateSeen = false;
  let firstActiveAge = null;
  let advancedSeen = false;

  socket.on('error', error => finish(name + ' 连接失败：' + error.message));
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());

    if (message.type === 'welcome') {
      socket.send(JSON.stringify({
        type: 'setPosition',
        x: name === 'C' ? -550 : 550,
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
      console.log(name, 'met', message.contact.partner.name, '- both skip');
      if (!message.contact.radii || !message.contact.partner ||
          !Number.isFinite(message.contact.partner.rippleRadius)) {
        finish('相遇数据缺少双方波前半径');
        return;
      }
      socket.send(JSON.stringify({
        type: 'respondContact',
        contactId: message.contact.contactId,
        decision: 'skip'
      }));
    }

    if (message.type === 'contactResult') {
      if (message.outcome !== 'continue') {
        finish(name + ' 没有收到 continue：' + message.outcome);
        return;
      }
      continued = true;
      results.continue++;
      console.log(name, 'wave continues');
      maybeFinish();
    }

    if (message.type === 'match') {
      results.match++;
      finish('双方跳过之后仍然收到配对消息');
    }

    if (continued && message.type === 'state' && message.me.ripple &&
        message.me.ripple.status === 'active') {
      if (!activeStateSeen) {
        activeStateSeen = true;
        firstActiveAge = message.me.ripple.age;
        results.activeState++;
      } else if (!advancedSeen && message.me.ripple.age > firstActiveAge + 5) {
        advancedSeen = true;
        results.advanced++;
      }
      maybeFinish();
    }
  });
}

connect('C');
setTimeout(() => connect('D'), 100);

const deadline = setTimeout(() => {
  if (!finished) finish('25 秒内没有完成双方跳过流程');
}, 25000);
deadline.unref();
