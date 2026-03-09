(() => {
  // Numbers going CLOCKWISE (exact order you gave)
  const VALUES = [100, 5, 90, 25, 70, 45, 10, 65, 30, 95, 55, 75, 40, 20, 60, 35, 80, 15];
  const N = VALUES.length;

  // --- Tuning knobs ---
  const MAX_INITIAL_SPEED = 16.0;   // rad/s at 100 power
  const MIN_INITIAL_SPEED = 2.0;    // rad/s at 0 power
  const DRAG_PER_SECOND = 0.55;     // bigger = stops faster; smaller = spins longer
  const STOP_SPEED = 0.06;          // rad/s threshold to stop

  // Geometry
  const POINTER_ANGLE = -Math.PI / 2; // pointer is at top
  const START_ANGLE = -Math.PI / 2;   // slice #0 begins at top (matches drawing)

  // Visual
  const OUTER_RING_WIDTH = 34;
  const GOLD = "#ffd54a";

  // DOM
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");

  const power = document.getElementById("power");
  const powerVal = document.getElementById("powerVal");
  const spinBtn = document.getElementById("spinBtn");

  const resultValue = document.getElementById("resultValue");
  const resultDetail = document.getElementById("resultDetail");

  const tickSoundToggle = document.getElementById("tickSound");
  const historyEl = document.getElementById("spinHistory");

  // State
  let spinning = false;
  let rot = 0;        // radians (clockwise +)
  let omega = 0;      // rad/s
  let lastT = 0;
  let lastIndex = null;

  // --- Audio (tick) ---
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function playTick() {
    if (!tickSoundToggle || !tickSoundToggle.checked) return;
    ensureAudio();

    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    o.type = "square";
    o.frequency.value = 1800;

    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    o.connect(g);
    g.connect(audioCtx.destination);

    o.start(now);
    o.stop(now + 0.035);
  }

  // --- Helpers ---
  function normalize(rad) {
    const twoPi = Math.PI * 2;
    rad = rad % twoPi;
    if (rad < 0) rad += twoPi;
    return rad;
  }

  function setRotation(rad) {
    rot = normalize(rad);
    canvas.style.transform = `rotate(${(rot * 180) / Math.PI}deg)`;
  }

  // Which slice is currently under the pointer?
  function indexUnderPointer(rotationRad) {
    const seg = (Math.PI * 2) / N;

    // Wheel-local angle under pointer
    const local = normalize(POINTER_ANGLE - rotationRad);

    // Convert into slice space starting at START_ANGLE
    const delta = normalize(local - START_ANGLE);

    // Epsilon prevents boundary flicker
    const eps = 1e-9;
    return Math.floor((delta + eps) / seg);
  }

  // Snap wheel rotation so pointer lands on CENTER of slice idx
  function snapRotationToIndex(idx) {
    const seg = (Math.PI * 2) / N;

    // Wheel-local center angle of that slice
    const desiredLocalCenter = normalize(START_ANGLE + idx * seg + seg / 2);

    // Want: POINTER_ANGLE - rot = desiredLocalCenter  =>  rot = POINTER_ANGLE - desiredLocalCenter
    const snapped = normalize(POINTER_ANGLE - desiredLocalCenter);
    setRotation(snapped);
  }

  function addHistory(val) {
    if (!historyEl) return;

    const li = document.createElement("li");
    const when = new Date();

    li.innerHTML = `
      <span class="hist-val">${val}</span>
      <span class="hist-date">${when.toLocaleString()}</span>
    `;

    historyEl.prepend(li);

    while (historyEl.children.length > 12) {
      historyEl.removeChild(historyEl.lastElementChild);
    }
  }

  // --- HiDPI canvas scaling ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const size = Math.round(Math.min(rect.width, rect.height));

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWheel();
  }

  window.addEventListener("resize", resizeCanvas);

  // --- Drawing ---
  function colorFor(value) {
    if (value === 100) return "#e53935";            // red
    if (value === 5 || value === 15) return "#2e7d32"; // green
    return "#101010";                               // black
  }

  function drawWheel() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;

    const r = Math.min(w, h) / 2 - 6;
    const seg = (Math.PI * 2) / N;

    ctx.clearRect(0, 0, w, h);

    // Outer gold ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = GOLD;
    ctx.stroke();

    const innerR = r - OUTER_RING_WIDTH;

    // Segments + numbers
    for (let i = 0; i < N; i++) {
      const a0 = START_ANGLE + i * seg;
      const a1 = a0 + seg;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, innerR, a0, a1);
      ctx.closePath();
      ctx.fillStyle = colorFor(VALUES[i]);
      ctx.fill();

      // Divider
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, innerR, a0, a0);
      ctx.lineWidth = 3;
      ctx.strokeStyle = GOLD;
      ctx.stroke();

      // Text
      ctx.save();
      const mid = (a0 + a1) / 2;
      const tx = cx + Math.cos(mid) * (innerR - 22);
      const ty = cy + Math.sin(mid) * (innerR - 22);

      ctx.translate(tx, ty);
      ctx.rotate(mid + Math.PI / 2);

      ctx.font = "900 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(String(VALUES[i]), 0, 0);

      ctx.fillStyle = "#fff";
      ctx.fillText(String(VALUES[i]), 0, 0);

      ctx.restore();
    }

    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.63, 0, Math.PI * 2);
    ctx.fillStyle = "#2a2a2a";
    ctx.fill();

    // Center "$"
    ctx.save();
    ctx.translate(cx, cy);
    ctx.font = "900 210px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(200, 200, 200, 0.35)";
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 6;
    ctx.fillText("$", 0, 8);
    ctx.strokeText("$", 0, 8);
    ctx.restore();
  }

  // --- Spin ---
  function startSpin() {
    if (spinning) return;

    ensureAudio(); // allow tick sound

    spinning = true;
    spinBtn.disabled = true;

    resultValue.textContent = "—";
    resultDetail.textContent = "Spinning...";

    const p = Number(power.value) / 100;
    const shaped = Math.pow(p, 1.35);

    omega = MIN_INITIAL_SPEED + shaped * (MAX_INITIAL_SPEED - MIN_INITIAL_SPEED);
    omega *= 0.92 + Math.random() * 0.18; // slight randomness

    lastT = performance.now();
    lastIndex = indexUnderPointer(rot);

    requestAnimationFrame(tick);
  }

  function finishSpin(finalIdx) {
    // ✅ snap the wheel so the visual ALWAYS matches the number
    snapRotationToIndex(finalIdx);

    const val = VALUES[finalIdx];
    resultValue.textContent = String(val);
    resultDetail.textContent = `Stopped on ${val}.`;

    addHistory(val);

    spinning = false;
    spinBtn.disabled = false;
  }

  function tick(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    // rotate
    setRotation(rot + omega * dt);

    // drag (exponential decay)
    omega *= Math.exp(-DRAG_PER_SECOND * dt);

    // tick sound on slice changes
    const idx = indexUnderPointer(rot);
    if (idx !== lastIndex) {
      playTick();
      lastIndex = idx;
    }

    // stop
    if (omega <= STOP_SPEED) {
      omega = 0;
      const finalIdx = indexUnderPointer(rot);
      finishSpin(finalIdx);
      return;
    }

    requestAnimationFrame(tick);
  }

  // --- UI ---
  powerVal.textContent = power.value;
  power.addEventListener("input", () => {
    powerVal.textContent = power.value;
  });

  spinBtn.addEventListener("click", startSpin);

  // init
  resizeCanvas();
  setRotation(0);
})();