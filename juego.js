/*
Juego: "Jardín en Flor" (archivo JavaScript solamente)
Descripción: Juego tipo tower-defense con temática de flores.
- Genera dinámicamente el canvas y UI (no necesita HTML/CSS externos)
- Plantas flores (torres) que generan/proyectan polen para detener plagas
- Recolectas néctar para comprar/actualizar flores
- Niveles por oleadas, partículas, efectos y estados

Instrucciones (integradas en el juego):
- Click izquierdo en la cuadrícula para plantar una flor (si tienes néctar)
- Selecciona tipos de flor desde la barra lateral
- Barra inferior muestra información, pulsa ESPACIO para forzar inicio de la siguiente oleada

Autor: Generado por asistente
*/
(() => {
  // --- Configuración básica ---
  const W = Math.min(window.innerWidth * 0.92, 1200);
  const H = Math.min(window.innerHeight * 0.86, 760);
  const TILE = 64; // tamaño de casilla de la cuadrícula
  const GRID_W = Math.floor(W / TILE);
  const GRID_H = Math.floor(H / TILE);

  // --- Crear elementos DOM ---
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:4%;top:4%;width:${W}px;height:${H}px;background:linear-gradient(#dff7e6,#eafef4);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.18);overflow:hidden;font-family:Arial,Helvetica,sans-serif;z-index:99999`;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  // UI overlay
  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;left:8px;top:8px;color:#1b3b2d;pointer-events:none;';
  container.appendChild(hud);

  const sidebar = document.createElement('div');
  sidebar.style.cssText = `position:absolute;right:8px;top:8px;pointer-events:auto;width:220px;background:rgba(255,255,255,0.88);backdrop-filter:blur(6px);border-radius:8px;padding:10px;`; 
  container.appendChild(sidebar);

  const controls = document.createElement('div');
  controls.style.cssText = `position:absolute;left:8px;bottom:8px;pointer-events:auto;width:calc(100% - 32px);background:rgba(255,255,255,0.88);backdrop-filter: blur(6px);border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:space-between;`;
  container.appendChild(controls);

  document.body.appendChild(container);

  const ctx = canvas.getContext('2d');

  // --- Estado del juego ---
  let lastTime = performance.now();
  let paused = false;

  const state = {
    nectar: 120,
    health: 20,
    wave: 0,
    moneyGainRate: 0.8, // nectar passive per second
    grid: Array.from({ length: GRID_W }, () => Array(GRID_H).fill(null)),
    flowers: [],
    pests: [],
    projectiles: [],
    particles: [],
    selectedFlowerType: 'sunflower',
    placing: false,
    mouse: { x: 0, y: 0, gridX: 0, gridY: 0 },
    path: [],
    waveRunning: false,
    shop: {},
    difficulty: 1,
  };

  // --- Utility ---
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // --- Grid helper ---
  function worldToGrid(x, y) {
    return { gx: Math.floor(x / TILE), gy: Math.floor(y / TILE) };
  }
  function gridToWorld(gx, gy) {
    return { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
  }

  // --- Path definition (simple left-to-right path with some curves) ---
  function buildPath() {
  const path = [];
  const nodes = [];

  // Ruta más estable: siempre dentro del grid vertical
  let gy = Math.floor(GRID_H / 2);

  // Empieza a la derecha
  nodes.push({ gx: GRID_W - 1, gy });

  // Avanza hacia la izquierda haciendo ondas suaves
  for (let gx = GRID_W - 2; gx >= 1; gx--) {
    gy += Math.floor(Math.sin(gx * 0.7) * 1.5);
    gy = clamp(gy, 2, GRID_H - 2);
    nodes.push({ gx, gy });
  }

  // Convertimos nodos → camino denso en píxeles
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = gridToWorld(nodes[i].gx, nodes[i].gy);
    const b = gridToWorld(nodes[i + 1].gx, nodes[i + 1].gy);
    const steps = Math.max(10, Math.floor(dist(a, b) / 10));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      path.push({
        x: a.x * (1 - t) + b.x * t,
        y: a.y * (1 - t) + b.y * t
      });
    }
  }

  return path;
}

  state.path = buildPath();

  // --- Flower types (torres) ---
  const FLOWER_TYPES = {
    sunflower: {
      name: 'Girasol',
      desc: 'Genera néctar pasivo y lanza polen moderado.',
      cost: 30,
      range: TILE * 2.2,
      fireRate: 1.2, // seconds
      damage: 8,
      color: '#ffd24d',
      size: 0.9,
      passive: 0.9, // nectar per sec
    },
    rose: {
      name: 'Rosa',
      desc: 'Daño alto y critico ocasional.',
      cost: 60,
      range: TILE * 2.6,
      fireRate: 1.6,
      damage: 20,
      color: '#ff6b9a',
      size: 0.85,
      passive: 0.2,
    },
    lavender: {
      name: 'Lavanda',
      desc: 'Lenta plagas y daño en área pequeño.',
      cost: 45,
      range: TILE * 2.8,
      fireRate: 1.8,
      damage: 10,
      color: '#b08bff',
      size: 0.9,
      passive: 0.3,
      slow: 0.5,
    },
    daisy: {
      name: 'Margarita',
      desc: 'Barata y rápida.',
      cost: 20,
      range: TILE * 1.8,
      fireRate: 0.6,
      damage: 5,
      color: '#ffffff',
      size: 0.8,
      passive: 0.15,
    },
  };

  // --- Shop UI ---
  function buildShop() {
    sidebar.innerHTML = '';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;margin-bottom:8px';
    title.innerText = 'Tienda - Flores';
    sidebar.appendChild(title);

    Object.entries(FLOWER_TYPES).forEach(([key, ft]) => {
      const b = document.createElement('button');
      b.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;padding:8px;margin-bottom:6px;border-radius:6px;border:1px solid rgba(0,0,0,0.06);background:#fff;cursor:pointer;';
      b.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:${ft.color};box-shadow:inset 0 -6px rgba(0,0,0,0.08);"></div><div style='flex:1;text-align:left'><div style='font-weight:600'>${ft.name}</div><div style='font-size:12px;color:#444'>${ft.desc}</div></div><div style='font-weight:700'>${ft.cost}🍯</div>`;
      b.onclick = () => { state.selectedFlowerType = key; }
      sidebar.appendChild(b);
    });

    const info = document.createElement('div');
    info.style.cssText = 'margin-top:8px;font-size:13px;line-height:1.2;color:#123';
    info.innerHTML = `Néctar: <span id='nectar-count'>${Math.floor(state.nectar)}</span> 🍯<br>Salud: <span id='health-count'>${state.health}</span> ❤<br>Oleada: <span id='wave-count'>${state.wave}</span>`;
    sidebar.appendChild(info);
  }
  buildShop();

  // --- Entities ---
  class Flower {
    constructor(gx, gy, typeKey) {
      this.gx = gx; this.gy = gy; this.typeKey = typeKey;
      this.type = FLOWER_TYPES[typeKey];
      this.x = gridToWorld(gx, gy).x; this.y = gridToWorld(gx, gy).y;
      this.cooldown = 0;
      this.level = 1;
      this.health = 50 * this.level;
    }
    update(dt) {
      // passive nectar
      state.nectar += (this.type.passive || 0) * dt;
      this.cooldown -= dt;
      if (this.cooldown <= 0) {
        // find target
        let target = null;
        let best = Infinity;
        for (const p of state.pests) {
          const d = Math.hypot(p.x - this.x, p.y - this.y);
          if (d <= this.type.range && d < best) { best = d; target = p; }
        }
        if (target) {
          this.shoot(target);
          this.cooldown = this.type.fireRate / this.level;
        }
      }
    }
    shoot(target) {
      // spawn projectile
      state.projectiles.push(new Projectile(this.x, this.y, target, this.type.damage * this.level, this.type));
      // particle effect
      for (let i = 0; i < 6; i++) state.particles.push(Particle.spawn(this.x, this.y, this.type.color));
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      // stem
      ctx.beginPath(); ctx.moveTo(0, TILE*0.18); ctx.lineTo(0, TILE*0.5); ctx.strokeStyle = '#4a7a4c'; ctx.lineWidth = 4; ctx.stroke();
      // flower center
      ctx.beginPath(); ctx.arc(0, -TILE*0.05, TILE*0.16 * this.type.size, 0, Math.PI*2); ctx.fillStyle = '#6b4f2a'; ctx.fill();
      // petals
      const petCount = 8;
      for (let i = 0; i < petCount; i++) {
        const a = (i / petCount) * Math.PI * 2 + performance.now() / 1000 * 0.3;
        const px = Math.cos(a) * TILE * 0.28 * this.type.size;
        const py = Math.sin(a) * TILE * 0.2 * this.type.size - TILE*0.05;
        ctx.beginPath(); ctx.ellipse(px, py, TILE*0.12*this.type.size, TILE*0.06*this.type.size, a, 0, Math.PI*2);
        ctx.fillStyle = this.type.color; ctx.fill();
      }
      // level badge
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Lv'+this.level, 0, TILE*0.44);
      ctx.restore();
    }
  }

  class Pest {
    constructor(hp, speed, reward) {
      this.hp = hp; this.maxHp = hp; this.speed = speed; this.reward = reward;
      this.x = state.path[0].x; this.y = state.path[0].y; this.pathIndex = 0; this.slowFactor = 1; this.alive = true;
    }
    update(dt) {
      if (!this.alive) return;
      // advance along path
      const nextIndex = Math.min(this.pathIndex + Math.floor(this.speed * dt * 3), state.path.length - 1);
      const nx = state.path[nextIndex].x; const ny = state.path[nextIndex].y;
      const dx = nx - this.x; const dy = ny - this.y; const d = Math.hypot(dx, dy);
      const move = this.speed * this.slowFactor * dt;
      if (d <= move) { this.x = nx; this.y = ny; this.pathIndex = nextIndex; }
      else { this.x += dx / d * move; this.y += dy / d * move; }
      // reached end?
      if (this.pathIndex >= state.path.length - 1) { this.reachGarden(); }
    }
    takeDamage(dmg, slow) {
      this.hp -= dmg;
      if (slow) this.slowFactor = Math.min(this.slowFactor, slow);
      if (this.hp <= 0) this.die();
    }
    die() {
      this.alive = false;
      state.nectar += this.reward;
      for (let i = 0; i < 12; i++) state.particles.push(Particle.spawn(this.x, this.y, '#8b5a3c'));
    }
    reachGarden() {
      this.alive = false;
      state.health -= 1;
      if (state.health <= 0) gameOver();
    }
    draw(ctx) {
  if (!this.alive) return;
  ctx.save();
  ctx.translate(this.x, this.y);

  // ---------- Sombra ----------
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(0, 14, 22, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "black";
  ctx.fill();
  ctx.globalAlpha = 1;

  // ---------- Cuerpo ----------
  ctx.fillStyle = "#303030";
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---------- Rayas ----------
  ctx.fillStyle = "#ffda33";
  ctx.beginPath();
  ctx.rect(-12, -9, 10, 18);
  ctx.fill();

  // ---------- Cabeza ----------
  ctx.beginPath();
  ctx.ellipse(-18, 0, 10, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  // ---------- Ojos ----------
  ctx.fillStyle = "#58c2ff";
  ctx.beginPath();
  ctx.arc(-21, -3, 4, 0, Math.PI * 2);
  ctx.arc(-21, 3, 4, 0, Math.PI * 2);
  ctx.fill();

  // ---------- Alas animadas ----------
  const flap = Math.sin(performance.now() / 80) * 6;

  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "#dff9ff";

  ctx.beginPath();
  ctx.ellipse(6, -14 + flap, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(6, 14 - flap, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  // ---------- Barra de vida ----------
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(-22, -24, 44, 6);

  ctx.fillStyle = "#73ff73";
  ctx.fillRect(-22, -24, 44 * (this.hp / this.maxHp), 6);

  ctx.restore();
}

  }

  class Projectile {
    constructor(x, y, target, dmg, type) {
      this.x = x; this.y = y; this.target = target; this.speed = 420; this.dmg = dmg; this.type = type; this.alive = true; this.radius = 6;
    }
    update(dt) {
      if (!this.alive || !this.target || !this.target.alive) { this.alive = false; return; }
      const dx = this.target.x - this.x; const dy = this.target.y - this.y; const d = Math.hypot(dx, dy);
      const move = this.speed * dt;
      if (d <= move || d < 6) {
        this.hit();
      } else {
        this.x += dx / d * move; this.y += dy / d * move;
      }
    }
    hit() {
      if (!this.target.alive) { this.alive = false; return; }
      // apply damage and maybe slow
      const slow = this.type.slow ? (1 - this.type.slow) : null;
      this.target.takeDamage(this.dmg, slow);
      this.alive = false;
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y);
      ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fillStyle = this.type.color || '#fff'; ctx.fill();
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.vx = rand(-80,80); this.vy = rand(-80,-20); this.life = rand(0.6,1.2); this.color = color; }
    static spawn(x,y,color){ return new Particle(x + rand(-8,8), y + rand(-8,8), color); }
    update(dt){ this.life -= dt; this.x += this.vx*dt; this.y += this.vy*dt; this.vy += 120*dt; }
    draw(ctx){ if (this.life<=0) return; ctx.globalAlpha = clamp(this.life,0,1); ctx.beginPath(); ctx.arc(this.x,this.y,Math.max(1, this.life*4),0,Math.PI*2); ctx.fillStyle = this.color; ctx.fill(); ctx.globalAlpha =1; }
  }

  // --- Game control ---
  function spawnWave() {
    state.wave++;
    state.waveRunning = true;
    const count = 4 + Math.floor(state.wave * (1 + state.difficulty * 0.4));
    const baseHp = 12 + Math.floor(state.wave * 3);
    const baseSpeed = 30 + state.wave * 2;
    let spawned = 0;
    const spawnInterval = setInterval(() => {
      if (spawned >= count) { clearInterval(spawnInterval); state.waveRunning = false; return; }
      const hp = baseHp + Math.floor(Math.random() * Math.floor(state.wave * 2.2));
      const speed = baseSpeed + Math.random() * 20;
      const reward = 6 + Math.floor(state.wave * 0.6);
      state.pests.push(new Pest(hp, speed, reward));
      spawned++;
    }, 700);
  }

  function gameOver() {
    paused = true;
    // show overlay
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(0,0,0,0.45);color:#fff;font-size:22px;';
    ov.innerHTML = `<div style='font-size:34px;font-weight:800'>¡El jardín ha caído!</div><div style='margin-top:8px'>Llegaste a la oleada ${state.wave}</div>`;
    const btn = document.createElement('button'); btn.innerText = 'Reiniciar'; btn.style.cssText = 'margin-top:12px;padding:8px 14px;border-radius:6px;cursor:pointer';
    btn.onclick = () => location.reload();
    ov.appendChild(btn);
    container.appendChild(ov);
  }

  // --- Input ---
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    state.mouse.x = mx; state.mouse.y = my;
    const g = worldToGrid(mx, my);
    state.mouse.gridX = clamp(g.gx, 0, GRID_W - 1); state.mouse.gridY = clamp(g.gy, 0, GRID_H - 1);
  });
  canvas.addEventListener('click', (e) => {
    // plant flower where clicked
    const gx = state.mouse.gridX; const gy = state.mouse.gridY;
    // Disallow planting on path tiles (find closest path point and check distance)
    const world = gridToWorld(gx, gy);
    let onPath = false;
    for (let p of state.path) { if (Math.hypot(p.x - world.x, p.y - world.y) < TILE*0.6) { onPath = true; break; } }
    if (onPath) {
      // try adjacent cell
      return;
    }
    if (state.grid[gx][gy]) return; // occupied
    const ftKey = state.selectedFlowerType;
    const ft = FLOWER_TYPES[ftKey];
    if (state.nectar >= ft.cost) {
      state.nectar -= ft.cost;
      const f = new Flower(gx, gy, ftKey);
      state.flowers.push(f);
      state.grid[gx][gy] = f;
    } else {
      // small feedback
      for (let i = 0; i < 6; i++) state.particles.push(Particle.spawn(world.x, world.y, '#ffc7c7'));
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { if (!state.waveRunning) spawnWave(); }
    if (e.key === '1') state.selectedFlowerType = 'sunflower';
    if (e.key === '2') state.selectedFlowerType = 'rose';
    if (e.key === '3') state.selectedFlowerType = 'lavender';
    if (e.key === '4') state.selectedFlowerType = 'daisy';
  });

  // --- HUD / Controls content ---
  function rebuildControls() {
    controls.innerHTML = '';
    const info = document.createElement('div');
    info.style.cssText = 'pointer-events:none';
    info.innerHTML = `Néctar: <strong id='hud-nectar'>${Math.floor(state.nectar)}</strong> 🍯 &nbsp; Salud: <strong id='hud-health'>${state.health}</strong> ❤ &nbsp; Oleada: <strong id='hud-wave'>${state.wave}</strong>`;
    controls.appendChild(info);

    const tips = document.createElement('div'); tips.style.cssText = 'font-size:12px;color:#333;';
    tips.innerHTML = `Selecciona flor: 1-Girasol 2-Rosa 3-Lavanda 4-Margarita · Click para plantar · Espacio = iniciar oleada`;
    controls.appendChild(tips);
  }
  rebuildControls();

  // --- Main loop ---
  function update(dt) {
    if (paused) return;
    // passive nectar
    state.nectar += state.moneyGainRate * dt;
    // update flowers
    for (const f of state.flowers) f.update(dt);
    // update pests
    for (const p of state.pests) p.update(dt);
    state.pests = state.pests.filter(p => p.alive);
    // update projectiles
    for (const pr of state.projectiles) pr.update(dt);
    state.projectiles = state.projectiles.filter(p => p.alive);
    // update particles
    for (const part of state.particles) part.update(dt);
    state.particles = state.particles.filter(p => p.life > 0);

    // update HUD numbers
    const nectarEl = sidebar.querySelector('#nectar-count'); if (nectarEl) nectarEl.innerText = Math.floor(state.nectar);
    const healthEl = sidebar.querySelector('#health-count'); if (healthEl) healthEl.innerText = state.health;
    const waveEl = sidebar.querySelector('#wave-count'); if (waveEl) waveEl.innerText = state.wave;
    const hudN = controls.querySelector('#hud-nectar'); if (hudN) hudN.innerText = Math.floor(state.nectar);
    const hudH = controls.querySelector('#hud-health'); if (hudH) hudH.innerText = state.health;
    const hudW = controls.querySelector('#hud-wave'); if (hudW) hudW.innerText = state.wave;

    // victory increment difficulty slowly if many waves cleared
   // Si ya no quedan plagas, la oleada terminó
if (state.waveRunning && state.pests.length === 0) {
    state.waveRunning = false;
}

  }

  function drawGrid(ctx) {
    ctx.save();
    // draw tiles faintly
    for (let gx = 0; gx < GRID_W; gx++) for (let gy = 0; gy < GRID_H; gy++) {
      const x = gx * TILE, y = gy * TILE;
      ctx.fillStyle = (gx+gy) % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
      ctx.fillRect(x,y,TILE,TILE);
    }
    ctx.restore();
  }

  function drawPath(ctx) {
    ctx.save();
    ctx.lineWidth = 20; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(140,80,40,0.16)';
    ctx.beginPath();
    if (state.path.length > 0) { ctx.moveTo(state.path[0].x, state.path[0].y); for (let p of state.path) ctx.lineTo(p.x, p.y); ctx.stroke(); }
    // edge plantables shading
    ctx.restore();
  }

  function draw(ctx) {
    ctx.clearRect(0,0,canvas.width, canvas.height);

    drawGrid(ctx);
    drawPath(ctx);

    // draw flowers (under pests so petals behind)
    for (const f of state.flowers) f.draw(ctx);

    // draw projectiles
    for (const pr of state.projectiles) pr.draw(ctx);

    // draw pests
    for (const p of state.pests) p.draw(ctx);

    // draw particles
    for (const part of state.particles) part.draw(ctx);

    // draw ghost of selected flower at mouse
    const gx = state.mouse.gridX, gy = state.mouse.gridY;
    const world = gridToWorld(gx, gy);
    const ft = FLOWER_TYPES[state.selectedFlowerType];
    ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(world.x, world.y);
    // check occupancy or path
    let ok = !state.grid[gx][gy];
    for (let p of state.path) if (Math.hypot(p.x - world.x, p.y - world.y) < TILE*0.6) ok = false;
    ctx.beginPath(); ctx.arc(0, 0, TILE*0.4, 0, Math.PI*2); ctx.fillStyle = ok ? 'rgba(120,200,120,0.12)' : 'rgba(200,120,120,0.12)'; ctx.fill();
    // draw preview flower center
    ctx.beginPath(); ctx.arc(0, -TILE*0.05, TILE*0.12 * ft.size, 0, Math.PI*2); ctx.fillStyle = ft.color; ctx.fill();
    ctx.restore();

    // small legend
    ctx.save(); ctx.font = '12px sans-serif'; ctx.fillStyle = '#1b3b2d'; ctx.fillText('Flores: ' + state.flowers.length + ' · Plagas: ' + state.pests.length, 12, canvas.height - 24);
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw(ctx);
    if (!paused) requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // --- Extra: small guide overlay ---
  const help = document.createElement('div');
  help.style.cssText = 'position:absolute;left:12px;top:60px;background:rgba(255,255,255,0.9);padding:8px;border-radius:6px;font-size:13px;';
  help.innerHTML = `<strong>Jardín en Flor</strong><div style='margin-top:6px;font-size:12px'>Click planta flores · Espacio inicia oleada · 1-4 cambia flor</div>`;
  container.appendChild(help);

  // --- Resize handling ---
  window.addEventListener('resize', ()=>{/* no-op to keep canvas stable */});

  // --- Expose some debug functions en consola ---
  window._jardin = {
    state,
    spawnWave,
    buildPath: () => { state.path = buildPath(); }
  };
})();
