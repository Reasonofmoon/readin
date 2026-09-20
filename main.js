const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------
 * Growth curve of the hero sprout.
 * TODO(원장님/개발자): this is the one piece of "philosophy as code".
 * pours = how many times the visitor pressed "물 한 바가지 붓기".
 * Return a fraction between 0 (seed) and 1 (fully grown, shown as 30cm).
 *   - linear:       Math.min(pours / 20, 1)        every pour counts the same
 *   - diminishing:  1 - Math.exp(-pours / 8)       fast start, slow finish
 *   - late bloomer: Math.min((pours / 20) ** 2, 1) nothing at first, then a burst
 * ------------------------------------------------------------------ */
function sproutHeight(pours) {
  return 1 - Math.exp(-pours / 8);
}

const MAX_CM = 30;
const STORE_KEY = "readin-pours";

/* ---------- nav ---------- */
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

function setNavOpen(open) {
  navLinks.dataset.open = String(open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.textContent = open ? "닫기" : "메뉴";
}
navToggle.addEventListener("click", () => setNavOpen(navLinks.dataset.open !== "true"));
navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) setNavOpen(false);
});

/* ---------- jar: letters pour in, leak out of the broken bottom ---------- */
const VIEW_W = 400;
const VIEW_H = 640;
const MOUTH_Y = 60;
const HOLE_X = 201;
const HOLE_Y = 400;
const GLYPHS = [..."가나다라마바사아자차카타파하책글말생각꿈왜ㄱㄴㄷㄹㅁㅂㅅㅇㅎㅏㅗㅜ?!"];
const MAX_PARTICLES = 420;

const canvas = document.querySelector(".jar-canvas");
const ctx = canvas.getContext("2d");
const particles = [];
let scale = 1;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  scale = canvas.width / VIEW_W;
}

function spawn(spread = 34) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({
    x: VIEW_W / 2 + (Math.random() - 0.5) * 2 * spread,
    y: -20 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 1 + Math.random() * 1.5,
    size: 13 + Math.random() * 14,
    spin: (Math.random() - 0.5) * 0.06,
    angle: Math.random() * Math.PI,
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    yellow: Math.random() < 0.3,
    leaked: false,
  });
}

function step() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 0.1;
    const inside = p.y > MOUTH_Y && p.y < HOLE_Y;
    if (inside) {
      // Funnel toward the hole; the jar body hides this part anyway.
      p.x += (HOLE_X - p.x) * 0.05;
      p.vy = Math.min(p.vy, 3.2);
    } else if (p.y >= HOLE_Y && !p.leaked) {
      p.leaked = true;
      p.vx = (Math.random() - 0.5) * 1.6;
      p.vy = 1.2;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.spin;
    if (p.y > VIEW_H + 30) particles.splice(i, 1);
  }
}

function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of particles) {
    const fadeIn = Math.min(Math.max((p.y + 20) / 40, 0), 1);
    const fadeOut = Math.min(Math.max((VIEW_H - p.y) / 70, 0), 1);
    ctx.globalAlpha = fadeIn * fadeOut;
    ctx.fillStyle = p.yellow ? "#FFD447" : "#FFFFFF";
    ctx.font = `${p.size}px "Bagel Fat One", sans-serif`;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillText(p.glyph, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

let frame = 0;
let jarVisible = true;
function loop() {
  if (jarVisible) {
    if (frame % 4 === 0) spawn();
    step();
    draw();
    frame++;
  }
  requestAnimationFrame(loop);
}

function startJar() {
  resizeCanvas();
  if (reduceMotion) {
    // Static snapshot: simulate quietly, draw once.
    for (let i = 0; i < 400; i++) {
      if (i % 4 === 0) spawn();
      step();
    }
    draw();
    return;
  }
  new IntersectionObserver(([entry]) => { jarVisible = entry.isIntersecting; }).observe(canvas);
  loop();
}

window.addEventListener("resize", () => {
  resizeCanvas();
  if (reduceMotion) draw();
});
document.fonts.ready.then(startJar);

/* ---------- pour button, tally, hero sprout ---------- */
const pourButton = document.getElementById("pour");
const poursOut = document.getElementById("t-pours");
const cmOut = document.getElementById("t-cm");
const heroSprout = document.querySelector(".hero-sprout");

function readPours() {
  try {
    const saved = Number(localStorage.getItem(STORE_KEY));
    return Number.isFinite(saved) && saved > 0 ? Math.floor(saved) : 0;
  } catch {
    return 0;
  }
}
function writePours(value) {
  try { localStorage.setItem(STORE_KEY, String(value)); } catch { /* private mode: keep in memory only */ }
}

let pours = readPours();

function renderTally() {
  const grown = Math.min(Math.max(sproutHeight(pours), 0), 1);
  poursOut.textContent = pours.toLocaleString("ko-KR");
  cmOut.textContent = (grown * MAX_CM).toFixed(1);
  heroSprout.style.setProperty("--grow", grown.toFixed(4));
}

pourButton.addEventListener("click", () => {
  pours += 1;
  writePours(pours);
  renderTally();
  for (let i = 0; i < 46; i++) spawn(44);
  if (reduceMotion) {
    for (let i = 0; i < 60; i++) step();
    draw();
  }
});
renderTally();

/* ---------- stream that follows the scroll ---------- */
const flow = document.querySelector(".flow");
const stream = document.querySelector(".stream");
let streamQueued = false;

function updateStream() {
  streamQueued = false;
  const top = flow.getBoundingClientRect().top;
  const total = flow.offsetHeight + 40;
  const reach = reduceMotion ? total : window.innerHeight * 0.62 - top + 26;
  stream.style.height = `${Math.min(Math.max(reach, 0), total)}px`;
}
function queueStream() {
  if (streamQueued) return;
  streamQueued = true;
  requestAnimationFrame(updateStream);
}
window.addEventListener("scroll", queueStream, { passive: true });
window.addEventListener("resize", queueStream);
new ResizeObserver(queueStream).observe(flow);
updateStream();

/* ---------- 원고지 ---------- */
for (const sheet of document.querySelectorAll(".wongoji")) {
  const cols = Number(sheet.dataset.cols);
  const rows = Number(sheet.dataset.rows);
  const [circleAt, circleSpan] = sheet.dataset.circle.split(",").map(Number);
  const chars = [...sheet.dataset.text];
  sheet.style.setProperty("--cols", String(cols));
  sheet.setAttribute("role", "img");
  sheet.setAttribute("aria-label", `원고지에 쓴 학생 글: ${sheet.dataset.text.trim()}`);
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement("span");
    cell.textContent = chars[i]?.trim() ?? "";
    if (i === circleAt) {
      cell.className = "circle-start";
      cell.style.setProperty("--span", String(circleSpan));
    }
    sheet.append(cell);
  }
}

/* ---------- bookshelf ---------- */
const spines = [...document.querySelectorAll(".spine")];
const bookOut = {
  class: document.getElementById("b-class"),
  title: document.getElementById("b-title"),
  author: document.getElementById("b-author"),
  q: document.getElementById("b-q"),
};
for (const spine of spines) {
  spine.addEventListener("click", () => {
    for (const other of spines) other.setAttribute("aria-pressed", String(other === spine));
    bookOut.class.textContent = spine.dataset.class;
    bookOut.title.textContent = spine.dataset.title;
    bookOut.author.textContent = spine.dataset.author;
    bookOut.q.textContent = spine.dataset.q;
  });
}

/* ---------- closing 콩나물시루 ---------- */
const siru = document.querySelector(".siru");
const SPROUT_HEIGHTS = [52, 78, 40, 88, 64, 94, 48, 82, 58, 90, 44, 72];
SPROUT_HEIGHTS.forEach((height, i) => {
  const sprout = document.createElement("div");
  sprout.className = "sprout";
  sprout.style.setProperty("--to", `${height}%`);
  sprout.style.setProperty("--delay", `${(i * 0.09).toFixed(2)}s`);
  sprout.style.setProperty("--tilt", `${(i % 3 - 1) * 4}deg`);
  for (const part of ["bean", "stem"]) {
    const piece = document.createElement("i");
    piece.className = part;
    sprout.append(piece);
  }
  siru.append(sprout);
});
new IntersectionObserver(([entry], observer) => {
  if (!entry.isIntersecting) return;
  siru.dataset.grown = "true";
  observer.disconnect();
}, { threshold: 0.35 }).observe(siru);

/* ---------- sample form (no backend) ---------- */
const form = document.getElementById("apply-form");
const formStatus = form.querySelector(".form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const grade = form.elements.namedItem("grade");
  const phone = form.elements.namedItem("phone");
  const phoneOk = /^[0-9\-\s]{9,14}$/.test(phone.value.trim());
  grade.setAttribute("aria-invalid", String(!grade.value));
  phone.setAttribute("aria-invalid", String(!phoneOk));

  if (!grade.value || !phoneOk) {
    formStatus.dataset.state = "error";
    formStatus.textContent = !grade.value
      ? "아이 학년을 골라 주세요."
      : "전화번호를 숫자로 적어 주세요. 예: 010-1234-5678";
    (!grade.value ? grade : phone).focus();
    return;
  }
  formStatus.dataset.state = "ok";
  formStatus.textContent = "상담 신청을 받았습니다. 샘플 화면이라 실제로 전송되지는 않습니다.";
  form.reset();
});
