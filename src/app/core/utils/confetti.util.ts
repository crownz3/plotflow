/**
 * Lightweight, zero-dependency HTML5 Canvas Confetti Utility
 * Provides celebration animations for closing deals, winning leads, and milestones.
 */

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

export function fireConfetti(durationMs: number = 2500): void {
  if (typeof document === 'undefined') return;

  // Create canvas overlay
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas-overlay';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const colors = ['#1A73E8', '#1E8E3E', '#F9AB00', '#EA4335', '#9334E8', '#00C853', '#FFD600'];
  const particles: Particle[] = [];
  const particleCount = 120;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 1.2) * 16,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }

  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed > durationMs) {
      canvas.remove();
      return;
    }

    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - elapsed / durationMs);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

