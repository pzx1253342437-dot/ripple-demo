const WebSocket = require('ws');

const port = process.env.PORT || 3000;
const url = 'ws://localhost:' + port;
const sockets = [];
const clients = new Map();
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
    console.log('WebSocket match flow ok');
  }
}

function connect(name) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  const client = { name, userId: null, match: null };
  clients.set(socket, client);

  socket.on('error', error => finish(name + ' 连接失败：' + error.message));
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());

    if (message.type === 'welcome') {
      client.userId = message.me.id;
      console.log(name, 'joined at', Math.round(message.me.x), Math.round(message.me.y));
      socket.send(JSON.stringify({
        type: 'setPosition',
        x: name === 'A' ? -550 : 550,
        y: 0
      }));
      socket.send(JSON.stringify({ type: 'emit' }));
    }

    if (message.type === 'contact') {
      console.log(name, 'met', message.contact.partner.name, '- accepting');
      socket.send(JSON.stringify({
        type: 'respondContact',
        contactId: message.contact.contactId,
        decision: 'accept'
      }));
    }

    if (message.type === 'match') {
      const match = message.match;
      if (!match.distance || !match.partner || !match.travelTime) {
        finish('配对消息字段不完整');
        return;
      }
      client.match = match;
      console.log(name, 'matched with', match.partner.name, 'at', Math.round(match.distance), 'm');
      validateMatches();
    }
  });
}

function validateMatches() {
  const matched = [...clients.values()].filter(client => client.match);
  if (matched.length < 2) return;
  if (matched.length > 2) {
    finish('出现了超过两个客户端的配对结果');
    return;
  }

  const [a, b] = matched;
  if (a.match.matchId !== b.match.matchId) {
    finish('双方没有收到同一个 matchId');
    return;
  }
  if (a.match.partner.id !== b.userId || b.match.partner.id !== a.userId) {
    finish('配对对象不是彼此');
    return;
  }
  console.log('shared matchId', a.match.matchId);
  setTimeout(() => finish(), 100);
}

connect('A');
setTimeout(() => connect('B'), 100);

const deadline = setTimeout(() => {
  if (!finished) finish('25 秒内没有完成双向配对');
}, 25000);
deadline.unref();
