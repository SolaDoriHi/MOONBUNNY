/* MOONBUNNY — banner platformer animation (autoplay, loops).
   Pure canvas, no libraries. */
const $ = (s) => document.querySelector(s);

const caText = $('#caText');
const copyHint = $('#copyHint');

$('#copyCA')?.addEventListener('click', async () => {
  const text = (caText?.textContent || '').trim();
  if (!text || text.includes('PASTE_CONTRACT')) {
    copyHint.textContent = 'Paste your real CA first.';
    setTimeout(()=> copyHint.textContent = 'Always verify the contract address.', 1400);
    return;
  }
  try{
    await navigator.clipboard.writeText(text);
    copyHint.textContent = 'Copied ✅';
    setTimeout(()=> copyHint.textContent = 'Always verify the contract address.', 1400);
  }catch(e){
    copyHint.textContent = 'Copy failed — select & copy manually.';
    setTimeout(()=> copyHint.textContent = 'Always verify the contract address.', 1400);
  }
});

const canvas = $('#banner');
const ctx = canvas.getContext('2d');

function resizeCanvas(){
  // Keep internal resolution stable; CSS scales it.
  // But adapt if very small screens for better crispness.
  const w = 1200, h = 520;
  canvas.width = w; canvas.height = h;
}
resizeCanvas();

let speedMult = 1;
let soundOn = false;

const soundBtn = $('#soundBtn');
soundBtn?.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.textContent = `Sound: ${soundOn ? 'ON' : 'OFF'}`;
  soundBtn.setAttribute('aria-pressed', String(soundOn));
});

const restartBtn = $('#restart');
restartBtn?.addEventListener('click', () => reset(true));

const speedBtn = $('#speed');
speedBtn?.addEventListener('click', () => {
  speedMult = speedMult === 1 ? 1.35 : speedMult === 1.35 ? 1.7 : 1;
  speedBtn.textContent = `Speed: x${speedMult === 1 ? '1' : speedMult}`;
});

const rand = (a,b)=> a + Math.random()*(b-a);

function playHop(){
  if (!soundOn) return;
  // Tiny synth hop using WebAudio
  try{
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type='triangle';
    o.frequency.value = 560;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ac.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 0.01);
    o.frequency.exponentialRampToValueAtTime(780, ac.currentTime + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
    o.stop(ac.currentTime + 0.14);
    setTimeout(()=>ac.close(), 200);
  }catch(_){}
}

const world = {
  t: 0,
  camY: 0,
  score: 0,
  collected: 0,
  particles: [],
  confetti: [],
  moonReached: false,
};

const bunny = {
  x: 260,
  y: 360,
  vx: 0,
  vy: 0,
  r: 22,
  state: 'jump', // or 'land'
  face: 0,
};

let platforms = [];
let enemies = [];
let coins = [];
let moon = { x: 980, y: -1200, r: 54 };

function makeLevel(){
  platforms = [];
  enemies = [];
  coins = [];
  world.particles = [];
  world.confetti = [];
  world.score = 0;
  world.collected = 0;
  world.moonReached = false;
  world.camY = 0;

  // base platforms
  let y = 420;
  for (let i=0; i<18; i++){
    const x = rand(140, 1040);
    const w = rand(120, 180);
    platforms.push({x, y, w, h: 26});
    // coin on some platforms
    if (Math.random() < 0.85){
      coins.push({x: x + w/2 + rand(-18,18), y: y - 30, r: 11, got:false});
    }
    // enemy (red candle) sometimes
    if (i>2 && Math.random() < 0.35){
      enemies.push({x: x + rand(-30, 30), y: y - 18, w: 24, h: 60, phase: rand(0, 6.28)});
    }
    y -= rand(85, 110);
  }

  // moon target near top
  moon = { x: rand(900, 1080), y: y - 120, r: 56 };
  // bunny start on first platform
  bunny.x = platforms[0].x + platforms[0].w/2;
  bunny.y = platforms[0].y - bunny.r - 3;
  bunny.vx = 0;
  bunny.vy = -8;
}

function reset(immediate=false){
  makeLevel();
  if (immediate) world.t = 0;
}
reset(true);

function addParticles(x,y,n, color){
  for(let i=0;i<n;i++){
    world.particles.push({
      x,y,
      vx: rand(-2.8,2.8),
      vy: rand(-4.8,-1.2),
      life: rand(18, 34),
      color,
      r: rand(1.2, 2.6)
    });
  }
}

function addConfetti(){
  for(let i=0;i<120;i++){
    world.confetti.push({
      x: rand(0, canvas.width),
      y: rand(-40, 0),
      vx: rand(-1.2, 1.2),
      vy: rand(1.6, 3.8),
      rot: rand(0, 6.28),
      vr: rand(-0.18, 0.18),
      life: rand(120, 220),
      size: rand(3, 7),
      c: Math.random() < 0.6 ? 'gold' : (Math.random()<0.5 ? 'green' : 'moon')
    });
  }
}

function drawRoundedRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function drawBackground(){
  // soft gradient layers
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0, 'rgba(9,12,40,0.0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // distant clouds
  ctx.globalAlpha = 0.18;
  for(let i=0;i<9;i++){
    const x = (i*160 + (world.t*0.6)%160) - 120;
    const y = 70 + (i%3)*26;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(x, y, 70, 20, 0, 0, Math.PI*2);
    ctx.ellipse(x+60, y+6, 60, 18, 0, 0, Math.PI*2);
    ctx.ellipse(x+120, y, 80, 22, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function worldToScreenY(y){
  return y - world.camY;
}

function drawMoon(){
  const sy = worldToScreenY(moon.y);
  const x = moon.x;
  // glow
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(199,210,254,.18)';
  ctx.beginPath();
  ctx.arc(x, sy, moon.r+26, 0, Math.PI*2);
  ctx.fill();
  // moon body
  ctx.fillStyle = 'rgba(231,236,255,.95)';
  ctx.beginPath();
  ctx.arc(x, sy, moon.r, 0, Math.PI*2);
  ctx.fill();
  // craters
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(150,160,210,.35)';
  for(let i=0;i<7;i++){
    ctx.beginPath();
    ctx.arc(x + rand(-22,22), sy + rand(-18,18), rand(5,10), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatform(p){
  const sy = worldToScreenY(p.y);
  // candle stick platform (green)
  ctx.save();
  // stick glow
  ctx.fillStyle = 'rgba(51,255,154,.12)';
  drawRoundedRect(p.x-6, sy-8, p.w+12, p.h+16, 14);
  ctx.fill();
  // body
  const grad = ctx.createLinearGradient(p.x, sy, p.x, sy+p.h);
  grad.addColorStop(0, 'rgba(51,255,154,.95)');
  grad.addColorStop(1, 'rgba(15,212,123,.85)');
  ctx.fillStyle = grad;
  drawRoundedRect(p.x, sy, p.w, p.h, 12);
  ctx.fill();
  // wick
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w/2, sy-10, 10, 4, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(e){
  const sy = worldToScreenY(e.y);
  const wobble = Math.sin(world.t*0.06 + e.phase) * 10;
  const x = e.x + wobble;
  ctx.save();
  // glow
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'rgba(255,77,109,.55)';
  drawRoundedRect(x-10, sy-10, e.w+20, e.h+20, 14);
  ctx.fill();
  // body
  const grad = ctx.createLinearGradient(x, sy, x, sy+e.h);
  grad.addColorStop(0, 'rgba(255,77,109,.95)');
  grad.addColorStop(1, 'rgba(255,77,109,.70)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = grad;
  drawRoundedRect(x, sy, e.w, e.h, 12);
  ctx.fill();
  // face (funny)
  ctx.fillStyle = 'rgba(7,10,24,.65)';
  ctx.beginPath();
  ctx.arc(x + e.w/2 - 4, sy + 18, 4, 0, Math.PI*2);
  ctx.arc(x + e.w/2 + 6, sy + 18, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(7,10,24,.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + e.w/2 + 1, sy + 34, 10, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawCoin(c){
  if (c.got) return;
  const sy = worldToScreenY(c.y);
  ctx.save();
  ctx.fillStyle = 'rgba(255,209,102,.30)';
  ctx.beginPath();
  ctx.arc(c.x, sy, c.r+10, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,209,102,.95)';
  ctx.beginPath();
  ctx.arc(c.x, sy, c.r, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, sy, c.r-3, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(){
  for(const p of world.particles){
    const sy = worldToScreenY(p.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life/34);
    ctx.fillStyle = p.color === 'green' ? 'rgba(51,255,154,1)' : p.color === 'gold' ? 'rgba(255,209,102,1)' : 'rgba(199,210,254,1)';
    ctx.beginPath();
    ctx.arc(p.x, sy, p.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

function drawConfetti(){
  for(const c of world.confetti){
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.life/220);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    let col = c.c === 'gold' ? 'rgba(255,209,102,1)' : c.c === 'green' ? 'rgba(51,255,154,1)' : 'rgba(231,236,255,1)';
    ctx.fillStyle = col;
    ctx.fillRect(-c.size/2, -c.size/2, c.size, c.size);
    ctx.restore();
  }
}

function drawBunny(){
  const x = bunny.x;
  const sy = worldToScreenY(bunny.y);
  ctx.save();

  // shadow on platform plane (fake)
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(0,0,0,.8)';
  ctx.beginPath();
  ctx.ellipse(x, sy + bunny.r + 18, 22, 8, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // body
  ctx.fillStyle = 'rgba(245,247,255,.95)';
  ctx.beginPath();
  ctx.arc(x, sy, bunny.r, 0, Math.PI*2);
  ctx.fill();

  // hoodie suit (pastel)
  const suit = ctx.createLinearGradient(x-bunny.r, sy-bunny.r, x+bunny.r, sy+bunny.r);
  suit.addColorStop(0, 'rgba(190,167,255,.9)');
  suit.addColorStop(1, 'rgba(125,231,255,.55)');
  ctx.fillStyle = suit;
  ctx.beginPath();
  ctx.ellipse(x, sy+6, 20, 16, 0, 0, Math.PI*2);
  ctx.fill();

  // ears
  ctx.fillStyle = 'rgba(245,247,255,.95)';
  ctx.beginPath();
  ctx.roundRect(x-16, sy-44, 12, 32, 8);
  ctx.roundRect(x+4, sy-48, 12, 34, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,170,210,.55)';
  ctx.beginPath();
  ctx.roundRect(x-14, sy-41, 8, 26, 7);
  ctx.roundRect(x+6, sy-45, 8, 28, 7);
  ctx.fill();

  // face
  ctx.fillStyle = 'rgba(7,10,24,.75)';
  ctx.beginPath();
  ctx.arc(x-7, sy-6, 3.4, 0, Math.PI*2);
  ctx.arc(x+7, sy-6, 3.4, 0, Math.PI*2);
  ctx.fill();
  // smile
  ctx.strokeStyle = 'rgba(7,10,24,.70)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(x, sy+3, 10, 0, Math.PI);
  ctx.stroke();
  // cheeks
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(255,77,109,.85)';
  ctx.beginPath();
  ctx.arc(x-14, sy+2, 4.5, 0, Math.PI*2);
  ctx.arc(x+14, sy+2, 4.5, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function tick(){
  world.t += 1 * speedMult;

  // physics
  const gravity = 0.55 * speedMult;
  bunny.vy += gravity;

  // gentle steering toward next platform above
  const target = platforms
    .filter(p => p.y < bunny.y - 10)
    .sort((a,b)=> b.y - a.y)[0]; // nearest above

  if (target){
    const tx = target.x + target.w/2;
    bunny.vx += (tx - bunny.x) * 0.0022 * speedMult;
  }else{
    bunny.vx *= 0.98;
  }

  bunny.vx *= 0.92;
  bunny.x += bunny.vx;
  bunny.y += bunny.vy;

  // bounds
  bunny.x = Math.max(80, Math.min(canvas.width-80, bunny.x));

  // camera follows bunny upward
  const desiredCam = bunny.y - 240;
  world.camY += (desiredCam - world.camY) * 0.08;

  // land on platforms
  for(const p of platforms){
    const top = p.y;
    const withinX = bunny.x > p.x + 10 && bunny.x < p.x + p.w - 10;
    const falling = bunny.vy > 0;
    if (withinX && falling && (bunny.y + bunny.r) >= top && (bunny.y + bunny.r) <= top + 22){
      bunny.y = top - bunny.r - 2;
      bunny.vy = -14.5 * speedMult; // auto jump
      playHop();
      addParticles(bunny.x, bunny.y + bunny.r, 10, 'green');
    }
  }

  // enemy touch => bounce sideways + red particles (no damage, just meme)
  for(const e of enemies){
    const wobble = Math.sin(world.t*0.06 + e.phase) * 10;
    const ex = e.x + wobble + e.w/2;
    const ey = e.y + e.h/2;
    const dx = bunny.x - ex, dy = bunny.y - ey;
    const d = Math.hypot(dx,dy);
    if (d < 34){
      bunny.vx += (dx>0? 1 : -1) * 6;
      bunny.vy = -10 * speedMult;
      addParticles(bunny.x, bunny.y, 12, 'moon');
    }
  }

  // coin pickup
  for(const c of coins){
    if (c.got) continue;
    const dx = bunny.x - c.x;
    const dy = bunny.y - c.y;
    if (Math.hypot(dx,dy) < 28){
      c.got = true;
      world.collected++;
      addParticles(c.x, c.y, 14, 'gold');
      if (soundOn) playHop();
    }
  }

  // moon reached
  if (!world.moonReached){
    const dx = bunny.x - moon.x;
    const dy = bunny.y - moon.y;
    if (Math.hypot(dx,dy) < moon.r + 22){
      world.moonReached = true;
      addConfetti();
      // after a moment, reset
      setTimeout(()=> reset(true), 1600);
    }
  }

  // update particles
  world.particles = world.particles.filter(p => (p.life -= 1) > 0);
  for(const p of world.particles){
    p.x += p.vx * speedMult;
    p.y += p.vy * speedMult;
    p.vy += 0.22 * speedMult;
    p.vx *= 0.98;
  }

  // confetti
  world.confetti = world.confetti.filter(c => (c.life -= 1) > 0);
  for(const c of world.confetti){
    c.x += c.vx * speedMult;
    c.y += c.vy * speedMult;
    c.rot += c.vr * speedMult;
    c.vy += 0.02 * speedMult;
  }

  // if bunny falls too low (missed platforms) => reset
  if (bunny.y - world.camY > canvas.height + 160){
    reset(true);
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBackground();

  // subtle ground haze
  ctx.globalAlpha = 0.25;
  const haze = ctx.createRadialGradient(canvas.width/2, canvas.height, 120, canvas.width/2, canvas.height, 520);
  haze.addColorStop(0, 'rgba(51,255,154,.18)');
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalAlpha = 1;

  drawMoon();

  // platforms/enemies/coins
  platforms.forEach(drawPlatform);
  enemies.forEach(drawEnemy);
  coins.forEach(drawCoin);

  drawParticles();
  drawBunny();

  // UI
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(7,10,24,.55)';
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.lineWidth = 1;
  const pad = 12;
  drawRoundedRect(16, 16, 280, 70, 16);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = 'rgba(234,240,255,.92)';
  ctx.font = '700 18px Fredoka, system-ui';
  ctx.fillText('MOONBUNNY RUN', 28, 44);
  ctx.font = '600 14px Fredoka, system-ui';
  ctx.fillStyle = 'rgba(234,240,255,.72)';
  ctx.fillText(`coins: ${world.collected}  •  speed: x${speedMult===1?'1':speedMult}`, 28, 64);
  ctx.restore();

  if (world.moonReached){
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(7,10,24,.55)';
    drawRoundedRect(canvas.width/2 - 190, 180, 380, 90, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(234,240,255,.95)';
    ctx.font = '800 28px Fredoka, system-ui';
    ctx.fillText('MOON REACHED! 🌙', canvas.width/2 - 150, 218);
    ctx.font = '700 14px Fredoka, system-ui';
    ctx.fillStyle = 'rgba(234,240,255,.75)';
    ctx.fillText('Looping in a second…', canvas.width/2 - 78, 244);
    ctx.restore();
  }

  drawConfetti();
}

let last = performance.now();
function loop(now){
  const dt = now - last;
  last = now;
  // simple fixed steps for stability
  const steps = dt > 32 ? 2 : 1;
  for(let i=0;i<steps;i++) tick();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// smooth anchor scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({behavior:'smooth', block:'start'});
    history.pushState(null, '', id);
  });
});
