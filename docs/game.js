'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const W = 960, H = 480, GROUND = 380, GRAVITY = 1150;
  const scenery = createBandoriScenery(ctx, rect, label);
  const DURATION = 600, SCORE_FOR_MAX_SPEED = 16000;
  const START_SPEED = 480, TOP_SPEED = 1040, PLAYER_DRAW_HEIGHT = 86;
  const art = new Image(), runArt = new Image();
  let artReady = false, spriteSheet, runSheet, runDistance = 0;
  $('start').disabled = true; $('start').textContent = '유키나 준비 중…';
  art.onload = () => {
    try { spriteSheet = prepareYukinaTexture(art); finishLoading(); }
    catch { art.onerror(); }
  };
  art.onerror = () => { $('start').textContent = '이미지를 불러오지 못했어요'; notify('게임 폴더의 assets 파일을 확인한 뒤 새로고침하세요.'); };
  // A data URL also permits texture processing when index.html is opened locally.
  art.src = globalThis.YUKINA_SPRITE_DATA || '';
  runArt.onload = () => { try { runSheet = prepareYukinaTexture(runArt, true); finishLoading(); } catch { art.onerror(); } };
  runArt.onerror = art.onerror;
  runArt.src = globalThis.YUKINA_RUN_DATA || '';
  function finishLoading() { if (!spriteSheet || !runSheet) return; artReady = true; $('start').disabled = false; $('start').innerHTML = '달리기 시작 <span>▶</span>'; }
  let mode = 'ready', p, platforms = [], items = [], obstacles = [], particles = [];
  let score = 0, cookies = 0, health = 3, elapsed = 0, best = 0;
  let camera = 0, seed = 42, generatedEnd = 0, segment = 0;
  let invulnerable = 0, toastTime = 0, finishRunway = false;
  let generatedY = GROUND, director = createCourseDirector(), standingOn = null;
  let jumpBuffer = 0, coyoteTime = 0;
  let jumpGlow = 0;
  const STREAK_STEPS = [30, 120, 300, 700];
  const STREAK_MULTIPLIERS = [1, 1.5, 2, 2.5, 3];
  const STREAK_NAMES = ['준비', '빛', '별빛', '무지개', '오로라'];
  const STREAK_COLORS = ['#9b8aa9', '#9de5fa', '#dfb5fa', '#f5c780', '#a6f2d5'];
  let streak = 0, streakTier = 0, streakFlash = 0, trailClock = 0, streakTrail = [];
  const activeInputs = new Set(), JUMP_BUFFER = .14, COYOTE_TIME = .1;
  let visualTime = 0, previousFrame = null, accumulator = 0, hudTime = 0;
  let muted = false, audio = null, audioTick = -1;
  try { best = Number(localStorage.getItem('yukina-solo-best') || 0) || 0; } catch {}
  $('best').textContent = String(best).padStart(6, '0');
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // Front-load the acceleration, then keep increasing smoothly for all ten minutes.
  const targetSpeed = (seconds, points) => {
    const t = Math.min(DURATION, Math.max(0, seconds));
    const ramp = .80 * (1 - Math.exp(-t / 40)) / (1 - Math.exp(-DURATION / 40)) + .20 * t / DURATION;
    return START_SPEED + (TOP_SPEED - START_SPEED - 40) * ramp + 40 * Math.min(1, Math.max(0, points) / SCORE_FOR_MAX_SPEED);
  };
  const baseSpeed = () => targetSpeed(elapsed, score);
  const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); }
  function label(value, x, y, size, color, align = 'left') { ctx.fillStyle = color; ctx.font = `${size}px "Space Grotesk", "Noto Sans KR", sans-serif`; ctx.textAlign = align; ctx.fillText(value, Math.round(x), Math.round(y)); }
  function sprite(x, feet, height, frame, running = false) {
    if (!artReady) return;
    const texture = running ? runSheet : spriteSheet;
    const cellW = texture.width / 4, cellH = texture.height / 2;
    // Register both rows to one face position and one contact-foot baseline.
    const offsetX = running ? [0, 0, 0, -8, 42, 0, -2, -8][frame] * height / cellH : 0;
    const offsetY = running ? [0, -3, 1, -1, 26, 27, 24, 23][frame] * height / cellH : 0;
    ctx.drawImage(texture, (frame % 4) * cellW, Math.floor(frame / 4) * cellH, cellW, cellH, Math.round(x - height * .375 + offsetX), Math.round(feet - height + offsetY), Math.round(height * .75), height);
  }
  function cookie(x, y, cat) {
    rect(x - 6, y - 8, 12, 16, '#af7e52'); rect(x - 8, y - 5, 16, 10, '#af7e52');
    rect(x - 6, y - 6, 12, 12, '#edc38a'); rect(x - 8, y - 3, 16, 6, '#edc38a');
    if (cat) { rect(x - 7, y - 11, 4, 8, '#edc38a'); rect(x + 3, y - 11, 4, 8, '#edc38a'); rect(x - 4, y - 2, 2, 2, '#79583f'); rect(x + 3, y - 2, 2, 2, '#79583f'); rect(x, y + 2, 2, 2, '#a96755'); }
    else for (const [a, b] of [[-3, -3], [3, 2], [-4, 4]]) rect(x + a, y + b, 3, 3, '#8b6249');
  }
  function tone(frequency, duration = .08, volume = .025) {
    if (muted || !audio) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
  }
  function enableAudio() { try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {} }
  function notify(message) { $('toast').textContent = message; $('toast').classList.remove('hidden'); toastTime = 3; }
  function burst(x, y, color) { for (let i = 0; i < 5; i++) particles.push({ x, y, vx: (Math.random() - .5) * 90, vy: -Math.random() * 100, life: .4, color }); if (particles.length > 30) particles.splice(0, particles.length - 30); }
  function spawnCourse() {
    while (!finishRunway && generatedEnd < p.x + W * 2) {
      const arrival = elapsed + Math.max(0, generatedEnd - p.x) / baseSpeed() + 2;
      const pattern = nextCourseEncounter(director, random, targetSpeed(arrival, score), generatedY);
      for (const roof of pattern.roofs) {
        segment++;
        const fromY = generatedY, gap = roof.gap;
        const nextX = generatedEnd + gap, width = roof.width, y = roof.y;
        const platform = { x: nextX, w: width, y, baseY: y, pattern: pattern.id, surface: roof.surface, action: roof.action, encounter: segment, motion: roof.motion, stairStep: roof.stairStep, stairFinish: roof.stairFinish };
        platforms.push(platform);
        const trailLength = gap;
        const gapCookies = Math.max(3, Math.ceil(trailLength / 55));
        for (let i = 0; i < gapCookies; i++) {
          const t = (i + .5) / gapCookies;
          const arc = roof.doubleGap ? Math.sin(t * Math.PI) * 155 : Math.sin(t * Math.PI) * 60;
          const cookieY = fromY + (y - fromY) * t - 68 - arc;
          items.push({ x: generatedEnd + trailLength * t, y: Math.max(45, cookieY), cat: roof.doubleGap && i % 3 === 1 });
        }
        for (const offset of roof.rollers) obstacles.push({ x: nextX + offset, y: y - 48, w: 48, h: 48,
          kind: 'rolling', platform, vx: 0, vy: 0, active: false, rotation: 0 });
        for (const offset of roof.amps || []) addObstacle(nextX + offset, y, 48, 48, "amp");
        for (const offset of roof.cases || []) addObstacle(nextX + offset, y, 94, 30, "case");
        addRoofCookies(nextX, roof, platform);
        for (const lane of roof.lanes) {
          const laneX = nextX + lane.offset, laneY = y - lane.rise;
          platforms.push({ x: laneX, w: lane.width, y: laneY, pattern: pattern.id, surface: "garden", optional: true });
          for (let x = laneX + 40; x < laneX + lane.width - 25; x += 55) items.push({ x, y: laneY - 44, cat: true });
        }
        generatedEnd = nextX + width; generatedY = y;
      }
    }
  }
  function addObstacle(x, floor, w, h, kind) {
    obstacles.push({ x, y: floor - h, w, h, kind });
  }
  function addRoofCookies(startX, roof, platform) {
    const gear = [...roof.amps.map(x => x + 24), ...roof.cases.map(x => x + 47)];
    const trailEnd = 45;
    for (let offset = trailEnd; offset < roof.width - 25; offset += roof.bonus ? 55 : 75) {
      if (roof.rollers.some(x => Math.abs(offset - x - 24) < 70)) continue;
      let lift = roof.cookieLine === 'wave' ? Math.sin(offset / 135) * 12 : 0;
      if (roof.cookieLine === 'arches') lift = Math.pow(Math.sin(offset / 520 * Math.PI), 2) * 85;
      // Reward the jump over equipment instead of burying a cookie inside it.
      let overGear = false;
      for (const center of gear) {
        const d = Math.abs(offset - center);
        if (d < 250) { lift = Math.max(lift, (1 - (d / 250) ** 2) * 112); overGear = true; }
      }
      const item = { x: startX + offset, y: roof.y - 44 - lift, cat: overGear && lift > 100 || (roof.bonus ? random() < .3 : random() < .08) };
      if (platform.motion) { item.platform = platform; item.offsetY = -44 - lift; }
      items.push(item);
    }
  }
  function resetWorld(courseSeed) {
    seed = courseSeed >>> 0; segment = 0;
    p = { x: 160, y: GROUND - 64, w: 28, h: 64, vx: baseSpeed(), vy: 0, onGround: true, jumpsUsed: 0 };
    platforms = [{ x: -200, w: 1400, y: GROUND }]; generatedEnd = 1200;
    generatedY = GROUND; director = createCourseDirector(); standingOn = null;
    items = []; for (let x = 330; x < 1170; x += 75) items.push({ x, y: GROUND - 44, cat: x === 630 });
    obstacles = []; particles = [];
    streak = 0; streakTier = 0; streakFlash = 0; trailClock = 0; streakTrail = [];
    invulnerable = 0; finishRunway = false; camera = 0; audioTick = -1; accumulator = 0; runDistance = 0;
    jumpBuffer = 0; coyoteTime = COYOTE_TIME; activeInputs.clear(); jumpGlow = 0;
    spawnCourse();
  }
  function init(courseSeed) { score = 0; cookies = 0; elapsed = 0; health = 3; resetWorld(Number.isInteger(courseSeed) ? courseSeed : typeof globalThis.__YUKINA_TEST__ !== 'undefined' ? 42 : Math.floor(Math.random() * 4294967296)); updateHUD(); }
  function start(courseSeed) { if (!artReady && typeof globalThis.__YUKINA_TEST__ === 'undefined') return; init(courseSeed); mode = 'playing'; hideOverlays(); enableAudio(); notify('쿠키 +10 · 고양이 쿠키 +30 — 점수가 쌓일수록 빨라집니다.'); }
  function hideOverlays() { document.activeElement?.blur?.(); $('startOverlay').classList.add('hidden'); $('resultOverlay').classList.add('hidden'); $('pause').textContent = 'Ⅱ'; $('pause').setAttribute('aria-label', '일시 정지'); }
  function updateHUD() {
    $('score').textContent = String(score).padStart(6, '0');
    $('speed').textContent = `×${(baseSpeed() / START_SPEED).toFixed(2)}`;
    $('hearts').textContent = '♥ '.repeat(health) + '♡ '.repeat(3 - health);
    $('hearts').setAttribute('aria-label', `남은 기회 ${health}`);
    $('clock').innerHTML = `${formatTime(elapsed)} <small>/ ${formatTime(DURATION)}</small>`;
    $('cookies').textContent = cookies;
    $('streak').textContent = `✦ ${streakTier ? STREAK_NAMES[streakTier] + ' ' : ''}${streak} · ×${STREAK_MULTIPLIERS[streakTier]}`;
    $('streak').style.color = STREAK_COLORS[streakTier];
    $('streak').title = `피해 없이 쿠키 ${streak}개 · 고양이 ${streakTier}마리 · 점수 ×${STREAK_MULTIPLIERS[streakTier]}` + (streakTier < 4 ? ` · ${STREAK_STEPS[streakTier]}개에 다음 효과` : ' · 최고 단계');
    $('streak').setAttribute('aria-label', `스트릭 ${streak}개, ${STREAK_NAMES[streakTier]} 단계`);
    $('progressFill').style.width = `${elapsed / DURATION * 100}%`;
    $('meter').setAttribute('aria-valuenow', Math.round(elapsed / DURATION * 100));
  }
  function endRun(clear) {
    mode = clear ? 'clear' : 'over'; jumpBuffer = 0; activeInputs.clear();
    if (score > best) { best = score; try { localStorage.setItem('yukina-solo-best', String(best)); } catch {} $('best').textContent = String(best).padStart(6, '0'); }
    $('resultTag').textContent = clear ? 'FINAL LIVE · CLEAR' : 'ONE MORE TAKE';
    $('resultTitle').textContent = clear ? '이제, 나의 무대로.' : '다시, 완벽한 한 걸음.';
    $('resultCopy').textContent = clear ? '10분의 밤길을 모두 건넜습니다.' : '잠깐 숨을 고르고, 처음부터 다시 도전해요.';
    $('resultStats').innerHTML = `<div><strong>${score.toLocaleString()}</strong><span>점수</span></div><div><strong>${cookies}</strong><span>먹은 쿠키</span></div><div><strong>${formatTime(elapsed)}</strong><span>코스 진행</span></div>`;
    $('resume').classList.add('hidden');
    $('restart').className = 'primary'; $('restart').textContent = clear ? '앙코르 · 다시 달리기' : '처음부터 다시';
    $('resultOverlay').classList.remove('hidden'); updateHUD(); tone(clear ? 880 : 196, .3);
  }
  function pause() {
    if (mode === 'playing') {
      cancelInputs(); mode = 'paused'; $('resultTag').textContent = 'INTERMISSION'; $('resultTitle').textContent = '잠깐, 숨을 고르고.';
      $('resultCopy').textContent = '일시 정지 중에는 코스 시간이 흐르지 않습니다.'; $('resultStats').innerHTML = '';
      $('resume').classList.remove('hidden'); $('resume').textContent = '계속 달리기'; $('restart').className = 'secondary'; $('restart').textContent = '처음부터 다시';
      $('resultOverlay').classList.remove('hidden'); $('pause').textContent = '▶'; $('pause').setAttribute('aria-label', '계속 달리기');
    } else if (mode === 'paused') { mode = 'playing'; hideOverlays(); }
  }
  function action() {
    if (mode === 'ready') { start(); return; }
    if (mode !== 'playing') return;
    if (p.onGround || coyoteTime > 0) jump(false);
    else if (p.jumpsUsed < 2) jump(true);
    else jumpBuffer = JUMP_BUFFER;
  }
  function jump(air = false) {
    p.vy = air ? -510 : -550; p.onGround = false; standingOn = null;
    p.jumpsUsed = air ? 2 : 1; coyoteTime = 0; jumpBuffer = 0;
    if (air) { jumpGlow = .25; burst(p.x + 14, p.y + p.h, '#b7c9fa'); }
    tone(air ? 740 : 440);
  }
  function pressInput(source) { if (activeInputs.has(source)) return; activeInputs.add(source); if (activeInputs.size === 1) action(); }
  function releaseInput(source) { activeInputs.delete(source); }
  function cancelInputs() { activeInputs.clear(); jumpBuffer = 0; }
  function damage(fall = false) {
    if (mode !== 'playing') return;
    if (!fall && invulnerable > 0) return;
    streak = 0; streakTier = 0; streakFlash = 0; streakTrail = []; trailClock = 0;
    health--; cancelInputs(); coyoteTime = 0; invulnerable = 2; tone(146, .16);
    if (health <= 0) { endRun(false); return; }
    if (fall) {
      const land = platforms.find(q => q.x + q.w > p.x + 100);
      if (land) { p.x = Math.max(land.x + 65, Math.min(p.x, land.x + land.w - 100)); p.y = land.y - p.h; p.vy = 0; p.vx = baseSpeed(); p.onGround = true; p.jumpsUsed = 0; }
    } else { p.vy = -270; p.onGround = false; }
    updateHUD();
  }
  function collect(item) {
    if (item.got || mode !== 'playing') return;
    item.got = true; cookies++; streak++;
    // The cookie that reaches a threshold receives the newly unlocked multiplier.
    const tier = STREAK_STEPS.filter(threshold => streak >= threshold).length;
    score += (item.cat ? 30 : 10) * STREAK_MULTIPLIERS[tier];
    if (tier > streakTier) { streakTier = tier; streakFlash = .7; tone(880 + tier * 110, .16, .018); updateHUD(); }
    burst(item.x, item.y, '#edc38a'); tone(item.cat ? 784 : 659, .045, .012);
  }
  function updateStreakTrail(dt) {
    streakFlash = Math.max(0, streakFlash - dt);
    for (const node of streakTrail) node.age += dt;
    streakTrail = streakTrail.filter(node => node.age < .4 && node.x > p.x - 240);
    trailClock += dt;
    if (trailClock >= 1 / 60) {
      trailClock %= 1 / 60;
      streakTrail.push({ x: p.x - 4, y: p.y + 43, airborne: !p.onGround, age: 0 });
      if (streakTrail.length > 26) streakTrail.shift();
    }
  }
  function followingCats() {
    const cats = [];
    for (let index = 0; index < streakTier; index++) {
      const x = p.x - 48 - index * 39;
      for (let i = 1; i < streakTrail.length; i++) {
        const a = streakTrail[i - 1], b = streakTrail[i];
        if (a.x <= x && b.x >= x) {
          const t = (x - a.x) / Math.max(.001, b.x - a.x);
          cats.push({ x, feet: a.y + (b.y - a.y) * t + 21, index, airborne: a.airborne || b.airborne });
          break;
        }
      }
    }
    return cats;
  }
  function drawStreak() {
    if (!streakTier || streakTrail.length < 2) return;
    const rainbow = ['#ff849e', '#ffba7c', '#f9e895', '#99e3b5', '#89cffa', '#c5a6f4'];
    const colors = streakTier >= 3 ? rainbow : streakTier === 2 ? ['#afbdff', '#d4adf7', '#f3c4e8'] : ['#9dddfa'];
    const lifetime = [.0, .16, .23, .30, .39][streakTier];
    ctx.save();
    for (let i = 1; i < streakTrail.length; i++) {
      const a = streakTrail[i - 1], b = streakTrail[i];
      if (a.age > lifetime) continue;
      const fade = 1 - a.age / lifetime, dx = b.x - a.x;
      ctx.globalAlpha = fade * .65;
      for (let offset = 0; offset < dx; offset += 4) {
        const x = a.x + offset - camera;
        if (x < -4 || x > p.x - camera - 4) continue;
        const y = a.y + (b.y - a.y) * offset / Math.max(1, dx);
        for (let row = 0; row < colors.length; row++) rect(x, y + row * 3 - colors.length * 1.5, 4, 3, colors[row]);
      }
      if (i % 4 === 0 && streakTier >= 2) {
        const x = a.x - camera, y = a.y - 14 - Math.sin(elapsed * 5 + i) * 5;
        ctx.globalAlpha = fade * .8;
        rect(x - 3, y, 7, 2, '#fff0ca'); rect(x, y - 3, 2, 8, '#fff0ca');
      }
      if (streakTier === 4 && i % 2 === 0) {
        ctx.globalAlpha = fade * .45;
        rect(a.x - camera, a.y + 14 + Math.sin(elapsed * 4 + i) * 5, 5, 3, '#acffe3');
      }
    }
    if (streakFlash > 0) {
      ctx.globalAlpha = streakFlash / .7;
      const x = p.x - camera - 12, y = p.y + 20;
      rect(x - 7, y, 16, 3, '#fff0c9'); rect(x, y - 7, 3, 16, '#fff0c9');
    }
    ctx.restore();
  }
  function movePlatforms() {
    for (const q of platforms) {
      q.previousY = q.y;
      if (q.motion) q.y = q.baseY + Math.sin(elapsed * q.motion.rate + q.motion.phase) * q.motion.amplitude;
      if (p.onGround && standingOn === q) p.y += q.y - q.previousY;
    }
    for (const item of items) if (item.platform) item.y = item.platform.y + item.offsetY;
  }
  function update(dt) {
    if (mode !== 'playing') return;
    elapsed = Math.min(DURATION, elapsed + dt);
    if (!finishRunway && elapsed >= DURATION - 12) {
      // Append the finish ahead of generated scenery. Nothing visible is deleted or replaced.
      finishRunway = true; platforms.push({ x: generatedEnd, w: 20000, y: generatedY, surface: 'stage' });
      notify('마지막 무대가 눈앞에.');
    }
    invulnerable = Math.max(0, invulnerable - dt); toastTime -= dt; jumpGlow = Math.max(0, jumpGlow - dt);
    jumpBuffer = Math.max(0, jumpBuffer - dt);
    coyoteTime = p.onGround ? COYOTE_TIME : Math.max(0, coyoteTime - dt);
    movePlatforms();
    for (const o of obstacles) if (o.kind === 'rolling' && updateRollingObstacle(o, p.x, baseSpeed(), dt)) tone(180, .12, .018);
    if (toastTime <= 0) $('toast').classList.add('hidden');
    const oldBottom = p.y + p.h;
    if (p.onGround) runDistance += p.vx * dt;
    p.vy += GRAVITY * dt;
    p.vx += (baseSpeed() - p.vx) * Math.min(1, dt * (p.onGround ? 6 : .8));
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y < 16) { p.y = 16; p.vy = Math.max(0, p.vy); }
    p.onGround = false; standingOn = null;
    for (const q of platforms) if (p.x + p.w > q.x && p.x < q.x + q.w && oldBottom <= (q.previousY ?? q.y) + 4 && p.y + p.h >= q.y && p.vy >= 0) {
      p.y = q.y - p.h; p.vy = 0; p.onGround = true; p.jumpsUsed = 0; standingOn = q;
      break;
    }
    if (p.onGround && jumpBuffer > 0) jump();
    if (p.y > H + 80) damage(true);
    for (const o of obstacles) if (!o.hit && p.x + p.w > o.x && p.x < o.x + o.w && p.y + p.h > o.y + 5 && p.y < o.y + o.h) {
      o.hit = true; damage();
    }
    if (mode !== 'playing') return;
    for (const item of items) if (!item.got && Math.hypot(p.x + 14 - item.x, p.y + 32 - item.y) < 32) collect(item);
    updateStreakTrail(dt);
    for (const particle of particles) { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 300 * dt; }
    particles = particles.filter(z => z.life > 0);
    camera = Math.max(0, p.x - 220);
    platforms = retainVisibleEntities(platforms, camera, q => q.x + q.w);
    items = retainVisibleEntities(items.filter(o => !o.got), camera, o => o.x + 11);
    obstacles = retainVisibleEntities(obstacles, camera, o => o.x + o.w);
    spawnCourse();
    if (elapsed >= DURATION) { endRun(true); return; }
    const beat = Math.floor(elapsed / .32);
    if (!muted && beat !== audioTick) { audioTick = beat; tone([220, 277.18, 329.63, 440, 415.3, 329.63, 277.18, 246.94][beat % 8], .18, .009); }
    hudTime += dt; if (hudTime >= .1) { hudTime = 0; updateHUD(); }
  }
  function backdrop() {
    const palettes = [['#19182e', '#49405f'], ['#171a30', '#3f435e'], ['#1d1c36', '#4c4266'], ['#151c34', '#3b4969'], ['#20192e', '#4a3d57'], ['#22192e', '#5b435f']];
    const phase = elapsed / DURATION * (palettes.length - 1), index = Math.floor(phase), mix = phase - index;
    const blend = (a, b) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - mix) + parseInt(b.slice(i, i + 2), 16) * mix).toString(16).padStart(2, '0')).join('');
    const colors = [0, 1].map(i => blend(palettes[index][i], palettes[Math.min(index + 1, palettes.length - 1)][i]));
    const gradient = ctx.createLinearGradient(0, 0, 0, H); gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1]); ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 35; i++) { const x = ((i * 127 + 37 - camera * .04) % W + W) % W; rect(x, (i * 73) % 210, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1, '#8d819e'); }
    rect(716, 48, 36, 42, '#c8c2d0'); rect(708, 56, 52, 25, '#c8c2d0'); rect(716, 77, 28, 10, '#b6aebf');
    for (let layer = 0; layer < 2; layer++) {
      const unit = layer ? 190 : 125, offset = camera * (layer ? .22 : .09), n = Math.floor(offset / unit);
      for (let i = -1; i < 10; i++) { const x = i * unit - offset % unit, k = i + n, top = 230 + layer * 24 - ((k * 37 + 10000) % 65);
        rect(x, top, unit - 8, H - top, layer ? '#352d49' : '#29263f'); rect(x - 2, top - 4, unit - 4, 5, layer ? '#49405a' : '#343047');
        if (layer) for (let row = 0; row < 3; row++) for (let column = 0; column < 4; column++) if ((k + row + column) % 3 === 0) rect(x + 20 + column * 39, top + 24 + row * 32, 8, 12, '#776176');

      }
    }
  }
  function drawWorld() {
    for (const q of platforms) {
      const x = q.x - camera; if (x > W || x + q.w < 0) continue;
      const edgeColor = { garden: '#95a993', steel: '#9ba8bf', stage: '#b68dae', tile: '#98809f', beam: '#abc0c9', lift: '#83d1d0', steps: '#cab0e9' }[q.surface] || '#8b788f';
      const suspended = q.optional || ['beam', 'lift', 'steps'].includes(q.surface);
      rect(x, q.y, q.w, suspended ? 15 : H - q.y, '#272133'); rect(x, q.y, q.w, 7, edgeColor); rect(x, q.y + 7, q.w, 8, '#55435f');
      if (q.stairStep) {
        label(`${q.stairStep} ↑`, x + q.w - 32, q.y + 33, 12, '#cab0e9', 'center');
        rect(x + q.w - 16, q.y - 5, 10, 4, '#ddcdf1');
      }

      if (suspended) {
        for (let j = Math.max(0, Math.floor(-x / 100)); j < Math.min(q.w / 100, (W - x) / 100); j++) {
          rect(x + j * 100, q.y + 15, 6, 22, '#5a516f'); rect(x + j * 100, q.y + 32, 94, 5, '#49455e');
          if (q.optional) { rect(x + j * 100 + 44, q.y - 6, 12, 6, '#95a993'); }
        }
        if (q.motion) {
          for (const post of [x + 16, x + q.w - 20]) {
            rect(post, q.baseY - q.motion.amplitude - 12, 3, q.motion.amplitude * 2 + 45, '#426c80');
            rect(post - 5, q.y + 17, 13, 5, '#83d1d0');
          }
        }
      } else if (q.surface === 'steel') {
        for (let j = Math.max(0, Math.floor(-x / 120)); j < Math.min(q.w / 120, (W - x) / 120); j++) { rect(x + j * 120, q.y + 15, 12, H - q.y, '#5a516f'); rect(x + j * 120 + 12, q.y + 38, 98, 6, '#49455e'); }
      } else {
        for (let row = 0; row < 4; row++) for (let j = Math.max(0, Math.floor(-x / 54)); j < Math.min(q.w / 54, (W - x) / 54); j++) rect(x + j * 54 + (row % 2 ? 27 : 0), q.y + 27 + row * 25, 47, 18, '#34283e');
      }
    }
    for (const item of items) if (!item.got && item.x > camera - 20 && item.x < camera + W + 20) cookie(item.x - camera, item.y, item.cat);
    for (const o of obstacles) {
      const x = o.x - camera;
      if (o.kind === 'rolling') {
        if (x + o.w < 0 || x > W) continue;
        scenery.michelle(x, o.y, o.rotation); continue;
      }
      if (x + o.w < 0 || x > W) continue;
      scenery.cookieBox(x, o.y, o.w, o.h);
    }
    if (finishRunway) {
      const x = p.x - camera + Math.max(0, DURATION - elapsed) * baseSpeed();
      if (x < W + 250) { rect(x, 130, 8, 250, '#a793b3'); rect(x + 225, 130, 8, 250, '#a793b3'); rect(x, 130, 233, 10, '#bf9bcf'); label('ROSELIA', x + 115, 195, 28, '#e6d2f0', 'center'); label('FINAL LIVE', x + 115, 222, 12, '#ac93bb', 'center'); }
    }
  }
  function draw() {
    ctx.imageSmoothingEnabled = false; backdrop(); drawWorld();
    if (mode === 'ready') { sprite(660, 377, 184, 4); }
    else {
      drawStreak();
      for (const cat of followingCats()) scenery.runningCat(cat.x - camera, cat.feet, cat.index, cat.x / 13, cat.airborne);
      const x = p.x - camera + 14;
      if (jumpGlow > 0) { rect(x - 22, p.y + p.h + 8, 44, 3, '#b7c9fa'); }
      for (let i = 0; i < 2; i++) rect(x - 7 + i * 9, p.y - 29, 5, 4, i < 2 - p.jumpsUsed ? '#c7dcfa' : '#514864');
      if (invulnerable <= 0 || Math.floor(visualTime * 12) % 2 === 0) {
        // One eight-pose stride covers 168 world pixels. Ground speed drives foot cadence.
        const frame = p.onGround ? Math.floor(runDistance / 21) % 8 : p.vy > 200 ? 7 : 5;
        sprite(x, p.y + p.h + 5, PLAYER_DRAW_HEIGHT, frame, p.onGround);
      }
      for (const particle of particles) rect(particle.x - camera, particle.y, 3, 3, particle.color);
    }
  }
  function loop(timestamp) {
    visualTime = timestamp / 1000;
    const dt = previousFrame === null ? 0 : Math.min((timestamp - previousFrame) / 1000, .1); previousFrame = timestamp;
    if (mode === 'playing') { accumulator += dt; while (accumulator >= 1 / 120) { update(1 / 120); accumulator -= 1 / 120; if (mode !== 'playing') { accumulator = 0; break; } } } else accumulator = 0;
    draw(); requestAnimationFrame(loop);
  }
  $('start').onclick = start; $('restart').onclick = start;
  $('resume').onclick = pause; $('pause').onclick = pause;
  function toggleSound() { muted = !muted; enableAudio(); $('sound').innerHTML = muted ? '♫<span class="slash">/</span>' : '♫'; $('sound').setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기'); $('sound').title = muted ? '소리 켜기 (M)' : '소리 끄기 (M)'; tone(659, .1); }
  $('sound').onclick = toggleSound;
  $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.cabinet').requestFullscreen(); } catch { notify('전체 화면을 지원하지 않는 브라우저입니다.'); } };
  for (const surface of [canvas, $('touchAction')]) {
    surface.addEventListener('pointerdown', event => { event.preventDefault(); surface.setPointerCapture(event.pointerId); pressInput(`pointer:${event.pointerId}`); });
    surface.addEventListener('pointerup', event => { event.preventDefault(); releaseInput(`pointer:${event.pointerId}`); });
    surface.addEventListener('pointercancel', event => releaseInput(`pointer:${event.pointerId}`));
    surface.addEventListener('lostpointercapture', event => releaseInput(`pointer:${event.pointerId}`));
  }
  function handleKeyDown(event) {
    if (event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '')) return;
    if (event.code === 'Space' || event.key === ' ') {
      // In play, Space always belongs to the game, including after clicking toolbar buttons.
      if (mode !== 'playing' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (event.repeat) return;
      if (mode === 'paused') pause(); else pressInput('keyboard:space');
    } else if (!event.repeat) {
      if (event.code === 'KeyP') pause(); else if (event.code === 'KeyM') toggleSound(); else if (event.code === 'KeyR') start();
    }
  }
  function handleKeyUp(event) {
    if (event.code === 'Space' || event.key === ' ') { if (activeInputs.has('keyboard:space')) event.preventDefault(); releaseInput('keyboard:space'); }
  }
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
  window.addEventListener('blur', () => { cancelInputs(); if (mode === 'playing') pause(); }); document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelInputs(); if (mode === 'playing') pause(); } });
  init(); requestAnimationFrame(loop);
  if (typeof globalThis.__YUKINA_TEST__ !== 'undefined') globalThis.__YUKINA_TEST__ = { init, start, update, action, pause, collect, damage, draw, followingCats, targetSpeed, handleKeyDown, handleKeyUp, pressInput, releaseInput, cancelInputs, DURATION, get state() { return { mode, p, platforms, items, obstacles, score, cookies, health, elapsed, particles, camera, runDistance, jumpBuffer, coyoteTime, director, streak, streakTier, streakTrail, streakFlash, scoreMultiplier: STREAK_MULTIPLIERS[streakTier] }; } };
})();
