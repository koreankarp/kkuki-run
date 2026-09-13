'use strict';
// A streaming director composes new action sequences; no complete map loops.
const COURSE_FAMILIES = [
  { id: 'terraces', primary: 'rise', choices: ['short', 'drop', 'long', 'rise', 'moving', 'rolling', 'rolling'] },
  { id: 'bridges', primary: 'long', choices: ['short', 'rolling', 'rolling', 'moving', 'drop', 'double'] },
  { id: 'airways', primary: 'double', choices: ['short', 'long', 'drop', 'rolling', 'rolling'] },
  { id: 'backstage', primary: 'gear', choices: ['short', 'rise', 'rolling', 'rolling', 'long', 'double'] },
  { id: 'crossroads', primary: 'split', choices: ['moving', 'long', 'drop', 'rolling', 'rolling'] },
  { id: 'lifts', primary: 'moving', choices: ['rise', 'short', 'long', 'moving', 'rolling', 'rolling'] },
  { id: 'roadcases', primary: 'rolling', choices: ['short', 'rise', 'long', 'moving'] },
  { id: 'staircases', primary: 'stairs', choices: ['short', 'garden', 'drop', 'moving'] },
  { id: 'gardens', primary: 'garden', choices: ['rise', 'long', 'moving', 'drop', 'rolling'] },
];
const COURSE_ACTIONS = ['short', 'long', 'rise', 'drop', 'double', 'gear', 'split', 'moving', 'rolling', 'garden', 'stairs'];
function createCourseDirector() { return { recentFamilies: [], recentPlans: [], recentActions: [], seenPlans: new Set(), counts: {}, serial: 0 }; }
const courseSnap = value => Math.round(value / 4) * 4;
const courseClamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const courseFlight = (fromY, toY) => (550 + Math.sqrt(550 ** 2 + 2300 * (toY - fromY))) / 1150;

function makeCourseRoof(action, random, pace, fromY) {
  const pick = array => array[Math.floor(random() * array.length)];
  let delta = pick([-24, -12, 0, 12, 24]);
  if (action === 'rise') delta = -(32 + random() * 24);
  if (action === 'drop') delta = 36 + random() * 36;
  const y = courseSnap(courseClamp(fromY + delta, 260, 400));
  const flight = courseFlight(fromY, y);
  const long = action === 'long' || action === 'moving';
  const gap = action === 'double'
    ? Math.ceil((pace * (flight + .1) + 28 + 80 + random() * 24) / 4) * 4
    : courseSnap(Math.max(100, pace * flight * (long ? .48 + random() * .15 : .22 + random() * .18)));
  // Reserve landing time even when high speed makes a full jump overshoot a small roof.
  const landing = pace * flight - 80 - gap;
  let width = courseSnap(Math.max(pace * .5, landing + pace * (.4 + random() * .45)));
  const roof = { action, gap, width, y, doubleGap: action === 'double', amps: [], cases: [], lanes: [], rollers: [],
    cookieLine: pick(['flat', 'wave', 'arches']), surface: pick(['tile', 'steel', 'garden']) };
  if (action === 'double') { roof.width = courseSnap(pace * (1.7 + random() * .3)); roof.surface = 'beam'; }
  if (action === 'long' || action === 'short') roof.surface = random() < .55 ? 'beam' : roof.surface;
  if (action === 'moving') {
    roof.surface = 'lift'; roof.motion = { amplitude: 20 + random() * 8, rate: 1.3 + random() * .5, phase: random() * Math.PI * 2 };
    roof.width += courseSnap(pace * .2);
  }
  if (action === 'rolling') {
    roof.surface = 'steel'; roof.cookieLine = 'flat';
    const count = 2 + Math.floor(random() * 3);
    const first = courseSnap(Math.max(landing + pace * 1.35, pace * 1.9));
    // Accumulate spacing so every pair retains a full jump and a short landing window.
    let offset = first;
    for (let i = 0; i < count; i++) {
      roof.rollers.push(offset);
      offset += courseSnap(pace * (1.25 + random() * .25));
    }
    roof.width = roof.rollers.at(-1) + courseSnap(pace * 1.25);
  }
  if (action === 'gear') {
    roof.surface = 'stage'; roof.cookieLine = 'flat';
    const clusters = 1 + Math.floor(random() * 3);
    let offset = courseSnap(Math.max(landing + pace * .65, pace * 1.05));
    for (let i = 0; i < clusters; i++) {
      const firstAmp = random() < .5;
      (firstAmp ? roof.amps : roof.cases).push(offset);
      if (random() < .5) (firstAmp ? roof.cases : roof.amps).push(offset + 88);
      offset += courseSnap(pace * (1.3 + random() * .25));
    }
    roof.width = courseSnap(offset + pace * .45);
  }
  if (action === 'split') {
    roof.surface = 'stage'; roof.cookieLine = 'flat'; roof.width = courseSnap(pace * (4.2 + random() * .6));
    const offset = courseSnap(pace * (1.05 + random() * .2));
    const rise = pick([76, 88, 100]);
    if (random() < .5) roof.lanes.push({ offset, width: roof.width - offset - 40, rise });
    else {
      const firstWidth = courseSnap(pace * 1.05), laneGap = courseSnap(pace * .45);
      const secondOffset = offset + firstWidth + laneGap;
      roof.lanes.push({ offset, width: firstWidth, rise }, { offset: secondOffset, width: roof.width - secondOffset - 40, rise: rise - 8 });
    }
    roof.amps.push(courseSnap(offset + pace * .72));
  }
  if (action === 'garden') { roof.surface = 'garden'; roof.bonus = true; roof.width = courseSnap(pace * (1.65 + random() * .65)); }
  return roof;
}

function nextCourseEncounter(director, random, pace, fromY) {
  const pick = array => array[Math.floor(random() * array.length)];
  const choices = COURSE_FAMILIES.filter(f => !director.recentFamilies.includes(f.id));
  const least = Math.min(...choices.map(f => director.counts[f.id] || 0));
  const family = pick(choices.filter(f => (director.counts[f.id] || 0) <= least + 1));
  let signature, roofs;
  for (let attempt = 0; attempt < 64; attempt++) {
    const count = 2 + Math.floor(random() * 3) + Math.floor(attempt / 24);
    const primaryIndex = Math.floor(random() * count), plan = [];
    let previous = director.recentActions.at(-1);
    for (let i = 0; i < count; i++) {
      const pool = i === primaryIndex ? [family.primary] : family.choices.filter(a => a !== previous);
      const action = pick(pool); plan.push(action); previous = action;
    }
    roofs = []; let y = fromY;
    for (const action of plan) {
      while (action === 'double' && y < 344) {
        const approach = makeCourseRoof('drop', random, pace, y); roofs.push(approach); y = approach.y;
      }
      if (action === 'stairs') {
        while (y < 372) { const entry = makeCourseRoof('drop', random, pace, y); roofs.push(entry); y = entry.y; }
        const rise = [36, 40, 44][Math.floor(random() * 3)];
        for (let step = 0; step < 3; step++) {
          const nextY = y - rise, flight = courseFlight(y, nextY);
          const gap = courseSnap(pace * flight * .57);
          const landing = pace * flight - 80 - gap;
          roofs.push({ action: 'stairs', y: nextY, gap, width: courseSnap(Math.max(220, landing + pace * .30)),
            doubleGap: false, amps: [], cases: [], rollers: [], lanes: [], cookieLine: 'flat', surface: 'steps', stairStep: step + 1 });
          y = nextY;
        }
        const rest = makeCourseRoof('garden', random, pace, y);
        rest.width = Math.max(rest.width, courseSnap(pace * 2)); rest.stairFinish = true;
        roofs.push(rest); y = rest.y; continue;
      }
      const roof = makeCourseRoof(action, random, pace, y); roofs.push(roof); y = roof.y;
    }
    // Remember the actual played order, including approaches, for the whole run.
    signature = roofs.map(r => r.action).join('/');
    if (!director.seenPlans.has(signature) && roofs[0].action !== director.recentActions.at(-1)) break;
  }
  while (director.seenPlans.has(signature)) {
    const extra = makeCourseRoof(roofs.at(-1).action === 'short' ? 'long' : 'short', random, pace, roofs.at(-1).y);
    roofs.push(extra); signature += '/' + extra.action;
  }
  director.seenPlans.add(signature);
  director.recentFamilies.push(family.id); if (director.recentFamilies.length > 3) director.recentFamilies.shift();
  director.recentPlans.push(signature); if (director.recentPlans.length > 32) director.recentPlans.shift();
  director.recentActions.push(...roofs.map(r => r.action)); director.recentActions = director.recentActions.slice(-8);
  director.counts[family.id] = (director.counts[family.id] || 0) + 1; director.serial++;
  return { id: family.id, signature, roofs };
}
