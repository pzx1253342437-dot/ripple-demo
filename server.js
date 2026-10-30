const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const TICK_MS = 50;
const MATCH_WINDOW_SIM = 2;
const MATCH_COOLDOWN_SIM = 30;
const CONTACT_RESPONSE_MS = 20000;
const DEFAULT_TIME_SCALE = 10;
const MIN_TIME_SCALE = 1;
const MAX_TIME_SCALE = 10;

const MODES = {
  small: {
    id: 'small',
    name: '小湖',
    description: '1–5 km 范围；忽略 1 km 内。',
    maxRadius: 5000,
    ignoreRadius: 1000,
    maxPairDistance: 10000,
    ttl: 1000,
    launchLock: 0,
    onlineRequired: true,
    worldRadius: 12000,
    gridStep: 1000,
    color: '#de6f94',
    activeColor: '#de6f94',
    colorUntilRadius: 0,
    phases: [{ untilRadius: 5000, speed: 5 }]
  },
  medium: {
    id: 'medium',
    name: '中湖',
    description: '5–20 km 范围；前 50 秒不可配对。',
    maxRadius: 20000,
    ignoreRadius: 5000,
    maxPairDistance: 40000,
    ttl: 1550,
    launchLock: 50,
    onlineRequired: true,
    worldRadius: 45000,
    gridStep: 5000,
    color: '#202126',
    activeColor: '#de6f94',
    colorUntilRadius: 5000,
    phases: [
      { untilRadius: 5000, speed: 100 },
      { untilRadius: 20000, speed: 10 }
    ]
  },
  large: {
    id: 'large',
    name: '大湖',
    description: '50–200 km 范围；可离线保留。',
    maxRadius: 200000,
    ignoreRadius: 50000,
    maxPairDistance: 400000,
    ttl: 30 * 24 * 3600,
    launchLock: 0,
    onlineRequired: false,
    worldRadius: 240000,
    gridStep: 25000,
    color: '#d98aa2',
    activeColor: '#d98aa2',
    colorUntilRadius: 0,
    phases: [{ untilRadius: 200000, speed: 10 }]
  }
};

let simNow = 0;
let lastTickWall = Date.now();
let lastStateWall = 0;
let nextMatchCheckSim = 0;
let timeScale = DEFAULT_TIME_SCALE;
let nextUserId = 1;
let nextRippleId = 1;
let nextMatchId = 1;
let nextContactId = 1;
let nextSpawnIndex = 0;
let geoOrigin = null;

const users = new Map();
const contacts = new Map();
const adjectives = ['夜航', '潮汐', '慢热', '远方', '微光', '回声', '晚风', '月光', '浮岛', '白露'];

function modeConfig(modeId) {
  return MODES[modeId] || MODES.small;
}

function modeMeta(mode) {
  return {
    id: mode.id,
    name: mode.name,
    description: mode.description,
    maxRadius: mode.maxRadius,
    ignoreRadius: mode.ignoreRadius,
    maxPairDistance: mode.maxPairDistance,
    ttl: mode.ttl,
    launchLock: mode.launchLock,
    onlineRequired: mode.onlineRequired,
    worldRadius: mode.worldRadius,
    gridStep: mode.gridStep,
    color: mode.color,
    activeColor: mode.activeColor || mode.color,
    colorUntilRadius: mode.colorUntilRadius || 0,
    phases: mode.phases
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function geoToLocal(latitude, longitude) {
  const earthRadius = 6371000;
  if (!geoOrigin) geoOrigin = { latitude, longitude };
  const latRadians = geoOrigin.latitude * Math.PI / 180;
  return {
    x: (longitude - geoOrigin.longitude) * Math.PI / 180 * earthRadius * Math.cos(latRadians),
    y: (latitude - geoOrigin.latitude) * Math.PI / 180 * earthRadius
  };
}

function radiusAt(mode, ageSeconds) {
  let radius = 0;
  let elapsed = 0;
  for (const phase of mode.phases) {
    const span = phase.untilRadius - radius;
    const duration = span / phase.speed;
    if (ageSeconds <= elapsed + duration) {
      return radius + phase.speed * (ageSeconds - elapsed);
    }
    radius = phase.untilRadius;
    elapsed += duration;
  }
  return radius;
}

function currentRippleAge(ripple) {
  if (!ripple) return 0;
  if (ripple.frozenAge != null) return ripple.frozenAge;
  return Math.max(0, simNow - ripple.startSim);
}

function spawnPosition(modeId, index) {
  const mode = modeConfig(modeId);
  const distance = Math.max(mode.ignoreRadius * 1.45, 1200);
  const angles = [Math.PI, 0, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4];
  const angle = angles[index % angles.length];
  const limit = mode.worldRadius * 0.9;
  return {
    x: clamp(Math.cos(angle) * distance, -limit, limit),
    y: clamp(Math.sin(angle) * distance, -limit, limit)
  };
}

function makeName() {
  const adjective = adjectives[(nextUserId + 3) % adjectives.length];
  return adjective + ' ' + (100 + nextUserId);
}

function createUser(ws, options = {}) {
  const id = 'u' + nextUserId++;
  const modeId = options.mode || 'small';
  const position = options.position || spawnPosition(modeId, nextSpawnIndex++);
  const user = {
    id,
    name: options.name || makeName(),
    ws,
    mode: modeId,
    x: position.x,
    y: position.y,
    ripples: {},
    pendingContactId: null,
    lastMatch: null,
    matchCooldownUntilSim: 0,
    debug: false,
    isBot: !!options.isBot,
    createdAtWall: Date.now(),
    disconnectedAtWall: null
  };
  users.set(id, user);
  return user;
}

function send(user, payload) {
  if (user.ws && user.ws.readyState === WebSocket.OPEN) {
    user.ws.send(JSON.stringify(payload));
  }
}

function isOnline(user) {
  return user.isBot || !!(user.ws && user.ws.readyState === WebSocket.OPEN);
}

function serializeRipple(ripple) {
  if (!ripple) return null;
  return {
    id: ripple.id,
    userId: ripple.userId,
    mode: ripple.mode,
    x: ripple.x,
    y: ripple.y,
    startSim: ripple.startSim,
    age: currentRippleAge(ripple),
    status: ripple.status,
    contactId: ripple.contactId || null,
    matchId: ripple.matchId || null,
    matchedWith: ripple.matchedWith || null
  };
}

function currentRipple(user) {
  return user.ripples[user.mode] || null;
}

function stateFor(user) {
  const mode = modeConfig(user.mode);
  const otherUsers = [...users.values()]
    .filter(other => other.id !== user.id)
    .map(other => ({
      id: other.id,
      name: other.name,
      mode: other.mode,
      x: other.x,
      y: other.y,
      isBot: other.isBot,
      ripples: Object.values(other.ripples).map(serializeRipple)
    }));

  return {
    type: 'state',
    simNow,
    timeScale,
    serverTime: Date.now(),
    geoOrigin,
    onlineCount: [...users.values()].filter(other => !other.isBot && isOnline(other)).length,
    me: {
      id: user.id,
      name: user.name,
      mode: user.mode,
      x: user.x,
      y: user.y,
      ripple: serializeRipple(currentRipple(user)),
      pendingContactId: user.pendingContactId,
      lastMatch: user.lastMatch,
      matchCooldownUntilSim: user.matchCooldownUntilSim
    },
    mode: modeMeta(mode),
    users: user.debug ? otherUsers : undefined
  };
}

function welcomeFor(user) {
  return {
    type: 'welcome',
    simNow,
    timeScale,
    geoOrigin,
    onlineCount: [...users.values()].filter(other => !other.isBot && isOnline(other)).length,
    me: {
      id: user.id,
      name: user.name,
      mode: user.mode,
      x: user.x,
      y: user.y,
      pendingContactId: user.pendingContactId
    },
    modes: Object.values(MODES).map(modeMeta),
    debug: user.debug
  };
}

function broadcastStates() {
  for (const user of users.values()) {
    if (user.ws && user.ws.readyState === WebSocket.OPEN) {
      send(user, stateFor(user));
    }
  }
}

function createRipple(user, modeId) {
  const mode = modeConfig(modeId);
  const existing = user.ripples[modeId];
  if (existing && (existing.status === 'active' || existing.status === 'contacted')) {
    return { error: '这圈波还在路上，等它结束或停下后再投。' };
  }
  if (user.pendingContactId) {
      return { error: '先处理当前相遇，再投波。' };
  }
  if (simNow < user.matchCooldownUntilSim) {
    return { error: '匹配冷却中，请稍后再试。' };
  }

  const ripple = {
    id: 'r' + nextRippleId++,
    userId: user.id,
    mode: modeId,
    x: user.x,
    y: user.y,
    startSim: simNow,
    status: 'active',
    frozenAge: null,
    contactId: null,
    matchId: null,
    matchedWith: null,
    bypassedUserIds: new Set()
  };
  user.ripples[modeId] = ripple;
  return { ripple };
}

function spawnBot(owner, modeId) {
  const mode = modeConfig(modeId);
  const distance = mode.ignoreRadius * (1.12 + Math.random() * 0.16) + 80;
  const angle = Math.random() * Math.PI * 2;
  const limit = mode.worldRadius * 0.9;
  const position = {
    x: clamp(owner.x + Math.cos(angle) * distance, -limit, limit),
    y: clamp(owner.y + Math.sin(angle) * distance, -limit, limit)
  };
  const bot = createUser(null, {
    mode: modeId,
    position,
    isBot: true,
    name: '演示波友 ' + (100 + nextUserId)
  });

  setTimeout(() => {
    if (users.has(bot.id)) {
      createRipple(bot, modeId);
      broadcastStates();
    }
  }, 600);

  return bot;
}

function cleanupIfIdle(user) {
  if (!user || user.ws || user.pendingContactId) return;
  if (user.isBot && Date.now() - user.createdAtWall < 5000) return;
  const hasLiveRipple = Object.values(user.ripples)
    .some(ripple => ripple.status === 'active' || ripple.status === 'contacted');
  if (!hasLiveRipple) users.delete(user.id);
}

function handleDisconnect(user) {
  user.ws = null;
  user.disconnectedAtWall = Date.now();

  if (user.pendingContactId && contacts.has(user.pendingContactId)) {
    resolveContact(contacts.get(user.pendingContactId), 'disconnect');
  }

  for (const ripple of Object.values(user.ripples)) {
    const mode = modeConfig(ripple.mode);
    if (mode.onlineRequired && ripple.status === 'active') {
      ripple.status = 'expired';
      ripple.frozenAge = currentRippleAge(ripple);
    }
  }

  if (user.ripples.large && user.ripples.large.status === 'active') return;
  setTimeout(() => cleanupIfIdle(user), 5000);
}

function updateRippleLifecycle() {
  const expiredContacts = [...contacts.values()]
    .filter(contact => Date.now() >= contact.expiresAtWall)
    .map(contact => contact.id);
  for (const contactId of expiredContacts) {
    const contact = contacts.get(contactId);
    if (contact) resolveContact(contact, 'timeout');
  }

  const offlineUsersToRemove = [];
  for (const user of users.values()) {
    for (const [modeId, ripple] of Object.entries(user.ripples)) {
      const mode = modeConfig(modeId);
      const age = currentRippleAge(ripple);
      if (ripple.status === 'active' && age >= mode.ttl) {
        ripple.status = 'expired';
        ripple.frozenAge = age;
      }
      if (ripple.status !== 'contacted' && ripple.status !== 'active' && age >= mode.ttl + 5) {
        delete user.ripples[modeId];
      }
    }

    const botIsPastSpawnGrace = !user.isBot || Date.now() - user.createdAtWall > 5000;
    const hasLiveRipple = Object.values(user.ripples)
      .some(ripple => ripple.status === 'active' || ripple.status === 'contacted');
    if (!user.ws && !user.pendingContactId && botIsPastSpawnGrace && !hasLiveRipple) {
      offlineUsersToRemove.push(user.id);
    }
  }
  for (const userId of offlineUsersToRemove) users.delete(userId);
}

function createContact(a, b, mode, distance, radiusA, radiusB) {
  const userA = users.get(a.userId);
  const userB = users.get(b.userId);
  if (!userA || !userB || userA.pendingContactId || userB.pendingContactId) return;

  const contactId = 'c' + nextContactId++;
  const ageA = currentRippleAge(a);
  const ageB = currentRippleAge(b);
  const contactPoint = {
    x: a.x + (b.x - a.x) * (distance > 0 ? radiusA / distance : 0.5),
    y: a.y + (b.y - a.y) * (distance > 0 ? radiusA / distance : 0.5)
  };

  a.status = 'contacted';
  b.status = 'contacted';
  a.frozenAge = ageA;
  b.frozenAge = ageB;
  a.contactId = contactId;
  b.contactId = contactId;
  userA.pendingContactId = contactId;
  userB.pendingContactId = contactId;

  const contact = {
    id: contactId,
    mode: mode.id,
    aUserId: userA.id,
    bUserId: userB.id,
    aRippleId: a.id,
    bRippleId: b.id,
    aDecision: null,
    bDecision: null,
    distance,
    travelTime: Math.max(ageA, ageB),
    contact: contactPoint,
    createdAtWall: Date.now(),
    expiresAtWall: Date.now() + CONTACT_RESPONSE_MS,
    resolved: false
  };
  contacts.set(contactId, contact);

  const payloadA = {
    contactId,
    mode: mode.id,
    distance,
    travelTime: contact.travelTime,
    contact: contactPoint,
    expiresAtWall: contact.expiresAtWall,
    radii: { mine: radiusA, partner: radiusB },
    partner: {
      id: userB.id,
      name: userB.name,
      isBot: userB.isBot,
      x: b.x,
      y: b.y,
      rippleRadius: radiusB
    }
  };
  const payloadB = {
    contactId,
    mode: mode.id,
    distance,
    travelTime: contact.travelTime,
    contact: contactPoint,
    expiresAtWall: contact.expiresAtWall,
    radii: { mine: radiusB, partner: radiusA },
    partner: {
      id: userA.id,
      name: userA.name,
      isBot: userA.isBot,
      x: a.x,
      y: a.y,
      rippleRadius: radiusA
    }
  };
  send(userA, { type: 'contact', contact: payloadA });
  send(userB, { type: 'contact', contact: payloadB });
  console.log('CONTACT', mode.id, userA.name, 'x', userB.name, 'distance', Math.round(distance), 'm');
}

function setContactDecision(user, contact, decision) {
  if (!contact || contact.resolved) return;
  const isA = contact.aUserId === user.id;
  const isB = contact.bUserId === user.id;
  if (!isA && !isB) return;

  if (isA && contact.aDecision) return;
  if (isB && contact.bDecision) return;

  if (isA) contact.aDecision = decision;
  if (isB) contact.bDecision = decision;

  const partner = users.get(isA ? contact.bUserId : contact.aUserId);
  if (partner && partner.isBot) {
    const partnerHasDecided = isA ? contact.bDecision : contact.aDecision;
    if (!partnerHasDecided) {
      setTimeout(() => {
        if (!contacts.has(contact.id) || contact.resolved) return;
        setContactDecision(partner, contact, decision);
      }, 900);
    }
  }

  if (contact.aDecision && contact.bDecision) {
    resolveContact(contact, 'decisions');
  }
}

function resolveContact(contact, reason) {
  if (!contact || contact.resolved) return;
  contact.resolved = true;
  contacts.delete(contact.id);

  const userA = users.get(contact.aUserId);
  const userB = users.get(contact.bUserId);
  const rippleA = userA && userA.ripples[contact.mode];
  const rippleB = userB && userB.ripples[contact.mode];

  if (userA && userA.pendingContactId === contact.id) userA.pendingContactId = null;
  if (userB && userB.pendingContactId === contact.id) userB.pendingContactId = null;
  if (rippleA && rippleA.contactId === contact.id) rippleA.contactId = null;
  if (rippleB && rippleB.contactId === contact.id) rippleB.contactId = null;

  const bothAccept = reason === 'decisions' &&
    contact.aDecision === 'accept' && contact.bDecision === 'accept';
  const bothSkip = reason === 'decisions' &&
    contact.aDecision === 'skip' && contact.bDecision === 'skip';

  if (bothSkip && userA && userB && rippleA && rippleB) {
    const pauseAgeA = rippleA.frozenAge || 0;
    const pauseAgeB = rippleB.frozenAge || 0;
    rippleA.status = 'active';
    rippleB.status = 'active';
    rippleA.startSim = simNow - pauseAgeA;
    rippleB.startSim = simNow - pauseAgeB;
    rippleA.frozenAge = null;
    rippleB.frozenAge = null;
    rippleA.bypassedUserIds.add(userB.id);
    rippleB.bypassedUserIds.add(userA.id);
    send(userA, { type: 'contactResult', contactId: contact.id, outcome: 'continue' });
    send(userB, { type: 'contactResult', contactId: contact.id, outcome: 'continue' });
    console.log('CONTACT SKIPPED', userA.name, 'x', userB.name);
    return;
  }

  if (rippleA) {
    rippleA.status = bothAccept ? 'matched' : 'stopped';
    rippleA.frozenAge = rippleA.frozenAge != null ? rippleA.frozenAge : currentRippleAge(rippleA);
  }
  if (rippleB) {
    rippleB.status = bothAccept ? 'matched' : 'stopped';
    rippleB.frozenAge = rippleB.frozenAge != null ? rippleB.frozenAge : currentRippleAge(rippleB);
  }

  if (bothAccept && userA && userB) {
    const matchId = 'm' + nextMatchId++;
    const travelTime = contact.travelTime;
    rippleA.matchId = matchId;
    rippleB.matchId = matchId;
    rippleA.matchedWith = userB.id;
    rippleB.matchedWith = userA.id;
    userA.matchCooldownUntilSim = simNow + MATCH_COOLDOWN_SIM;
    userB.matchCooldownUntilSim = simNow + MATCH_COOLDOWN_SIM;

    const matchA = {
      matchId,
      mode: contact.mode,
      distance: contact.distance,
      atSim: simNow,
      travelTime,
      contact: contact.contact,
      partner: { id: userB.id, name: userB.name, isBot: userB.isBot }
    };
    const matchB = {
      matchId,
      mode: contact.mode,
      distance: contact.distance,
      atSim: simNow,
      travelTime,
      contact: contact.contact,
      partner: { id: userA.id, name: userA.name, isBot: userA.isBot }
    };
    userA.lastMatch = matchA;
    userB.lastMatch = matchB;
    send(userA, { type: 'match', match: matchA, simNow });
    send(userB, { type: 'match', match: matchB, simNow });
    console.log('MATCH', contact.mode, userA.name, 'x', userB.name, 'distance', Math.round(contact.distance), 'm');
  } else {
    if (userA) {
      send(userA, { type: 'contactResult', contactId: contact.id, outcome: 'missed', reason });
    }
    if (userB) {
      send(userB, { type: 'contactResult', contactId: contact.id, outcome: 'missed', reason });
    }
    console.log('CONTACT ENDED', reason, userA && userA.name, userB && userB.name);
  }

  cleanupIfIdle(userA);
  cleanupIfIdle(userB);
}

function resolveMatches() {
  const candidates = [];

  for (const mode of Object.values(MODES)) {
    const group = [...users.values()]
      .map(user => user.ripples[mode.id])
      .filter(ripple => ripple && ripple.status === 'active');

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.userId === b.userId) continue;
        if (a.bypassedUserIds.has(b.userId) || b.bypassedUserIds.has(a.userId)) continue;

        const userA = users.get(a.userId);
        const userB = users.get(b.userId);
        if (!userA || !userB) continue;
        if (userA.pendingContactId || userB.pendingContactId) continue;
        if (mode.onlineRequired && (!isOnline(userA) || !isOnline(userB))) continue;
        if (simNow < userA.matchCooldownUntilSim || simNow < userB.matchCooldownUntilSim) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= mode.ignoreRadius) continue;
        if (distance > mode.maxPairDistance) continue;

        const ageA = currentRippleAge(a);
        const ageB = currentRippleAge(b);
        if (ageA < mode.launchLock || ageB < mode.launchLock) continue;

        const radiusA = radiusAt(mode, ageA);
        const radiusB = radiusAt(mode, ageB);
        if (distance < Math.abs(radiusA - radiusB)) continue;
        if (distance > radiusA + radiusB) continue;

        candidates.push({ a, b, mode, distance, radiusA, radiusB });
      }
    }
  }

  if (!candidates.length) return;

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const candidate of candidates) {
    if (candidate.a.status !== 'active' || candidate.b.status !== 'active') continue;
    createContact(
      candidate.a,
      candidate.b,
      candidate.mode,
      candidate.distance,
      candidate.radiusA,
      candidate.radiusB
    );
  }
}

function tick() {
  const wallNow = Date.now();
  const delta = Math.min(0.25, (wallNow - lastTickWall) / 1000);
  lastTickWall = wallNow;
  simNow += delta * timeScale;

  updateRippleLifecycle();

  if (simNow >= nextMatchCheckSim) {
    resolveMatches();
    nextMatchCheckSim = simNow + MATCH_WINDOW_SIM;
  }

  if (wallNow - lastStateWall >= 100) {
    lastStateWall = wallNow;
    broadcastStates();
  }
}

function handleMessage(user, raw) {
  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch (error) {
    send(user, { type: 'error', message: '消息格式无效' });
    return;
  }

  if (!message || typeof message.type !== 'string') return;

  if (message.type === 'setPosition') {
    if (user.pendingContactId) return;
    const mode = modeConfig(user.mode);
    const limit = mode.worldRadius * 0.95;
    user.x = clamp(Number(message.x) || 0, -limit, limit);
    user.y = clamp(Number(message.y) || 0, -limit, limit);
    return;
  }

  if (message.type === 'setGeo') {
    const latitude = Number(message.latitude);
    const longitude = Number(message.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      send(user, { type: 'error', message: '定位参数无效。' });
      return;
    }
    const mode = modeConfig(user.mode);
    const limit = mode.worldRadius * 0.95;
    const position = geoToLocal(latitude, longitude);
    user.x = clamp(position.x, -limit, limit);
    user.y = clamp(position.y, -limit, limit);
    send(user, { type: 'info', message: '定位已更新。' });
    return;
  }

  if (message.type === 'setMode') {
    if (!MODES[message.mode]) return;
    if (user.pendingContactId) {
      send(user, { type: 'error', message: '当前相遇未结束，暂不能切换范围。' });
      return;
    }
    user.mode = message.mode;
    const position = spawnPosition(user.mode, nextSpawnIndex++);
    user.x = position.x;
    user.y = position.y;
    send(user, { type: 'info', message: '已切换到' + MODES[user.mode].name });
    return;
  }

  if (message.type === 'emit') {
    const result = createRipple(user, user.mode);
    if (result.error) {
      send(user, { type: 'error', message: result.error });
    } else {
      send(user, { type: 'info', message: '已投波。' });
    }
    return;
  }

  if (message.type === 'respondContact') {
    const contact = contacts.get(message.contactId);
    if (!contact) {
      send(user, { type: 'error', message: '这次相遇已经结束了。' });
      return;
    }
    const decision = message.decision === 'skip' ? 'skip' : 'accept';
    setContactDecision(user, contact, decision);
    return;
  }

  if (message.type === 'spawnBot') {
    if (user.pendingContactId) return;
    spawnBot(user, user.mode);
    send(user, { type: 'info', message: '已添加演示用户。' });
    return;
  }

  if (message.type === 'reset') {
    if (user.pendingContactId) {
      send(user, { type: 'error', message: '请先处理当前相遇。' });
      return;
    }
    const ripple = user.ripples[user.mode];
    if (ripple) {
      ripple.frozenAge = currentRippleAge(ripple);
      ripple.status = 'expired';
      delete user.ripples[user.mode];
    }
    user.lastMatch = null;
    send(user, { type: 'info', message: '当前波已取消。' });
    return;
  }

  if (message.type === 'setDebug') {
    user.debug = !!message.value;
    send(user, { type: 'info', message: user.debug ? '已显示附近波。' : '已隐藏附近波。' });
    return;
  }

  if (message.type === 'setTimeScale') {
    const next = Number(message.value);
    if (Number.isFinite(next)) {
      timeScale = clamp(next, MIN_TIME_SCALE, MAX_TIME_SCALE);
    }
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  const user = createUser(ws);
  send(user, welcomeFor(user));

  ws.on('message', raw => handleMessage(user, raw));
  ws.on('close', () => handleDisconnect(user));
  ws.on('error', () => handleDisconnect(user));
});

setInterval(tick, TICK_MS);

server.listen(PORT, () => {
  console.log('Ripple demo running at http://localhost:' + PORT);
});

