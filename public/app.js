(() => {
  'use strict';

  const DEFAULT_GEO = { latitude: 30.2480, longitude: 120.1550 };
  const EARTH_RADIUS = 6371000;
  const GCJ_A = 6378245.0;
  const GCJ_EE = 0.00669342162296594323;

  const ui = {
    app: document.getElementById('app'),
    map: document.getElementById('map'),
    mapWarmth: document.querySelector('.map-warmth'),
    waveCanvas: document.getElementById('waveCanvas'),
    onlineCount: document.getElementById('onlineCount'),
    statusLine: document.getElementById('statusLine'),
    mapBadge: document.getElementById('mapBadge'),
    mapNotice: document.getElementById('mapNotice'),
    sheet: document.getElementById('sheet'),
    waveFeed: document.getElementById('waveFeed'),
    waveFeedLabel: document.getElementById('waveFeedLabel'),
    waveFeedText: document.getElementById('waveFeedText'),
    waveFeedAction: document.getElementById('waveFeedAction'),
    modeTabs: document.getElementById('modeTabs'),
    moreBtn: document.getElementById('moreBtn'),
    zoomIn: document.getElementById('zoomIn'),
    zoomOut: document.getElementById('zoomOut'),
    fitWave: document.getElementById('fitWave'),
    recenter: document.getElementById('recenter'),
    waveEyebrow: document.getElementById('waveEyebrow'),
    waveState: document.getElementById('waveState'),
    modeDot: document.getElementById('modeDot'),
    waveRadius: document.getElementById('waveRadius'),
    waveTime: document.getElementById('waveTime'),
    waveBar: document.getElementById('waveBar'),
    emitBtn: document.getElementById('emitBtn'),
    geoBtn: document.getElementById('geoBtn'),
    botBtn: document.getElementById('botBtn'),
    detailsBtn: document.getElementById('detailsBtn'),
    waitingCard: document.getElementById('waitingCard'),
    promptCount: document.getElementById('promptCount'),
    promptTrack: document.getElementById('promptTrack'),
    promptQuestion: document.getElementById('promptQuestion'),
    promptChoices: document.getElementById('promptChoices'),
    promptFeedback: document.getElementById('promptFeedback'),
    nextPrompt: document.getElementById('nextPrompt'),
    promptResult: document.getElementById('promptResult'),
    promptResultTitle: document.getElementById('promptResultTitle'),
    promptResultBody: document.getElementById('promptResultBody'),
    promptResultTags: document.getElementById('promptResultTags'),
    restartPrompt: document.getElementById('restartPrompt'),
    drawer: document.getElementById('drawer'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    closeDrawer: document.getElementById('closeDrawer'),
    modeName: document.getElementById('modeName'),
    modeDesc: document.getElementById('modeDesc'),
    statSpeed: document.getElementById('statSpeed'),
    statIgnore: document.getElementById('statIgnore'),
    statMax: document.getElementById('statMax'),
    speedBtn: document.getElementById('speedBtn'),
    speedValue: document.getElementById('speedValue'),
    speedMenu: document.getElementById('speedMenu'),
    floatTools: document.getElementById('floatTools'),
    towerBtn: document.getElementById('towerBtn'),
    towerGame: document.getElementById('towerGame'),
    towerCanvas: document.getElementById('towerCanvas'),
    towerClose: document.getElementById('towerClose'),
    towerDrop: document.getElementById('towerDrop'),
    towerFloors: document.getElementById('towerFloors'),
    towerBest: document.getElementById('towerBest'),
    towerMessage: document.getElementById('towerMessage'),
    debugToggle: document.getElementById('debugToggle'),
    adjustBtn: document.getElementById('adjustBtn'),
    resetBtn: document.getElementById('resetBtn'),
    log: document.getElementById('log'),
    toast: document.getElementById('toast'),
    contactOverlay: document.getElementById('contactOverlay'),
    contactName: document.getElementById('contactName'),
    contactAvatar: document.getElementById('contactAvatar'),
    contactDistance: document.getElementById('contactDistance'),
    contactTime: document.getElementById('contactTime'),
    skipContact: document.getElementById('skipContact'),
    acceptContact: document.getElementById('acceptContact'),
    contactWait: document.getElementById('contactWait'),
    contactCountdown: document.getElementById('contactCountdown'),
    matchOverlay: document.getElementById('matchOverlay'),
    matchName: document.getElementById('matchName'),
    matchDistance: document.getElementById('matchDistance'),
    matchTime: document.getElementById('matchTime'),
    matchNote: document.getElementById('matchNote'),
    closeMatch: document.getElementById('closeMatch'),
    profileScreen: document.getElementById('profileScreen'),
    bottomNav: document.getElementById('bottomNav'),
    profileSettings: document.getElementById('profileSettings')
  };

  const state = {
    connected: false,
    me: null,
    mode: 'small',
    modes: {},
    modeConfig: null,
    users: [],
    geoOrigin: null,
    simNow: 0,
    timeScale: 10,
    receivedAt: 0,
    onlineCount: 0,
    debug: false,
    ws: null,
    contact: null,
    contactChoice: null,
    lastMatch: null,
    mapInitialized: false,
    shouldRecenter: false,
    adjustMode: false,
    promptIndex: 0,
    promptAnswered: false,
    promptAnswers: [],
    promptComplete: false,
    screen: 'match'
  };

  const prompts = [
    {
      question: '哪种细节最让你确认对方在意你？',
      options: [
        { text: '记得我的习惯', tag: '细节', energy: 0, reply: '你更在意被记住的细节。' },
        { text: '需要时出现', tag: '在场', energy: 0, reply: '你更看重及时回应。' }
      ]
    },
    {
      question: '你更容易被哪种心动吸引？',
      options: [
        { text: '快速的吸引', tag: '心动', energy: 1, reply: '你偏向即时反馈。' },
        { text: '日久生情', tag: '长情', energy: 0, reply: '你更看重长期相处。' }
      ]
    },
    {
      question: '关系里你更看重什么？',
      options: [
        { text: '持续交流', tag: '表达', energy: 1, reply: '你重视表达和反馈。' },
        { text: '安静相处', tag: '默契', energy: 0, reply: '你看重低压力陪伴。' }
      ]
    },
    {
      question: '第一次约会你更倾向？',
      options: [
        { text: '散步聊天', tag: '陪伴', energy: 0, reply: '你喜欢低压力的交流。' },
        { text: '一起做件事', tag: '共创', energy: 1, reply: '你更习惯通过行动熟悉一个人。' }
      ]
    },
    {
      question: '遇到喜欢的人，你通常会？',
      options: [
        { text: '主动靠近', tag: '主动', energy: 1, reply: '你倾向主动确认。' },
        { text: '先观察', tag: '慎重', energy: 0, reply: '你倾向先确认安全感。' }
      ]
    },
    {
      question: '你理解的“合适”是？',
      options: [
        { text: '价值观接近', tag: '同频', energy: 0, reply: '你看重长期一致性。' },
        { text: '性格互补', tag: '互补', energy: 1, reply: '你看重差异中的配合。' }
      ]
    }
  ];

  const SPEED_OPTIONS = [1, 2, 5, 10];
  const TOWER_COLORS = ['#111216', '#de6f94', '#73757d', '#e8a6bb', '#25262c', '#c9cbd2'];
  const TOWER_WIDTH = 260;
  const TOWER_HEIGHT = 230;
  const TOWER_BLOCK_HEIGHT = 16;
  const TOWER_GROUND_Y = 211;

  let map = null;
  let tileLayer = null;
  let userMarker = null;
  let ignoreCircle = null;
  let waveCircle = null;
  let waveGlow = null;
  let waveEcho = null;
  let otherLayer = null;
  let contactLayer = null;
  const otherMarkers = new Map();
  const otherWaveLayers = new Map();
  let toastTimer = null;
  let contactTickTimer = null;
  let reconnectTimer = null;
  let logCount = 0;
  let towerContext = null;
  let towerFrame = null;
  let towerLastTime = 0;
  let towerBestValue = 0;
  let waveCanvasContext = null;
  let waveCanvasWidth = 0;
  let waveCanvasHeight = 0;
  let waveCanvasDpr = 1;
  const tower = {
    running: false,
    over: false,
    blocks: [],
    current: null,
    speed: 62,
    direction: 1,
    cameraY: 0,
    shake: 0,
    debris: []
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hexToRgba(hex, alpha) {
    const normalized = String(hex || '#e87862').replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map(part => part + part).join('')
      : normalized.padEnd(6, '0').slice(0, 6);
    const number = Number.parseInt(value, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters) || meters <= 0) return '0 m';
    if (meters < 1000) return Math.round(meters) + ' m';
    const kilometers = meters / 1000;
    return (kilometers >= 10 ? kilometers.toFixed(0) : kilometers.toFixed(1)) + ' km';
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    if (hours > 0) {
      return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0');
    }
    return minutes + ':' + String(rest).padStart(2, '0');
  }

  function syncSheetOffset() {
    if (!ui.sheet) return;
    const height = Math.ceil(ui.sheet.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--sheet-height', height + 'px');
  }

  function normalizedSpeed() {
    const value = Math.round(Number(state.timeScale) || 10);
    return SPEED_OPTIONS.includes(value) ? value : 10;
  }

  function updateSpeedUI() {
    const speed = normalizedSpeed();
    ui.speedValue.textContent = speed + '×';
    ui.speedBtn.setAttribute('aria-label', '演示速度 ' + speed + ' 倍，点击选择');
    for (const button of ui.speedMenu.querySelectorAll('[data-speed]')) {
      button.classList.toggle('active', Number(button.dataset.speed) === speed);
    }
  }

  function setSpeedMenu(open) {
    ui.speedMenu.classList.toggle('hidden', !open);
    ui.speedBtn.classList.toggle('is-active', open);
    ui.speedBtn.setAttribute('aria-expanded', String(open));
  }

  function chooseSpeed(value) {
    const next = SPEED_OPTIONS.includes(Number(value)) ? Number(value) : 10;
    state.timeScale = next;
    state.receivedAt = performance.now();
    updateSpeedUI();
    updateMapBadge();
    setSpeedMenu(false);
    send({ type: 'setTimeScale', value: next });
    addLog('演示速度调整为 ×' + next);
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

  function rippleColor(mode, radius) {
    if (!mode) return '#de6f94';
    if (mode.colorUntilRadius > 0 && radius < mode.colorUntilRadius) {
      return mode.color || '#202126';
    }
    return mode.activeColor || mode.color || '#de6f94';
  }

  function localSimNow() {
    if (!state.receivedAt) return state.simNow;
    return state.simNow + Math.max(0, performance.now() - state.receivedAt) / 1000 * state.timeScale;
  }

  function currentOrigin() {
    return state.geoOrigin || DEFAULT_GEO;
  }

  function localToLatLng(x, y) {
    const origin = currentOrigin();
    const latitude = origin.latitude + (y / EARTH_RADIUS) * 180 / Math.PI;
    const longitude = origin.longitude +
      (x / (EARTH_RADIUS * Math.cos(origin.latitude * Math.PI / 180))) * 180 / Math.PI;
    return [latitude, longitude];
  }

  function latLngToLocal(latitude, longitude) {
    const origin = currentOrigin();
    return {
      x: (longitude - origin.longitude) * Math.PI / 180 * EARTH_RADIUS *
        Math.cos(origin.latitude * Math.PI / 180),
      y: (latitude - origin.latitude) * Math.PI / 180 * EARTH_RADIUS
    };
  }

  function outOfChina(latitude, longitude) {
    return longitude < 72.004 || longitude > 137.8347 ||
      latitude < 0.8293 || latitude > 55.8271;
  }

  function transformLatitude(x, y) {
    let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    value += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
    value += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
    return value;
  }

  function transformLongitude(x, y) {
    let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    value += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
    value += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
    return value;
  }

  function wgs84ToGcj02(latitude, longitude) {
    if (outOfChina(latitude, longitude)) return [latitude, longitude];
    const dLatitude = transformLatitude(longitude - 105, latitude - 35);
    const dLongitude = transformLongitude(longitude - 105, latitude - 35);
    const latitudeRadians = latitude / 180 * Math.PI;
    let magic = Math.sin(latitudeRadians);
    magic = 1 - GCJ_EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    const deltaLatitude = (dLatitude * 180) /
      ((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic) * Math.PI);
    const deltaLongitude = (dLongitude * 180) /
      (GCJ_A / sqrtMagic * Math.cos(latitudeRadians) * Math.PI);
    return [latitude + deltaLatitude, longitude + deltaLongitude];
  }

  function gcj02ToWgs84(latitude, longitude) {
    if (outOfChina(latitude, longitude)) return [latitude, longitude];
    const [gcjLatitude, gcjLongitude] = wgs84ToGcj02(latitude, longitude);
    return [latitude * 2 - gcjLatitude, longitude * 2 - gcjLongitude];
  }

  function toMapLatLng(x, y) {
    const [latitude, longitude] = localToLatLng(x, y);
    return wgs84ToGcj02(latitude, longitude);
  }

  function rippleAge(ripple) {
    if (!ripple) return 0;
    if (ripple.status === 'active') {
      return Math.max(0, localSimNow() - ripple.startSim);
    }
    return Math.max(0, ripple.age || 0);
  }

  function initWaveCanvas() {
    if (!ui.waveCanvas) return;
    waveCanvasContext = ui.waveCanvas.getContext('2d');
    resizeWaveCanvas();
  }

  function resizeWaveCanvas() {
    if (!ui.waveCanvas || !ui.map) return;
    const bounds = ui.map.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (width === waveCanvasWidth && height === waveCanvasHeight && dpr === waveCanvasDpr) return;
    waveCanvasWidth = width;
    waveCanvasHeight = height;
    waveCanvasDpr = dpr;
    ui.waveCanvas.width = Math.round(width * dpr);
    ui.waveCanvas.height = Math.round(height * dpr);
    ui.waveCanvas.style.width = width + 'px';
    ui.waveCanvas.style.height = height + 'px';
    if (waveCanvasContext) waveCanvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function traceWaterRing(context, centerX, centerY, radius, phase, seed) {
    const segments = clamp(Math.round(radius * 0.34), 96, 260);
    const amplitude = clamp(radius * 0.0048, 1.1, 7);
    context.beginPath();
    for (let index = 0; index <= segments; index++) {
      const angle = index / segments * Math.PI * 2;
      const swell =
        Math.sin(angle * 7 + phase * 0.72 + seed) * 0.56 +
        Math.sin(angle * 13 - phase * 0.48 + seed * 1.7) * 0.29 +
        Math.sin(angle * 3 + phase * 0.23 + seed * 0.6) * 0.15;
      const rippleRadius = radius + amplitude * swell;
      const x = centerX + Math.cos(angle) * rippleRadius;
      const y = centerY + Math.sin(angle) * rippleRadius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  }

  function drawWaveCanvas(ownRipple, radius, age) {
    if (!waveCanvasContext || !ui.waveCanvas) return;
    resizeWaveCanvas();
    const context = waveCanvasContext;
    context.clearRect(0, 0, waveCanvasWidth, waveCanvasHeight);
    if (!map || !state.me || !ownRipple || radius <= 0) return;

    const mode = state.modeConfig;
    const latLng = toMapLatLng(state.me.x, state.me.y);
    const center = map.latLngToContainerPoint(latLng);
    const edge = map.latLngToContainerPoint(toMapLatLng(state.me.x + radius, state.me.y));
    const pixelRadius = center.distanceTo(edge);
    if (!Number.isFinite(pixelRadius)) return;

    const active = ownRipple.status === 'active';
    const phase = age * 0.82;
    const diagonal = Math.hypot(waveCanvasWidth, waveCanvasHeight);
    const color = rippleColor(mode, radius);

    if (pixelRadius < diagonal * 1.55) {
      const fill = context.createRadialGradient(
        center.x,
        center.y,
        Math.max(8, pixelRadius * 0.12),
        center.x,
        center.y,
        Math.max(10, pixelRadius)
      );
      fill.addColorStop(0, hexToRgba(color, 0.004));
      fill.addColorStop(0.72, hexToRgba(color, 0.026));
      fill.addColorStop(0.92, hexToRgba(color, active ? 0.11 : 0.072));
      fill.addColorStop(1, hexToRgba(color, 0));
      traceWaterRing(context, center.x, center.y, pixelRadius * 0.998, phase, 0.2);
      context.fillStyle = fill;
      context.fill();

      const bands = [
        { offset: 0, width: active ? 5.2 : 4, alpha: active ? 0.29 : 0.2, blur: 20, seed: 0.2 },
        { offset: -9, width: active ? 2 : 1.5, alpha: active ? 0.76 : 0.5, blur: 12, seed: 1.4 },
        { offset: -24, width: 1.2, alpha: active ? 0.3 : 0.2, blur: 6, seed: 2.6 }
      ];
      for (const band of bands) {
        if (pixelRadius + band.offset < 2) continue;
        context.save();
        context.shadowColor = hexToRgba(color, active ? 0.42 : 0.24);
        context.shadowBlur = band.blur;
        context.strokeStyle = hexToRgba(color, band.alpha);
        context.lineWidth = band.width;
        traceWaterRing(context, center.x, center.y, pixelRadius + band.offset, phase, band.seed);
        context.stroke();
        context.restore();
      }

      context.save();
      context.strokeStyle = active ? 'rgba(255, 252, 247, 0.9)' : 'rgba(255, 252, 247, 0.62)';
      context.lineWidth = active ? 1.65 : 1.2;
      context.setLineDash([3.2, 11]);
      context.lineDashOffset = -phase * 22;
      traceWaterRing(context, center.x, center.y, pixelRadius - 3.5, phase, 0.2);
      context.stroke();
      context.restore();

      const flecks = pixelRadius < 520 ? 18 : 28;
      for (let index = 0; index < flecks; index++) {
        const angle = index / flecks * Math.PI * 2 + phase * 0.07;
        const drift = Math.sin(angle * 9 + phase) * 3;
        const fleckRadius = pixelRadius + drift;
        const x = center.x + Math.cos(angle) * fleckRadius;
        const y = center.y + Math.sin(angle) * fleckRadius;
        const glint = 0.3 + (Math.sin(phase * 1.4 + index * 2.3) + 1) * 0.2;
        context.fillStyle = `rgba(255, 252, 246, ${glint})`;
        context.beginPath();
        context.arc(x, y, index % 4 === 0 ? 1.35 : 0.75, 0, Math.PI * 2);
        context.fill();
      }
    }

    const sourcePulse = active ? phase % 1 : 0.58;
    for (let index = 0; index < 3; index++) {
      const localPhase = (sourcePulse + index / 3) % 1;
      const sourceRadius = 15 + localPhase * 52;
      const alpha = (1 - localPhase) * (active ? 0.4 : 0.16);
      context.save();
      context.strokeStyle = hexToRgba(color, alpha);
      context.lineWidth = 1.15;
      traceWaterRing(context, center.x, center.y, sourceRadius, phase * 0.8, index + 0.65);
      context.stroke();
      context.restore();
    }
  }

  function initMap() {
    if (!window.L) {
      ui.mapNotice.classList.remove('hidden');
      return;
    }

    map = window.L.map('map', {
      zoomControl: false,
      attributionControl: false,
      minZoom: 10,
      maxZoom: 19,
      zoomSnap: 0.5
    });
    ui.map.classList.add('is-loading');

    let tileErrorCount = 0;
    tileLayer = window.L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      {
        subdomains: '1234',
        maxZoom: 19,
        attribution: '&copy; 高德地图'
      }
    );
    tileLayer.on('tileerror', () => {
      tileErrorCount++;
      if (tileErrorCount >= 3) ui.mapNotice.classList.remove('hidden');
    });
    tileLayer.on('load', () => {
      ui.map.classList.remove('is-loading');
      if (tileErrorCount < 3) ui.mapNotice.classList.add('hidden');
    });
    window.L.control.attribution({ position: 'bottomleft', prefix: false })
      .addTo(map)
      .addAttribution('&copy; 高德地图');

    otherLayer = window.L.layerGroup().addTo(map);
    contactLayer = window.L.layerGroup().addTo(map);

    map.setView(wgs84ToGcj02(DEFAULT_GEO.latitude, DEFAULT_GEO.longitude), 17);
    map.on('zoomend', updateMapBadge);
    map.on('click', handleMapClick);
    setTimeout(() => map.invalidateSize(), 80);
    updateMapBadge();
  }

  function ensureTileLayer() {
    if (!map || !tileLayer) return;
    if (!map.hasLayer(tileLayer)) {
      ui.map.classList.add('is-loading');
      tileLayer.addTo(map);
    }
  }

  function handleMapClick(event) {
    if (!state.adjustMode || !state.me) return;
    const [latitude, longitude] = gcj02ToWgs84(event.latlng.lat, event.latlng.lng);
    const local = latLngToLocal(latitude, longitude);
    const mode = state.modeConfig;
    const limit = mode ? mode.worldRadius * 0.95 : 10000;
    state.me.x = clamp(local.x, -limit, limit);
    state.me.y = clamp(local.y, -limit, limit);
    send({ type: 'setPosition', x: state.me.x, y: state.me.y });
    state.adjustMode = false;
    ui.adjustBtn.textContent = '在地图上选择位置';
    ui.adjustBtn.classList.remove('is-active');
      addLog('位置已更新');
  }

  function updateMapBadge() {
    if (!map) {
      ui.mapBadge.textContent = '街道视角';
      return;
    }
    const zoom = map.getZoom();
    let label = '地图全览';
    if (zoom >= 16) label = '街道';
    else if (zoom >= 14) label = '街区';
    else if (zoom >= 12) label = '城市';
    ui.mapBadge.textContent = label;
  }

  function ensureSelfLayers() {
    if (!map || !state.me || !state.modeConfig) return;
    const position = toMapLatLng(state.me.x, state.me.y);
    const mode = state.modeConfig;

    if (!ignoreCircle) {
      ignoreCircle = window.L.circle(position, {
        radius: mode.ignoreRadius,
        color: '#de6f94',
        weight: 1,
        opacity: 0.52,
        dashArray: '3 7',
        fillColor: '#de6f94',
        fillOpacity: 0.025,
        interactive: false
      }).addTo(map);
    }
    ignoreCircle.setLatLng(position);
    ignoreCircle.setRadius(mode.ignoreRadius);

    if (!waveGlow) {
      waveGlow = window.L.circle(position, {
        radius: 1,
        stroke: false,
        fillColor: rippleColor(mode, 0),
        fillOpacity: 0.05,
        interactive: false
      }).addTo(map);
    }
    waveGlow.setLatLng(position);
    waveGlow.setStyle({ fillColor: rippleColor(mode, 0) });

    if (!waveCircle) {
      waveCircle = window.L.circle(position, {
        radius: 1,
        color: rippleColor(mode, 0),
        weight: 1.1,
        opacity: 0.3,
        dashArray: '2 10',
        lineCap: 'round',
        fillColor: rippleColor(mode, 0),
        fillOpacity: 0.035,
        className: 'wave-ring',
        interactive: false
      }).addTo(map);
    }
    waveCircle.setLatLng(position);
    const initialColor = rippleColor(mode, 0);
    waveCircle.setStyle({ color: initialColor, fillColor: initialColor });

    if (!waveEcho) {
      waveEcho = window.L.circle(position, {
        radius: 1,
        color: '#ffffff',
        weight: 0.8,
        opacity: 0.26,
        dashArray: '1 13',
        lineCap: 'round',
        fill: false,
        className: 'wave-echo',
        interactive: false
      }).addTo(map);
    }
    waveEcho.setLatLng(position);

    if (!userMarker) {
      const html = '<div class="user-pin">' +
        '<span class="pin-halo"></span>' +
        '<span class="pin-halo second"></span>' +
        '<span class="pin-halo third"></span>' +
        '<span class="pin-face">你</span>' +
        '<span class="pin-caption">我在这里</span>' +
        '</div>';
      userMarker = window.L.marker(position, {
        icon: window.L.divIcon({
          className: '',
          html,
          iconSize: [58, 58],
          iconAnchor: [29, 29]
        }),
        interactive: false,
        zIndexOffset: 900
      }).addTo(map);
    }
    userMarker.setLatLng(position);
  }

  function renderMapFrame() {
    if (!map || !state.me || !state.modeConfig) return;
    ensureSelfLayers();

    const mode = state.modeConfig;
    const ownRipple = state.me.ripple;
    const pin = userMarker && userMarker.getElement() ?
      userMarker.getElement().querySelector('.user-pin') : null;

    let radius = 0;
    let age = 0;
    if (ownRipple) {
      age = rippleAge(ownRipple);
      radius = Math.min(mode.maxRadius, radiusAt(mode, age));
    }

    const visible = !!(ownRipple && radius > 0 &&
      ['active', 'contacted', 'matched', 'stopped'].includes(ownRipple.status));
    if (visible) {
      waveCircle.setRadius(Math.max(radius, 1));
      waveGlow.setRadius(Math.max(radius, 1));
      waveEcho.setRadius(Math.max(radius - Math.max(14, radius * 0.018), 1));
      if (!map.hasLayer(waveCircle)) waveCircle.addTo(map);
      if (!map.hasLayer(waveGlow)) waveGlow.addTo(map);
      if (!map.hasLayer(waveEcho)) waveEcho.addTo(map);
      const frozen = ownRipple.status !== 'active';
      const waveColor = rippleColor(mode, radius);
      const circleElement = waveCircle.getElement();
      const echoElement = waveEcho.getElement();
      if (circleElement) circleElement.classList.toggle('is-frozen', frozen);
      if (echoElement) echoElement.classList.toggle('is-frozen', frozen);
      waveGlow.setStyle({ fillColor: waveColor, fillOpacity: frozen ? 0.026 : 0.052 });
      waveCircle.setStyle({
        color: waveColor,
        fillColor: waveColor,
        opacity: frozen ? 0.2 : 0.32,
        fillOpacity: frozen ? 0.008 : 0.014
      });
    } else {
      if (map.hasLayer(waveCircle)) map.removeLayer(waveCircle);
      if (map.hasLayer(waveGlow)) map.removeLayer(waveGlow);
      if (map.hasLayer(waveEcho)) map.removeLayer(waveEcho);
    }

    if (pin) pin.classList.toggle('is-live', !!(ownRipple && ownRipple.status === 'active'));
    updateWaveFeed(ownRipple, radius, age);
    drawWaveCanvas(visible ? ownRipple : null, visible ? radius : 0, age);
    updateOtherRippleLayers();

    ui.waveRadius.textContent = formatDistance(radius);
    ui.waveTime.textContent = formatDuration(age);
    ui.waveBar.style.width = Math.min(100, radius / mode.maxRadius * 100) + '%';
  }

  function updateWaveFeed(ownRipple, radius, age) {
    if (!ownRipple || radius <= 0 || ownRipple.status === 'expired') {
      ui.waveFeed.classList.add('hidden');
      return;
    }

    let label = '扩散中';
    let action = '查看范围';
    if (ownRipple.status === 'active') {
      label = '扩散中';
    } else if (ownRipple.status === 'contacted') {
      label = '已暂停';
      action = '查看位置';
    } else if (ownRipple.status === 'matched') {
      label = '已配对';
      action = '查看位置';
    } else if (ownRipple.status === 'stopped') {
      label = '已停止';
      action = '查看位置';
    }

    ui.waveFeedLabel.textContent = label;
    ui.waveFeedText.textContent = formatDistance(radius) + ' · ' + formatDuration(age);
    ui.waveFeed.classList.remove('hidden');
    ui.waveFeed.classList.toggle('is-live', ownRipple.status === 'active');
    ui.waveFeed.classList.toggle('is-stopped', ownRipple.status !== 'active');
    ui.waveFeed.classList.toggle('is-matched', ownRipple.status === 'matched');
    ui.waveFeedAction.textContent = action;
  }

  function renderOtherMarkers() {
    if (!map || !otherLayer) return;
    if (!state.debug || !state.me) {
      otherLayer.clearLayers();
      otherMarkers.clear();
      otherWaveLayers.clear();
      return;
    }

    const liveMarkers = new Set();
    const liveRipples = new Set();

    for (const other of state.users) {
      const position = toMapLatLng(other.x, other.y);
      liveMarkers.add(other.id);
      let marker = otherMarkers.get(other.id);
      if (!marker) {
        const label = other.isBot ? '演示波友' : other.name;
        const html = '<div class="other-pin"><i></i><span>' + label + '</span></div>';
        marker = window.L.marker(position, {
          icon: window.L.divIcon({
            className: '',
            html,
            iconSize: [72, 25],
            iconAnchor: [20, 13]
          }),
          interactive: false,
          zIndexOffset: 600
        }).addTo(otherLayer);
        otherMarkers.set(other.id, marker);
      } else {
        marker.setLatLng(position);
      }

      for (const ripple of other.ripples) {
        const mode = state.modes[ripple.mode];
        if (!mode) continue;
        if (ripple.status !== 'active' && ripple.status !== 'contacted') continue;
        liveRipples.add(ripple.id);
        let entry = otherWaveLayers.get(ripple.id);
        if (!entry) {
          entry = {
            circle: window.L.circle(position, {
              radius: 1,
              color: rippleColor(mode, 0),
              weight: 1.2,
              opacity: 0.45,
              fillColor: rippleColor(mode, 0),
              fillOpacity: 0.018,
              className: 'other-wave-ring',
              interactive: false
            }).addTo(otherLayer),
            mode,
            ripple
          };
          otherWaveLayers.set(ripple.id, entry);
        } else {
          entry.circle.setLatLng(position);
          entry.mode = mode;
          entry.ripple = ripple;
        }
      }
    }

    for (const [id, marker] of otherMarkers) {
      if (liveMarkers.has(id)) continue;
      otherLayer.removeLayer(marker);
      otherMarkers.delete(id);
    }
    for (const [id, entry] of otherWaveLayers) {
      if (liveRipples.has(id)) continue;
      otherLayer.removeLayer(entry.circle);
      otherWaveLayers.delete(id);
    }

    updateOtherRippleLayers();
  }

  function updateOtherRippleLayers() {
    if (!map || !otherWaveLayers.size) return;
    for (const entry of otherWaveLayers.values()) {
      const ripple = entry.ripple;
      const mode = entry.mode;
      const age = ripple.status === 'active'
        ? Math.max(0, localSimNow() - ripple.startSim)
        : Math.max(0, ripple.age || 0);
      const radius = Math.min(mode.maxRadius, radiusAt(mode, age));
      const color = rippleColor(mode, radius);
      entry.circle.setRadius(Math.max(radius, 1));
      entry.circle.setStyle({ color, fillColor: color });
    }
  }

  function centerOnUser(animate) {
    if (!map || !state.me) return;
    const position = toMapLatLng(state.me.x, state.me.y);
    ensureTileLayer();
    map.setView(position, 17, { animate: !!animate, duration: 0.45 });
    state.mapInitialized = true;
    state.shouldRecenter = false;
  }

  function createPromptButtons() {
    state.promptComplete = false;
    const prompt = prompts[state.promptIndex];
    ui.promptCount.textContent = String(state.promptIndex + 1).padStart(2, '0') +
      ' / ' + String(prompts.length).padStart(2, '0');
    ui.promptQuestion.textContent = prompt.question;
    ui.promptQuestion.classList.remove('hidden');
    ui.promptChoices.classList.remove('hidden');
    ui.promptChoices.innerHTML = '';
    ui.promptFeedback.classList.add('hidden');
    ui.promptFeedback.textContent = '';
    ui.nextPrompt.classList.add('hidden');
    ui.nextPrompt.textContent = state.promptIndex === prompts.length - 1 ? '查看结果' : '下一题';
    ui.promptResult.classList.add('hidden');
    state.promptAnswered = false;
    updatePromptTrack(-1);

    prompt.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'prompt-choice';
      const key = document.createElement('span');
      key.className = 'prompt-choice-key';
      key.textContent = index === 0 ? 'A' : 'B';
      const label = document.createElement('span');
      label.textContent = option.text;
      button.append(key, label);
      button.addEventListener('click', () => answerPrompt(index));
      ui.promptChoices.appendChild(button);
    });
  }

  function updatePromptTrack(selectedIndex) {
    if (!ui.promptTrack) return;
    ui.promptTrack.innerHTML = '';
    prompts.forEach((prompt, index) => {
      const marker = document.createElement('i');
      const answer = state.promptAnswers[index];
      const answeredNow = index === state.promptIndex && selectedIndex >= 0;
      marker.className = 'prompt-track-dot' +
        (state.promptComplete || index < state.promptIndex || answeredNow ? ' is-done' : '') +
        (!state.promptComplete && index === state.promptIndex ? ' is-current' : '');
      marker.title = '第 ' + (index + 1) + ' 题' + (answer === undefined ? '' : ' · 已答');
      ui.promptTrack.appendChild(marker);
    });
  }

  function answerPrompt(selectedIndex) {
    if (state.promptAnswered) return;
    state.promptAnswered = true;
    const prompt = prompts[state.promptIndex];
    const buttons = [...ui.promptChoices.querySelectorAll('.prompt-choice')];
    buttons.forEach((button, index) => {
      button.disabled = true;
      button.classList.toggle('selected', index === selectedIndex);
    });
    state.promptAnswers[state.promptIndex] = selectedIndex;
    ui.promptFeedback.textContent = prompt.options[selectedIndex].reply;
    ui.promptFeedback.classList.remove('hidden');
    ui.nextPrompt.classList.remove('hidden');
    updatePromptTrack(selectedIndex);
  }

  function nextPrompt() {
    if (!state.promptAnswered) return;
    if (state.promptIndex < prompts.length - 1) {
      state.promptIndex++;
      createPromptButtons();
      return;
    }
    showPromptResult();
  }

  function showPromptResult() {
    state.promptComplete = true;
    ui.promptQuestion.classList.add('hidden');
    ui.promptChoices.classList.add('hidden');
    ui.promptFeedback.classList.add('hidden');
    ui.nextPrompt.classList.add('hidden');
    ui.promptCount.textContent = '结果';
    updatePromptTrack(0);

    const selectedTags = [];
    let energy = 0;
    prompts.forEach((prompt, index) => {
      const option = prompt.options[state.promptAnswers[index]];
      if (!option) return;
      energy += option.energy;
      if (option.tag && !selectedTags.includes(option.tag)) selectedTags.push(option.tag);
    });

    let title;
    let body;
    if (energy >= 4) {
      title = '主动型';
      body = '更偏向主动表达，也愿意快速确认感觉。';
    } else if (energy >= 2) {
      title = '平衡型';
      body = '会主动靠近，同时需要稳定回应。';
    } else {
      title = '慢热型';
      body = '更看重细节、默契和长期回应。';
    }

    ui.promptResultTitle.textContent = title;
    ui.promptResultBody.textContent = body;
    ui.promptResultTags.innerHTML = '';
    selectedTags.slice(0, 4).forEach(tag => {
      const item = document.createElement('span');
      item.textContent = tag;
      ui.promptResultTags.appendChild(item);
    });
    ui.promptResult.classList.remove('hidden');
  }

  function restartPrompt() {
    state.promptIndex = 0;
    state.promptAnswers = [];
    state.promptComplete = false;
    ui.promptResult.classList.add('hidden');
    createPromptButtons();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function readTowerBest() {
    try {
      return Math.max(0, Number(localStorage.getItem('rippleTowerBest')) || 0);
    } catch (error) {
      return 0;
    }
  }

  function saveTowerBest(value) {
    try {
      localStorage.setItem('rippleTowerBest', String(value));
    } catch (error) {
      // localStorage may be unavailable in private browsing contexts.
    }
  }

  function initTowerGame() {
    if (!ui.towerCanvas || towerContext) return;
    towerContext = ui.towerCanvas.getContext('2d');
    towerBestValue = readTowerBest();
    ui.towerBest.textContent = '最高 ' + towerBestValue + ' 层';
  }

  function setTowerOpen(open) {
    ui.towerGame.classList.toggle('hidden', !open);
    ui.towerBtn.setAttribute('aria-expanded', String(open));
    ui.towerBtn.classList.toggle('is-active', open);
  }

  function stopTowerGame() {
    tower.running = false;
    tower.over = false;
    if (towerFrame) {
      cancelAnimationFrame(towerFrame);
      towerFrame = null;
    }
  }

  function closeTowerGame() {
    stopTowerGame();
    setTowerOpen(false);
  }

  function openTowerGame() {
    initTowerGame();
    setSpeedMenu(false);
    setTowerOpen(true);
    startTowerGame();
  }

  function startTowerGame() {
    initTowerGame();
    if (!towerContext) return;
    stopTowerGame();
    tower.running = true;
    tower.over = false;
    tower.speed = 76;
    tower.shake = 0;
    tower.debris = [];
    tower.cameraY = 0;
    tower.blocks = [{ x: 82, width: 96, color: TOWER_COLORS[0] }];
    tower.current = {
      x: 0,
      width: 96,
      color: TOWER_COLORS[2]
    };
    tower.direction = 1;
    ui.towerFloors.textContent = '0';
    ui.towerDrop.textContent = '放下';
    ui.towerMessage.textContent = '每层加速，未接住结束。';
    towerLastTime = performance.now();
    towerFrame = requestAnimationFrame(towerLoop);
  }

  function spawnTowerBlock(width) {
    const paletteIndex = tower.blocks.length % TOWER_COLORS.length;
    tower.current = {
      x: Math.random() > 0.5 ? 0 : Math.max(0, TOWER_WIDTH - width),
      width,
      color: TOWER_COLORS[paletteIndex]
    };
    tower.direction = Math.random() > 0.5 ? 1 : -1;
    if (tower.current.x <= 0) tower.direction = 1;
    if (tower.current.x + width >= TOWER_WIDTH) tower.direction = -1;
  }

  function addTowerDebris(block, side) {
    const y = TOWER_GROUND_Y - tower.blocks.length * TOWER_BLOCK_HEIGHT + tower.cameraY;
    for (let i = 0; i < 3; i++) {
      tower.debris.push({
        x: side === 'left' ? block.x - 4 : block.x + block.width + 4,
        y: y + Math.random() * 10,
        vx: side === 'left' ? -25 - Math.random() * 24 : 25 + Math.random() * 24,
        vy: 15 + Math.random() * 25,
        life: 0.75,
        color: block.color
      });
    }
  }

  function finishTowerGame(message) {
    tower.running = false;
    tower.over = true;
    const floors = Math.max(0, tower.blocks.length - 1);
    if (floors > towerBestValue) {
      towerBestValue = floors;
      saveTowerBest(floors);
      ui.towerBest.textContent = '最高 ' + floors + ' 层';
    }
    ui.towerFloors.textContent = String(floors);
    ui.towerDrop.textContent = '再叠一次';
    ui.towerMessage.textContent = message || (floors > 0
      ? '本局 ' + floors + ' 层。'
      : '本局 0 层。');
    if (towerFrame) {
      cancelAnimationFrame(towerFrame);
      towerFrame = null;
    }
    drawTowerGame();
  }

  function dropTowerBlock() {
    if (!towerContext) return;
    if (tower.over) {
      startTowerGame();
      return;
    }
    if (!tower.running || !tower.current) return;

    const last = tower.blocks[tower.blocks.length - 1];
    const current = tower.current;
    const left = Math.max(last.x, current.x);
    const right = Math.min(last.x + last.width, current.x + current.width);
    const overlap = right - left;

    if (overlap < 6) {
      finishTowerGame('未接住，本局结束。');
      return;
    }

    const clippedLeft = Math.max(0, last.x - current.x);
    const clippedRight = Math.max(0, current.x + current.width - (last.x + last.width));
    if (clippedLeft > 7) addTowerDebris({ x: left, width: clippedLeft, color: current.color }, 'left');
    if (clippedRight > 7) addTowerDebris({ x: right - clippedRight, width: clippedRight, color: current.color }, 'right');

    tower.blocks.push({ x: left, width: overlap, color: current.color });
    tower.shake = overlap < 22 ? 5 : 2;
    tower.speed = Math.min(190, tower.speed + 6.5);
    ui.towerFloors.textContent = String(tower.blocks.length - 1);
    spawnTowerBlock(overlap);
  }

  function drawTowerWindows(x, y, width) {
    if (!towerContext || width < 23) return;
    const count = Math.max(1, Math.min(4, Math.floor((width - 10) / 12)));
    const spacing = width / (count + 1);
    towerContext.fillStyle = 'rgba(255, 255, 255, 0.56)';
    for (let i = 1; i <= count; i++) {
      towerContext.fillRect(x + spacing * i - 2, y + 4, 4, 6);
    }
  }

  function drawTowerBlock(block, index, isCurrent) {
    if (!towerContext) return;
    const context = towerContext;
    const y = TOWER_GROUND_Y - (index + 1) * TOWER_BLOCK_HEIGHT + tower.cameraY;
    if (y < -TOWER_BLOCK_HEIGHT || y > TOWER_HEIGHT) return;
    roundRect(context, block.x, y, block.width, TOWER_BLOCK_HEIGHT - 1.5, 4);
    context.fillStyle = block.color;
    context.fill();

    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(context, block.x + 2, y + 2, Math.max(0, block.width - 4), 3, 2);
    context.fill();
    drawTowerWindows(block.x, y, block.width);
  }

  function drawTowerGame() {
    if (!towerContext) return;
    const context = towerContext;
    context.setTransform(2, 0, 0, 2, 0, 0);
    context.clearRect(0, 0, TOWER_WIDTH, TOWER_HEIGHT);

    const background = context.createLinearGradient(0, 0, 0, TOWER_HEIGHT);
    background.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    background.addColorStop(1, 'rgba(255, 79, 145, 0.025)');
    context.fillStyle = background;
    context.fillRect(0, 0, TOWER_WIDTH, TOWER_HEIGHT);

    context.fillStyle = 'rgba(255, 79, 145, 0.28)';
    context.beginPath();
    context.arc(211, 42, 18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(17, 18, 22, 0.8)';
    context.beginPath();
    context.arc(205, 40, 1.4, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(217, 40, 1.4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(17, 18, 22, 0.8)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(211, 44, 5, 0.2, Math.PI - 0.2);
    context.stroke();
    context.fillStyle = 'rgba(226, 226, 232, 0.38)';
    context.beginPath();
    context.ellipse(62, 48, 27, 8, 0, 0, Math.PI * 2);
    context.ellipse(83, 43, 17, 7, 0, 0, Math.PI * 2);
    context.fill();

    const groundY = TOWER_GROUND_Y + tower.cameraY;
    if (groundY < TOWER_HEIGHT) {
      context.fillStyle = 'rgba(255, 79, 145, 0.08)';
      context.fillRect(0, groundY + 17, TOWER_WIDTH, TOWER_HEIGHT - groundY - 17);
      context.strokeStyle = 'rgba(17, 18, 22, 0.16)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, groundY + 17.5);
      context.lineTo(TOWER_WIDTH, groundY + 17.5);
      context.stroke();
    }

    context.save();
    if (tower.shake > 0.1) {
      context.translate((Math.random() - 0.5) * tower.shake, 0);
    }

    tower.blocks.forEach((block, index) => drawTowerBlock(block, index, false));

    if (tower.current && tower.running) {
      const last = tower.blocks[tower.blocks.length - 1];
      const currentY = TOWER_GROUND_Y - (tower.blocks.length + 1) * TOWER_BLOCK_HEIGHT + tower.cameraY;
      const guideBottom = Math.min(TOWER_GROUND_Y + tower.cameraY - 2, currentY + 76);
      context.strokeStyle = 'rgba(255, 79, 145, 0.34)';
      context.setLineDash([3, 5]);
      context.beginPath();
      context.moveTo(last.x + last.width / 2, currentY + 17);
      context.lineTo(last.x + last.width / 2, guideBottom);
      context.stroke();
      context.setLineDash([]);
      drawTowerBlock(tower.current, tower.blocks.length, true);
    }

    for (const particle of tower.debris) {
      context.globalAlpha = Math.max(0, particle.life);
      context.fillStyle = particle.color;
      roundRect(context, particle.x, particle.y, 4, 7, 1);
      context.fill();
    }
    context.globalAlpha = 1;
    context.restore();
  }

  function towerLoop(time) {
    const delta = Math.min(0.05, Math.max(0, (time - towerLastTime) / 1000));
    towerLastTime = time;

    const visibleFloors = 10;
    const targetCameraY = Math.max(0, (tower.blocks.length - visibleFloors) * TOWER_BLOCK_HEIGHT);
    tower.cameraY += (targetCameraY - tower.cameraY) * Math.min(1, delta * 10);

    if (tower.running && tower.current) {
      tower.current.x += tower.direction * tower.speed * delta;
      const maxX = TOWER_WIDTH - tower.current.width;
      if (tower.current.x <= 0) {
        tower.current.x = 0;
        tower.direction = 1;
      } else if (tower.current.x >= maxX) {
        tower.current.x = maxX;
        tower.direction = -1;
      }
    }

    if (tower.shake > 0) tower.shake = Math.max(0, tower.shake - delta * 24);
    const alive = [];
    for (const particle of tower.debris) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 55 * delta;
      particle.life -= delta * 1.8;
      if (particle.life > 0) alive.push(particle);
    }
    tower.debris = alive;

    drawTowerGame();
    if (tower.running) {
      towerFrame = requestAnimationFrame(towerLoop);
    } else {
      towerFrame = null;
    }
  }

  function updateModeDetails() {
    const mode = state.modeConfig;
    if (!mode) return;
    ui.modeName.textContent = mode.name;
    ui.modeDesc.textContent = mode.description;
    ui.statSpeed.textContent = mode.phases.map(phase => phase.speed).join(' / ') + ' m/s';
    ui.statIgnore.textContent = formatDistance(mode.ignoreRadius);
    ui.statMax.textContent = formatDistance(mode.maxRadius);
    ui.modeDot.style.setProperty('--mode-color', mode.activeColor || mode.color);
  }

  function updateUI() {
    if (!state.me || !state.modeConfig) return;
    ui.onlineCount.textContent = state.onlineCount;
    ui.statusLine.textContent = state.connected ? '已连接' : '连接中…';
    ui.debugToggle.checked = state.debug;
    updateSpeedUI();
    updateMapBadge();
    updateModeDetails();
    buildModeTabs();

    const mode = state.modeConfig;
    const ownRipple = state.me.ripple;
    const hasContact = !!state.contact || !!state.me.pendingContactId;
    const cooldown = Math.max(0, (state.me.matchCooldownUntilSim || 0) - state.simNow);
    const waveBusy = !!(ownRipple && (ownRipple.status === 'active' || ownRipple.status === 'contacted'));
    const canEmit = state.connected && !hasContact && !waveBusy && cooldown <= 0;

    let eyebrow = mode.name;
    let title = '投波';
    let emitLabel = '投波';

    if (ownRipple) {
      if (ownRipple.status === 'active') {
        const age = rippleAge(ownRipple);
        if (mode.launchLock > 0 && age < mode.launchLock) {
          title = '准备中';
        } else if (age < mode.ignoreRadius / Math.max(1, mode.phases[0].speed)) {
          title = '扩散中';
        } else {
          title = '扩散中';
        }
        emitLabel = '扩散中';
      } else if (ownRipple.status === 'contacted') {
        title = '等待回应';
        emitLabel = '等待回应';
      } else if (ownRipple.status === 'matched') {
        title = '配对成功';
      } else if (ownRipple.status === 'stopped') {
        title = '已停止';
        emitLabel = '再次投波';
      } else {
        title = '已结束';
        emitLabel = '再次投波';
      }
    }

    if (cooldown > 0) {
      emitLabel = '稍后再试';
    }

    ui.waveEyebrow.textContent = eyebrow;
    ui.waveState.textContent = title;
    ui.emitBtn.textContent = emitLabel;
    ui.emitBtn.disabled = !canEmit;
    ui.waitingCard.classList.toggle('hidden', !(ownRipple && ownRipple.status === 'active' && !hasContact));
    if (ownRipple && ownRipple.status !== 'active') ui.waitingCard.classList.add('hidden');
    requestAnimationFrame(syncSheetOffset);
  }

  function buildModeTabs() {
    const entries = Object.values(state.modes);
    if (!entries.length) return;
    const activeMode = state.mode;
    ui.modeTabs.innerHTML = '';
    entries.forEach(mode => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mode-tab' + (mode.id === activeMode ? ' active' : '');
      button.textContent = mode.name;
      button.addEventListener('click', () => {
        if (mode.id === state.mode || !state.connected || state.contact) return;
        state.shouldRecenter = true;
        send({ type: 'setMode', mode: mode.id });
      });
      ui.modeTabs.appendChild(button);
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 3200);
  }

  function addLog(message) {
    const line = document.createElement('div');
    const time = new Date();
    line.textContent = String(time.getHours()).padStart(2, '0') + ':' +
      String(time.getMinutes()).padStart(2, '0') + '  ' + message;
    ui.log.prepend(line);
    logCount++;
    while (ui.log.children.length > 8) ui.log.lastElementChild.remove();
    if (logCount > 40) logCount = 40;
  }

  function clearContactTimer() {
    if (contactTickTimer) {
      clearInterval(contactTickTimer);
      contactTickTimer = null;
    }
  }

  function updateContactCountdown() {
    if (!state.contact) return;
    const remaining = Math.max(0, state.contact.expiresAtWall - Date.now());
    if (remaining <= 0) {
      ui.contactCountdown.textContent = '正在结束…';
    } else {
      const seconds = Math.ceil(remaining / 1000);
      ui.contactCountdown.textContent = seconds + ' 秒内选择';
    }
  }

  function clearContactScene() {
    if (contactLayer) contactLayer.clearLayers();
  }

  function drawMeetingMarker(position, label, matched) {
    if (!contactLayer) return;
    const className = matched ? 'match-bloom' : 'contact-bloom';
    const html = '<div class="' + className + '">' +
      '<i></i><i></i><span>' + label + '</span></div>';
    window.L.marker(position, {
      icon: window.L.divIcon({
        className: '',
        html,
        iconSize: [82, 82],
        iconAnchor: [41, 41]
      }),
      interactive: false,
      zIndexOffset: 1200
    }).addTo(contactLayer);
  }

  function drawContactScene(contact) {
    if (!map || !contact || !contactLayer) return;
    clearContactScene();

    const partner = contact.partner;
    if (partner && Number.isFinite(partner.x) && Number.isFinite(partner.y)) {
      const partnerPosition = toMapLatLng(partner.x, partner.y);
      const partnerMode = state.modes[contact.mode] || state.modeConfig;
      const partnerRadius = Math.max(1, partner.rippleRadius || contact.distance / 2);
      const partnerColor = rippleColor(partnerMode, partnerRadius);
      window.L.circle(partnerPosition, {
        radius: partnerRadius,
        color: partnerColor,
        weight: 1.8,
        opacity: 0.72,
        dashArray: '8 9',
        lineCap: 'round',
        fillColor: partnerColor,
        fillOpacity: 0.018,
        className: 'partner-wave-ring',
        interactive: false
      }).addTo(contactLayer);
    }

    if (contact.contact) {
      drawMeetingMarker(toMapLatLng(contact.contact.x, contact.contact.y), '相遇', false);
    }
  }

  function showContact(contact) {
    closeTowerGame();
    setSpeedMenu(false);
    state.contact = contact;
    state.contactChoice = null;
    ui.contactName.textContent = contact.partner.name;
    ui.contactAvatar.textContent = contact.partner.isBot ? 'TA' : '缘';
    ui.contactDistance.textContent = formatDistance(contact.distance);
    ui.contactTime.textContent = formatDuration(contact.travelTime);
    ui.contactWait.classList.add('hidden');
    ui.contactCountdown.classList.remove('hidden');
    ui.skipContact.disabled = false;
    ui.acceptContact.disabled = false;
    ui.skipContact.textContent = '继续扩散';
    ui.acceptContact.textContent = '认识 TA';
    ui.contactOverlay.classList.remove('hidden');
    drawContactScene(contact);
    clearContactTimer();
    updateContactCountdown();
    contactTickTimer = setInterval(updateContactCountdown, 300);
    addLog('相遇：' + contact.partner.name + ' · ' + formatDistance(contact.distance));
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  }

  function chooseContact(decision) {
    if (!state.contact || state.contactChoice) return;
    state.contactChoice = decision;
    ui.skipContact.disabled = true;
    ui.acceptContact.disabled = true;
    ui.contactWait.classList.remove('hidden');
    ui.contactWait.textContent = decision === 'accept'
      ? '已提交，等待对方。'
      : '已选择继续，等待对方。';
    send({
      type: 'respondContact',
      contactId: state.contact.contactId,
      decision
    });
  }

  function hideContact() {
    clearContactTimer();
    ui.contactOverlay.classList.add('hidden');
    ui.contactWait.classList.add('hidden');
    clearContactScene();
    state.contact = null;
    state.contactChoice = null;
  }

  function handleContactResult(message) {
    if (!message) return;
    hideContact();
    if (message.outcome === 'continue') {
      addLog('双方选择继续');
    } else if (message.outcome === 'missed') {
      const text = message.reason === 'timeout'
        ? '响应超时，波已停止。'
        : message.reason === 'disconnect'
          ? '对方已断开，波已停止。'
          : '选择不一致，波已停止。';
      showToast(text);
      addLog(text);
    }
  }

  function showMatch(match) {
    hideContact();
    state.lastMatch = match;
    ui.matchName.textContent = match.partner.name;
    ui.matchDistance.textContent = formatDistance(match.distance);
    ui.matchTime.textContent = formatDuration(match.travelTime);
    ui.matchNote.textContent = match.partner.isBot
      ? '演示配对。'
      : '双方已接受。';
    ui.matchOverlay.classList.remove('hidden');
    addLog('配对成功：' + match.partner.name);
    if (navigator.vibrate) navigator.vibrate([60, 50, 80]);

    if (map && match.contact) {
      clearContactScene();
      const position = toMapLatLng(match.contact.x, match.contact.y);
      drawMeetingMarker(position, '对上', true);
    }
  }

  function send(payload) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(payload));
    }
  }

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(protocol + '://' + location.host);
    state.ws = socket;

    socket.addEventListener('open', () => {
      state.connected = true;
      updateUI();
    });

    socket.addEventListener('message', event => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }

      if (message.type === 'welcome') {
        state.me = message.me;
        state.mode = message.me.mode;
        state.simNow = message.simNow;
        state.timeScale = message.timeScale;
        state.onlineCount = message.onlineCount || 0;
        state.receivedAt = performance.now();
        state.modes = {};
        for (const mode of message.modes) state.modes[mode.id] = mode;
        state.modeConfig = state.modes[state.mode];
        state.geoOrigin = message.geoOrigin || null;
        state.debug = !!message.debug;
        updateUI();
        if (!state.mapInitialized) centerOnUser(false);
        addLog('已连接');
      }

      if (message.type === 'state') {
        const previousMode = state.mode;
        state.me = message.me;
        state.mode = message.me.mode;
        state.modeConfig = message.mode;
        state.users = message.users || [];
        state.geoOrigin = message.geoOrigin || null;
        state.simNow = message.simNow;
        state.timeScale = message.timeScale;
        state.onlineCount = message.onlineCount;
        state.receivedAt = performance.now();
        if (previousMode !== state.mode) state.shouldRecenter = true;
        if (state.shouldRecenter) centerOnUser(true);
        updateUI();
        renderOtherMarkers();
      }

      if (message.type === 'contact') {
        showContact(message.contact);
        updateUI();
      }

      if (message.type === 'contactResult') {
        handleContactResult(message);
        updateUI();
      }

      if (message.type === 'match') {
        showMatch(message.match);
        updateUI();
      }

      if (message.type === 'info') {
        addLog(message.message);
      }

      if (message.type === 'error') {
        addLog(message.message);
        showToast(message.message);
      }
    });

    socket.addEventListener('close', () => {
      state.connected = false;
      updateUI();
      addLog('连接断开，重连中');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 1200);
    });

    socket.addEventListener('error', () => {
      state.connected = false;
      updateUI();
    });
  }

  function openDrawer() {
    ui.drawer.classList.remove('hidden');
    ui.drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    ui.drawer.classList.add('hidden');
    ui.drawer.setAttribute('aria-hidden', 'true');
  }

  function switchScreen(next) {
    if (next !== 'match' && next !== 'profile') return;
    if (state.screen === next) return;
    state.screen = next;
    const profileActive = next === 'profile';
    ui.profileScreen.classList.toggle('is-active', profileActive);
    ui.profileScreen.setAttribute('aria-hidden', String(!profileActive));
    ui.profileScreen.inert = !profileActive;
    ui.bottomNav.querySelectorAll('[data-screen]').forEach(button => {
      const active = button.dataset.screen === next;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (profileActive) {
      closeDrawer();
      closeTowerGame();
      setSpeedMenu(false);
    } else if (map) {
      setTimeout(() => map.invalidateSize(), 380);
    }
  }

  function startGeolocation() {
    if (!navigator.geolocation) {
      showToast('当前浏览器不支持定位，请使用地图选点。');
      return;
    }
    const label = ui.geoBtn.querySelector('span');
    ui.geoBtn.disabled = true;
    if (label) label.textContent = '定位中';
    navigator.geolocation.getCurrentPosition(
      position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        send({ type: 'setGeo', latitude, longitude });
        ensureTileLayer();
        if (map) map.setView(wgs84ToGcj02(latitude, longitude), 17);
        state.shouldRecenter = false;
        ui.geoBtn.disabled = false;
        if (label) label.textContent = '定位';
        showToast('定位成功。');
      },
      error => {
        const reasons = { 1: '定位权限没有打开', 2: '暂时找不到你的位置', 3: '定位超时了' };
        showToast((reasons[error.code] || '定位失败') + '，请使用地图选点。');
        ui.geoBtn.disabled = false;
        if (label) label.textContent = '定位';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function fitWave() {
    if (!map || !state.me) return;
    const center = toMapLatLng(state.me.x, state.me.y);
    const ownRipple = state.me.ripple;
    const sheetHeight = ui.sheet ? ui.sheet.getBoundingClientRect().height : 0;
    const padding = {
      paddingTopLeft: [22, 20],
      paddingBottomRight: [22, Math.round(sheetHeight) + 20],
      maxZoom: 17,
      duration: 0.9
    };
    if (ownRipple && state.modeConfig) {
      const radius = Math.max(120, radiusAt(state.modeConfig, rippleAge(ownRipple)));
      const bounds = window.L.latLng(center).toBounds(radius * 2.08);
      map.flyToBounds(bounds, padding);
    } else {
      const bounds = window.L.latLng(center).toBounds(2600);
      map.flyToBounds(bounds, { ...padding, maxZoom: 16 });
    }
  }

  function toggleAdjustMode() {
    if (!state.me) return;
    if (state.contact) {
      showToast('先回应眼前的相遇。');
      return;
    }
    state.adjustMode = !state.adjustMode;
    ui.adjustBtn.textContent = state.adjustMode ? '点击地图选择位置' : '在地图上选择位置';
    ui.adjustBtn.classList.toggle('is-active', state.adjustMode);
    if (state.adjustMode) {
      closeDrawer();
    }
  }

  ui.emitBtn.addEventListener('click', () => send({ type: 'emit' }));
  ui.geoBtn.addEventListener('click', startGeolocation);
  ui.botBtn.addEventListener('click', () => send({ type: 'spawnBot' }));
  ui.detailsBtn.addEventListener('click', openDrawer);
  ui.moreBtn.addEventListener('click', openDrawer);
  ui.profileSettings.addEventListener('click', openDrawer);
  ui.bottomNav.addEventListener('click', event => {
    const button = event.target.closest('[data-screen]');
    if (button) switchScreen(button.dataset.screen);
  });
  ui.closeDrawer.addEventListener('click', closeDrawer);
  ui.drawerBackdrop.addEventListener('click', closeDrawer);
  ui.adjustBtn.addEventListener('click', toggleAdjustMode);
  ui.resetBtn.addEventListener('click', () => send({ type: 'reset' }));
  ui.debugToggle.addEventListener('change', event => {
    state.debug = event.target.checked;
    send({ type: 'setDebug', value: state.debug });
    renderOtherMarkers();
  });
  ui.zoomIn.addEventListener('click', () => { if (map) map.zoomIn(); });
  ui.zoomOut.addEventListener('click', () => { if (map) map.zoomOut(); });
  ui.fitWave.addEventListener('click', fitWave);
  ui.waveFeed.addEventListener('click', fitWave);
  ui.recenter.addEventListener('click', () => centerOnUser(true));
  ui.speedBtn.addEventListener('click', event => {
    event.stopPropagation();
    setSpeedMenu(ui.speedMenu.classList.contains('hidden'));
  });
  ui.speedMenu.addEventListener('click', event => {
    const button = event.target.closest('[data-speed]');
    if (button) chooseSpeed(button.dataset.speed);
  });
  ui.towerBtn.addEventListener('click', () => {
    if (ui.towerGame.classList.contains('hidden')) {
      openTowerGame();
    } else {
      closeTowerGame();
    }
  });
  ui.towerClose.addEventListener('click', closeTowerGame);
  ui.towerDrop.addEventListener('click', dropTowerBlock);
  ui.towerCanvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    dropTowerBlock();
  });
  ui.skipContact.addEventListener('click', () => chooseContact('skip'));
  ui.acceptContact.addEventListener('click', () => chooseContact('accept'));
  ui.closeMatch.addEventListener('click', () => ui.matchOverlay.classList.add('hidden'));
  ui.nextPrompt.addEventListener('click', nextPrompt);
  ui.restartPrompt.addEventListener('click', restartPrompt);

  let screenPointer = null;
  function isScreenGestureExcluded(target) {
    return Boolean(target.closest('button, a, input, textarea, select, label, .overlay, .drawer, .toast, .tower-game'));
  }
  function recordScreenPointer(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isScreenGestureExcluded(event.target)) return;
    const onMap = Boolean(event.target.closest('#map, .leaflet-container'));
    if (onMap && event.pointerType === 'mouse') return;
    screenPointer = {
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
      view: onMap && map ? { center: map.getCenter(), zoom: map.getZoom() } : null
    };
  }
  function finishScreenPointer(event) {
    if (!screenPointer) return;
    const start = screenPointer;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = performance.now() - start.at;
    screenPointer = null;
    if (elapsed > 800) return;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    if (dx < 0 && state.screen === 'match') {
      if (start.view && map) {
        const view = start.view;
        requestAnimationFrame(() => map.setView(view.center, view.zoom, { animate: false }));
      }
      switchScreen('profile');
    } else if (dx > 0 && state.screen === 'profile') {
      switchScreen('match');
    }
  }
  ui.app.addEventListener('pointerdown', recordScreenPointer, true);
  ui.app.addEventListener('pointerup', finishScreenPointer, true);
  ui.app.addEventListener('pointercancel', () => {
    screenPointer = null;
  }, true);
  let screenTouch = null;
  ui.app.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || isScreenGestureExcluded(event.target)) return;
    const touch = event.touches[0];
    screenTouch = { x: touch.clientX, y: touch.clientY, at: performance.now() };
  }, { capture: true, passive: true });
  ui.app.addEventListener('touchmove', event => {
    if (!screenTouch || event.touches.length !== 1) return;
    if (state.screen !== 'match' && state.screen !== 'profile') return;
    const touch = event.touches[0];
    const dx = touch.clientX - screenTouch.x;
    const dy = touch.clientY - screenTouch.y;
    const elapsed = performance.now() - screenTouch.at;
    if (Math.abs(dx) < Math.abs(dy) * 1.1) return;
    const backward = state.screen === 'profile' && dx > 8;
    const forward = state.screen === 'match' && dx < -8 && elapsed < 500;
    if (!backward && !forward) return;
    if (event.cancelable) event.preventDefault();
    if (Math.abs(dx) < 60 || elapsed > 800) return;
    const next = state.screen === 'match' ? 'profile' : 'match';
    screenTouch = null;
    screenPointer = null;
    switchScreen(next);
  }, { capture: true, passive: false });
  ui.app.addEventListener('touchend', () => {
    screenTouch = null;
  }, true);
  ui.app.addEventListener('touchcancel', () => {
    screenTouch = null;
  }, true);

  document.addEventListener('click', event => {
    if (!ui.speedBtn.contains(event.target) && !ui.speedMenu.contains(event.target)) {
      setSpeedMenu(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (ui.towerGame.classList.contains('hidden')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      dropTowerBlock();
    } else if (event.key === 'Escape') {
      closeTowerGame();
    }
  });

  window.addEventListener('resize', () => {
    if (map) setTimeout(() => map.invalidateSize(), 80);
    resizeWaveCanvas();
    syncSheetOffset();
  });

  if (window.ResizeObserver && ui.sheet) {
    new ResizeObserver(syncSheetOffset).observe(ui.sheet);
  }

  initMap();
  initWaveCanvas();
  initTowerGame();
  createPromptButtons();
  updateSpeedUI();
  connect();
  requestAnimationFrame(syncSheetOffset);
  requestAnimationFrame(function frame() {
    renderMapFrame();
    requestAnimationFrame(frame);
  });
})();

