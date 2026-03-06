/* global Matter */
(() => {
  const {
    Engine,
    Render,
    Runner,
    World,
    Bodies,
    Body,
    Events,
    Composite
  } = Matter;

  // ---------- DOM ----------
  const mount = document.getElementById("plinkoMount");
  const scoreEl = document.getElementById("scoreTotal");
  const dropsEl = document.getElementById("dropCount");
  const historyEl = document.getElementById("history");
  const resetBtn = document.getElementById("resetBtn");

  if (!mount) return;

  // ---------- GAME CONFIG ----------
  const W = 520;
  const H = 760;

  // Bin values (edit these anytime)
  const BIN_VALUES = [10, 50, 100, 250, 500, 250, 100, 50, 10];

  // Peg layout
  const PEG_RADIUS = 7;
  const PEG_GAP_X = 52;
  const PEG_GAP_Y = 48;
  const PEG_ROWS = 10;
  const PEG_START_Y = 110;

  // Coin
  const COIN_RADIUS = 18;

  // Physics tuning (feel free to tweak)
  const GRAVITY = 1.05;
  const COIN_RESTITUTION = 0.55; // bounciness
  const COIN_FRICTION = 0.01;
  const COIN_AIR = 0.0008;

  // ---------- STATE ----------
  let totalScore = 0;
  let dropCount = 0;

  const coins = new Set(); // track dynamic coin bodies (for reset)

  // ---------- ENGINE / RENDER ----------
  const engine = Engine.create();
  engine.world.gravity.y = GRAVITY;

  const render = Render.create({
    element: mount,
    engine,
    options: {
      width: W,
      height: H,
      wireframes: false,
      background: "transparent",
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
    }
  });

  Render.run(render);

  const runner = Runner.create();
  Runner.run(runner, engine);

  // ---------- BUILD BOARD ----------
  // Walls
  const wallThickness = 30;
  const leftWall = Bodies.rectangle(-wallThickness / 2, H / 2, wallThickness, H, {
    isStatic: true,
    render: { fillStyle: "rgba(255,255,255,0.15)" }
  });
  const rightWall = Bodies.rectangle(W + wallThickness / 2, H / 2, wallThickness, H, {
    isStatic: true,
    render: { fillStyle: "rgba(255,255,255,0.15)" }
  });
  const ceiling = Bodies.rectangle(W / 2, 0, W, 20, {
    isStatic: true,
    render: { visible: false }
  });

  // Floor (just in case a coin misses sensors)
  const floor = Bodies.rectangle(W / 2, H + 10, W + 200, 40, {
    isStatic: true,
    render: { visible: false }
  });

  World.add(engine.world, [leftWall, rightWall, ceiling, floor]);

  // Pegs
  const pegBodies = [];
  for (let row = 0; row < PEG_ROWS; row++) {
    const y = PEG_START_Y + row * PEG_GAP_Y;
    const isOffset = row % 2 === 1;
    const cols = Math.floor(W / PEG_GAP_X);
    for (let c = 0; c <= cols; c++) {
      const x = c * PEG_GAP_X + (isOffset ? PEG_GAP_X / 2 : 0);

      // keep within walls
      if (x < 28 || x > W - 28) continue;

      const peg = Bodies.circle(x, y, PEG_RADIUS, {
        isStatic: true,
        render: {
          fillStyle: "rgba(135, 212, 255, 0.9)",
          strokeStyle: "rgba(255,255,255,0.25)",
          lineWidth: 1
        }
      });
      pegBodies.push(peg);
    }
  }
  World.add(engine.world, pegBodies);

  // Bins (dividers) + sensors for scoring
  const binsYTop = H - 170;
  const binsYBottom = H - 40;

  const binCount = BIN_VALUES.length;
  const binWidth = W / binCount;

  // dividers
  const dividers = [];
  for (let i = 1; i < binCount; i++) {
    dividers.push(
      Bodies.rectangle(i * binWidth, (binsYTop + binsYBottom) / 2, 10, (binsYBottom - binsYTop), {
        isStatic: true,
        render: { fillStyle: "rgba(255,255,255,0.35)" }
      })
    );
  }

  // bin base strip (for looks)
  const binBase = Bodies.rectangle(W / 2, binsYBottom + 18, W, 10, {
    isStatic: true,
    render: { fillStyle: "rgba(255, 0, 180, 0.35)" }
  });

  World.add(engine.world, [...dividers, binBase]);

  // sensors (one per bin)
  const sensors = [];
  for (let i = 0; i < binCount; i++) {
    const sensor = Bodies.rectangle(
      i * binWidth + binWidth / 2,
      binsYBottom - 10,
      binWidth - 12,
      18,
      {
        isStatic: true,
        isSensor: true,
        label: `sensor:${BIN_VALUES[i]}`,
        render: { visible: false }
      }
    );
    sensors.push(sensor);
  }
  World.add(engine.world, sensors);

  // Draw bin values as static text overlays (simple HTML on top of canvas)
  // (Canvas text would require custom render; HTML is easiest)
  const labelsWrap = document.createElement("div");
  labelsWrap.className = "bin-labels";
labelsWrap.style.position = "absolute";
labelsWrap.style.left = "50%";
labelsWrap.style.transform = "translateX(-50%)";
labelsWrap.style.bottom = "18px";

labelsWrap.style.width = `${W}px`;                 // match canvas width (520px)
labelsWrap.style.maxWidth = "calc(100% - 20px)";   // still fits on small screens

labelsWrap.style.display = "grid";
labelsWrap.style.gridTemplateColumns = `repeat(${binCount}, 1fr)`;
labelsWrap.style.gap = "0";
labelsWrap.style.justifyItems = "center";          // center each number in its cell
labelsWrap.style.pointerEvents = "none";
labelsWrap.style.zIndex = "3";
labelsWrap.style.padding = "0";

  // mount's parent is .plinko-mount, parent of canvas is mount container
  // The canvas is inside mount; we want labels over the canvas.
  const boardSection = mount.closest(".plinko-board");
  if (boardSection) boardSection.appendChild(labelsWrap);

  BIN_VALUES.forEach((v) => {
    const d = document.createElement("div");
    d.style.textAlign = "center";
    d.style.fontWeight = "900";
    d.style.color = "rgba(255,255,255,0.95)";
    d.style.textShadow = "0 4px 18px rgba(0,0,0,0.7)";
    d.style.fontSize = "18px";
    d.textContent = v;
    labelsWrap.appendChild(d);
  });

  // ---------- COLLISION SCORING ----------
  Events.on(engine, "collisionStart", (evt) => {
    for (const pair of evt.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;

      // coin vs sensor (either order)
      const coin = isCoin(a) ? a : isCoin(b) ? b : null;
      const sensor = isSensor(a) ? a : isSensor(b) ? b : null;

      if (!coin || !sensor) continue;

      // score each coin only once
      if (coin.plugin && coin.plugin.scored) continue;

      const value = parseInt(sensor.label.split(":")[1], 10) || 0;

      totalScore += value;
      dropCount += 1;

      coin.plugin = coin.plugin || {};
      coin.plugin.scored = true;
      coin.plugin.value = value;

      updateUI(value);

      // Remove the coin a moment later so it looks like it "settles" briefly
      setTimeout(() => {
        if (coins.has(coin)) {
          World.remove(engine.world, coin);
          coins.delete(coin);
        }
      }, 350);
    }
  });

  function isCoin(body) {
    return body && body.label === "coin";
  }
  function isSensor(body) {
    return body && typeof body.label === "string" && body.label.startsWith("sensor:");
  }

  // ---------- DROPPING COINS ----------
  const canvas = render.canvas;

  canvas.style.cursor = "pointer";

  canvas.addEventListener("click", (e) => {
    const pos = getMouseWorldPos(e);
    if (!pos) return;

    // allow click only in top zone
    if (pos.y > 90) return;

    dropCoin(pos.x);
  });

  function dropCoin(x) {
    // clamp away from walls
    const margin = 34;
    const clampedX = Math.max(margin, Math.min(W - margin, x));

    const coin = Bodies.circle(clampedX, 60, COIN_RADIUS, {
      label: "coin",
      restitution: COIN_RESTITUTION,
      friction: COIN_FRICTION,
      frictionAir: COIN_AIR,
      density: 0.008,
      render: {
        fillStyle: "#ffd54a",
        strokeStyle: "rgba(255,255,255,0.65)",
        lineWidth: 2
      }
    });

    // tiny random push so drops aren't identical
    Body.setVelocity(coin, { x: (Math.random() - 0.5) * 1.2, y: 0 });

    coins.add(coin);
    World.add(engine.world, coin);
  }

  function getMouseWorldPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  }

  // ---------- UI ----------
  function updateUI(lastValue) {
    scoreEl.textContent = String(totalScore);
    dropsEl.textContent = String(dropCount);

    const li = document.createElement("li");
    li.innerHTML = `<span>+${lastValue}</span><strong>${totalScore}</strong>`;
    historyEl.prepend(li);

    // keep list short
    while (historyEl.children.length > 10) historyEl.removeChild(historyEl.lastChild);
  }

  // ---------- RESET ----------
  resetBtn.addEventListener("click", () => {
    // remove coins only
    for (const coin of Array.from(coins)) {
      World.remove(engine.world, coin);
      coins.delete(coin);
    }

    totalScore = 0;
    dropCount = 0;
    scoreEl.textContent = "0";
    dropsEl.textContent = "0";
    historyEl.innerHTML = "";
  });

})();