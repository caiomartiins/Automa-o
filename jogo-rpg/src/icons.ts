import type { IconShape } from './data/items';
import type { SkillGlyph } from './data/skills';

/** Ícones de itens e habilidades desenhados por código (40x40), com contorno escuro */
const S = 40;
const OUT = '#2a1c14';
const cache = new Map<string, string>();
const canvases = new Map<string, HTMLCanvasElement>();

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function path(ctx: CanvasRenderingContext2D, fill: string, draw: () => void, lw = 2.2) {
  ctx.beginPath(); draw();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
}

function drawItem(ctx: CanvasRenderingContext2D, shape: IconShape, c: string) {
  const light = shade(c, 0.45), dark = shade(c, -0.35);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  switch (shape) {
    case 'pocao': {
      path(ctx, c, () => { ctx.moveTo(16, 10); ctx.lineTo(24, 10); ctx.lineTo(24, 17); ctx.arc(20, 26, 10, -Math.PI / 2 + 0.6, Math.PI * 1.5 - 0.6); ctx.closePath(); });
      ctx.fillStyle = '#c8a070'; ctx.fillRect(15, 6, 10, 5); ctx.strokeRect(15, 6, 10, 5);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(16, 24, 2.5, 4, 0.3, 0, 7); ctx.fill();
      break;
    }
    case 'asa': {
      path(ctx, c, () => { ctx.moveTo(8, 30); ctx.quadraticCurveTo(10, 8, 33, 7); ctx.quadraticCurveTo(28, 16, 31, 18); ctx.quadraticCurveTo(24, 22, 26, 26); ctx.quadraticCurveTo(16, 28, 8, 30); });
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, 28); ctx.lineTo(28, 11); ctx.stroke();
      break;
    }
    case 'gosma': {
      path(ctx, c, () => { ctx.moveTo(7, 30); ctx.quadraticCurveTo(6, 14, 20, 12); ctx.quadraticCurveTo(34, 14, 33, 30); ctx.closePath(); });
      ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(15, 19, 3, 4, 0, 0, 7); ctx.fill();
      break;
    }
    case 'pelo': {
      path(ctx, c, () => { ctx.moveTo(6, 26); for (let i = 0; i <= 6; i++) ctx.lineTo(8 + i * 4, i % 2 ? 10 : 14); ctx.lineTo(34, 28); ctx.quadraticCurveTo(20, 34, 6, 26); });
      ctx.strokeStyle = dark; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 5, 17); ctx.lineTo(13 + i * 5, 27); ctx.stroke(); }
      break;
    }
    case 'presa': {
      path(ctx, c, () => { ctx.moveTo(13, 8); ctx.quadraticCurveTo(30, 12, 27, 34); ctx.quadraticCurveTo(21, 22, 12, 16); ctx.closePath(); });
      break;
    }
    case 'osso': {
      ctx.save(); ctx.translate(20, 20); ctx.rotate(-0.7);
      path(ctx, c, () => {
        ctx.rect(-11, -3, 22, 6);
        ctx.moveTo(-10, 0); ctx.arc(-13, -4, 4, 0, 7); ctx.moveTo(-10, 0); ctx.arc(-13, 4, 4, 0, 7);
        ctx.moveTo(16, -4); ctx.arc(13, -4, 4, 0, 7); ctx.moveTo(16, 4); ctx.arc(13, 4, 4, 0, 7);
      });
      ctx.restore();
      break;
    }
    case 'galho': {
      ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(8, 33); ctx.lineTo(31, 8); ctx.moveTo(20, 21); ctx.lineTo(28, 25); ctx.stroke();
      ctx.lineWidth = 3.5; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(8, 33); ctx.lineTo(31, 8); ctx.moveTo(20, 21); ctx.lineTo(28, 25); ctx.stroke();
      path(ctx, '#58c25a', () => { ctx.ellipse(31, 25, 5, 3, 0.5, 0, 7); });
      break;
    }
    case 'chifre': {
      path(ctx, c, () => { ctx.moveTo(10, 34); ctx.quadraticCurveTo(6, 12, 30, 6); ctx.quadraticCurveTo(18, 16, 20, 34); ctx.closePath(); });
      ctx.strokeStyle = light; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i, 26 - i * 6); ctx.lineTo(19 + i * 2, 27 - i * 7); ctx.stroke(); }
      break;
    }
    case 'folha': {
      path(ctx, c, () => { ctx.moveTo(8, 32); ctx.quadraticCurveTo(6, 10, 32, 8); ctx.quadraticCurveTo(32, 30, 8, 32); });
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(9, 31); ctx.lineTo(28, 12); ctx.stroke();
      break;
    }
    case 'faca': case 'espada': {
      const long = shape === 'espada';
      ctx.save(); ctx.translate(20, 20); ctx.rotate(-Math.PI / 4);
      const L = long ? 15 : 9;
      path(ctx, c, () => { ctx.moveTo(-3, 4); ctx.lineTo(-3, -L); ctx.lineTo(0, -L - 5); ctx.lineTo(3, -L); ctx.lineTo(3, 4); ctx.closePath(); });
      path(ctx, '#c9a14a', () => { ctx.rect(-8, 4, 16, 3.5); });
      path(ctx, '#6b4226', () => { ctx.rect(-2, 7.5, 4, 8); });
      ctx.restore();
      break;
    }
    case 'cajado': {
      ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(10, 35); ctx.lineTo(27, 12); ctx.stroke();
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#8a5a2b'; ctx.beginPath(); ctx.moveTo(10, 35); ctx.lineTo(27, 12); ctx.stroke();
      path(ctx, c, () => { ctx.arc(28, 10, 6, 0, 7); });
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(26, 8, 2, 0, 7); ctx.fill();
      break;
    }
    case 'arco': {
      ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.arc(10, 30, 22, -Math.PI / 2 + 0.15, -0.15); ctx.stroke();
      ctx.lineWidth = 3.5; ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(10, 30, 22, -Math.PI / 2 + 0.15, -0.15); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(13, 8.5); ctx.lineTo(31.5, 27); ctx.stroke();
      break;
    }
    case 'roupa': case 'cota': case 'colete': {
      path(ctx, c, () => { ctx.moveTo(12, 8); ctx.lineTo(28, 8); ctx.lineTo(35, 15); ctx.lineTo(30, 19); ctx.lineTo(29, 34); ctx.lineTo(11, 34); ctx.lineTo(10, 19); ctx.lineTo(5, 15); ctx.closePath(); });
      if (shape === 'cota') { ctx.fillStyle = dark; for (let y = 13; y < 33; y += 4) for (let x = 12 + (y % 8 ? 2 : 0); x < 29; x += 4) ctx.fillRect(x, y, 1.6, 1.6); }
      if (shape === 'colete') { ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 9); ctx.lineTo(20, 34); ctx.stroke(); }
      if (shape === 'roupa') { ctx.fillStyle = light; ctx.fillRect(16, 9, 8, 4); }
      break;
    }
    case 'manto': {
      path(ctx, c, () => { ctx.moveTo(14, 7); ctx.lineTo(26, 7); ctx.quadraticCurveTo(34, 22, 34, 35); ctx.lineTo(6, 35); ctx.quadraticCurveTo(6, 22, 14, 7); });
      path(ctx, '#e3b84a', () => { ctx.arc(20, 11, 3, 0, 7); }, 1.5);
      break;
    }
    case 'anel': {
      ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.arc(20, 24, 9, 0, 7); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = '#e3b84a'; ctx.beginPath(); ctx.arc(20, 24, 9, 0, 7); ctx.stroke();
      path(ctx, c, () => { ctx.moveTo(20, 7); ctx.lineTo(26, 13); ctx.lineTo(20, 19); ctx.lineTo(14, 13); ctx.closePath(); });
      break;
    }
    case 'colar': {
      ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(20, 12, 13, 0.2, Math.PI - 0.2); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = 0.45 + i * 0.55, x = 20 + Math.cos(a) * 13, y = 12 + Math.sin(a) * 13;
        path(ctx, c, () => { ctx.moveTo(x - 2.5, y); ctx.lineTo(x + 2.5, y); ctx.lineTo(x, y + 8); ctx.closePath(); }, 1.4);
      }
      break;
    }
    case 'bracelete': {
      ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.ellipse(20, 21, 12, 8, 0, 0, 7); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = c; ctx.beginPath(); ctx.ellipse(20, 21, 12, 8, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = dark; for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.fillRect(20 + Math.cos(a) * 12 - 1, 21 + Math.sin(a) * 8 - 1, 2, 2); }
      break;
    }
    case 'coroa': {
      path(ctx, c, () => { ctx.moveTo(6, 30); ctx.lineTo(8, 12); ctx.lineTo(14, 20); ctx.lineTo(20, 8); ctx.lineTo(26, 20); ctx.lineTo(32, 12); ctx.lineTo(34, 30); ctx.closePath(); });
      ctx.fillStyle = light; ctx.fillRect(9, 25, 22, 3);
      break;
    }
  }
}

function drawGlyph(ctx: CanvasRenderingContext2D, g: SkillGlyph) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const W = '#fff';
  const stroke = (lw: number, fn: () => void, col = W) => { ctx.beginPath(); fn(); ctx.lineWidth = lw + 2.5; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke(); };
  const fill = (fn: () => void, col = W) => { ctx.beginPath(); fn(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke(); };
  switch (g) {
    case 'cura': fill(() => { ctx.rect(16, 8, 8, 24); ctx.rect(8, 16, 24, 8); }); break;
    case 'golpe': stroke(4, () => { ctx.moveTo(9, 31); ctx.lineTo(31, 9); }); stroke(2.5, () => { ctx.arc(20, 20, 13, -2.6, -0.6); }); break;
    case 'explosao': fill(() => { for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 7 : 15; ctx.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r); } ctx.closePath(); }, '#ffe08a'); break;
    case 'espada': stroke(4, () => { ctx.moveTo(11, 29); ctx.lineTo(29, 11); }); stroke(3, () => { ctx.moveTo(10, 22); ctx.lineTo(18, 30); }); break;
    case 'coracao': fill(() => { ctx.moveTo(20, 31); ctx.bezierCurveTo(4, 20, 10, 6, 20, 14); ctx.bezierCurveTo(30, 6, 36, 20, 20, 31); }); break;
    case 'fogo': fill(() => { ctx.moveTo(20, 7); ctx.quadraticCurveTo(32, 20, 27, 29); ctx.quadraticCurveTo(20, 35, 13, 29); ctx.quadraticCurveTo(8, 20, 20, 7); }, '#ffd36b'); break;
    case 'gelo': for (let i = 0; i < 3; i++) stroke(3, () => { const a = (i / 3) * Math.PI; ctx.moveTo(20 - Math.cos(a) * 13, 20 - Math.sin(a) * 13); ctx.lineTo(20 + Math.cos(a) * 13, 20 + Math.sin(a) * 13); }); break;
    case 'raio': fill(() => { ctx.moveTo(23, 6); ctx.lineTo(12, 22); ctx.lineTo(19, 22); ctx.lineTo(16, 34); ctx.lineTo(28, 17); ctx.lineTo(21, 17); ctx.closePath(); }, '#fff6b0'); break;
    case 'bola': fill(() => { ctx.arc(20, 21, 11, 0, 7); }, '#ffb347'); fill(() => { ctx.arc(17, 18, 4, 0, 7); }, '#fff2c4'); break;
    case 'gota': fill(() => { ctx.moveTo(20, 7); ctx.quadraticCurveTo(31, 22, 28, 27); ctx.arc(20, 26, 8, 0.1, Math.PI - 0.1); ctx.quadraticCurveTo(9, 22, 20, 7); }); break;
    case 'flechas': for (const o of [-4, 4]) { stroke(2.5, () => { ctx.moveTo(8 + o, 30 + o); ctx.lineTo(30 + o, 8 + o); }); fill(() => { ctx.moveTo(32 + o, 6 + o); ctx.lineTo(24 + o, 9 + o); ctx.lineTo(29 + o, 14 + o); ctx.closePath(); }); } break;
    case 'chuva': for (const x of [11, 20, 29]) { stroke(2.5, () => { ctx.moveTo(x, 6); ctx.lineTo(x, 26); }); fill(() => { ctx.moveTo(x - 4, 25); ctx.lineTo(x + 4, 25); ctx.lineTo(x, 33); ctx.closePath(); }); } break;
    case 'olho': fill(() => { ctx.moveTo(6, 20); ctx.quadraticCurveTo(20, 6, 34, 20); ctx.quadraticCurveTo(20, 34, 6, 20); }); fill(() => { ctx.arc(20, 20, 5, 0, 7); }, '#3a2a10'); break;
    case 'alvo': stroke(2.5, () => { ctx.arc(20, 20, 12, 0, 7); }); stroke(2.5, () => { ctx.arc(20, 20, 6, 0, 7); }); fill(() => { ctx.arc(20, 20, 2.5, 0, 7); }); break;
    case 'foco': stroke(2.5, () => { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.moveTo(20 + Math.cos(a) * 7, 20 + Math.sin(a) * 7); ctx.lineTo(20 + Math.cos(a) * 14, 20 + Math.sin(a) * 14); } }); fill(() => { ctx.arc(20, 20, 4, 0, 7); }); break;
  }
}

function make(key: string, draw: (ctx: CanvasRenderingContext2D) => void) {
  let cv = canvases.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = S * 2; cv.height = S * 2;
    const ctx = cv.getContext('2d')!;
    ctx.scale(2, 2);
    draw(ctx);
    canvases.set(key, cv);
    cache.set(key, cv.toDataURL());
  }
  return cv;
}

export function itemIcon(id: string, shape: IconShape, color: string) {
  make(`item:${id}`, (ctx) => drawItem(ctx, shape, color));
  return cache.get(`item:${id}`)!;
}
export function itemCanvas(id: string, shape: IconShape, color: string) {
  return make(`item:${id}`, (ctx) => drawItem(ctx, shape, color));
}

export function skillIcon(id: string, glyph: SkillGlyph, color: string) {
  make(`skill:${id}`, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, shade(color, -0.3));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(2, 2, S - 4, S - 4, 7); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
    drawGlyph(ctx, glyph);
  });
  return cache.get(`skill:${id}`)!;
}
