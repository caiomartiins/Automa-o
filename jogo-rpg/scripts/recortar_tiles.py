"""
Recorta os tiles das imagens enviadas (arte/originais/tiles-campos-*.jpg) e gera
as texturas usadas pelo jogo em src/assets/tiles/.

- Tiles "cheios" (grama) são recortados e ajustados para o mesmo tom médio.
- Decalques (flores, pedras) ganham borda suave para misturar com a grama.
- Objetos sobre o xadrez de "transparência" desenhado no JPEG têm o xadrez removido
  por preenchimento a partir das bordas.

Uso: python3 scripts/recortar_tiles.py
"""
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


def remove_grid(img):
    """Apaga as linhas escuras da grade desenhadas na imagem, interpolando os vizinhos."""
    a = np.asarray(img).astype(np.float32)
    dark = a.mean(axis=-1) < 70
    cols = [x for x in range(2, a.shape[1] - 3) if dark[:, x].mean() > 0.3]
    rows = [y for y in range(2, a.shape[0] - 3) if dark[y, :].mean() > 0.3]
    for x in cols:
        l, r = a[:, x - 2].copy(), a[:, x + 2].copy()
        for i, dx in enumerate((-1, 0, 1)):
            t = (i + 1) / 4
            a[:, x + dx] = l * (1 - t) + r * t
    for y in rows:
        t0, b0 = a[y - 2, :].copy(), a[y + 2, :].copy()
        for i, dy in enumerate((-1, 0, 1)):
            t = (i + 1) / 4
            a[y + dy, :] = t0 * (1 - t) + b0 * t
    return Image.fromarray(a.astype(np.uint8))


SRC1 = remove_grid(Image.open(ROOT / 'arte/originais/tiles-campos-1.jpg').convert('RGB'))
SRC2 = remove_grid(Image.open(ROOT / 'arte/originais/tiles-campos-2.jpg').convert('RGB'))
OUT = ROOT / 'src/assets/tiles'
OUT.mkdir(parents=True, exist_ok=True)


def crop(img, box):
    return np.asarray(img.crop(box)).astype(np.float32)


def match_tone(a, target):
    """Ajusta a média de cada canal para o tom alvo (deixa as variações de grama iguais)."""
    mean = a.reshape(-1, 3).mean(axis=0)
    return np.clip(a + (np.array(target) - mean), 0, 255)


def is_checker(px):
    mx, mn = px.max(axis=-1), px.min(axis=-1)
    lum = px.mean(axis=-1)
    return (mx - mn <= 9) & (lum > 95) & (lum < 205)


N8 = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))


def key_checker(a, grow=1, everywhere=False):
    """Remove o xadrez ligado às bordas e devolve RGBA (everywhere: remove todo pixel cinza)."""
    h, w, _ = a.shape
    chk = is_checker(a)
    bg = chk.copy() if everywhere else np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if chk[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if chk[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in N8:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and chk[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    # buracos internos grandes de xadrez (entre ripas de cerca, entre flores)
    from itertools import product
    seen = bg.copy()
    for y, x in product(range(h), range(w)):
        if chk[y, x] and not seen[y, x]:
            comp = []; q = deque([(y, x)]); seen[y, x] = True
            while q:
                cy, cx = q.popleft(); comp.append((cy, cx))
                for dy, dx in N8:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and chk[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
            if len(comp) > 12:
                for cy, cx in comp: bg[cy, cx] = True
    alpha = np.where(bg, 0, 255).astype(np.float32)
    # encolhe 1px para tirar o halo cinza do JPEG
    for _ in range(grow):
        a2 = alpha.copy()
        a2[1:, :] = np.minimum(a2[1:, :], alpha[:-1, :]); a2[:-1, :] = np.minimum(a2[:-1, :], alpha[1:, :])
        a2[:, 1:] = np.minimum(a2[:, 1:], alpha[:, :-1]); a2[:, :-1] = np.minimum(a2[:, :-1], alpha[:, 1:])
        alpha = a2
    return np.dstack([a, alpha])


def feather(a, ramp=12):
    """Borda suave (para decalques sobre grama)."""
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)).astype(np.float32)
    alpha = np.clip(d / ramp, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha) * 255
    if a.shape[2] == 4:
        alpha = np.minimum(alpha, a[..., 3])
        a = a[..., :3]
    return np.dstack([a, alpha])


def trim(rgba):
    al = rgba[..., 3]
    ys, xs = np.where(al > 10)
    if len(xs) == 0:
        return rgba
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def save(name, arr, size=None):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA' if arr.shape[2] == 4 else 'RGB')
    if size:
        im = im.resize(size, Image.LANCZOS)
    im.save(OUT / f'{name}.webp', lossless=True, method=6)
    return im


GRASS_TONE = (104, 140, 62)

# ---- grama: 4 variações + 2 com trevos, mesmo tom ----
grass_boxes = [(3, 3, 73, 63), (79, 3, 150, 63), (156, 3, 227, 63), (233, 3, 296, 63), (310, 3, 408, 63), (437, 3, 509, 63)]
for i, b in enumerate(grass_boxes):
    save(f'grama{i}', match_tone(crop(SRC2, b), GRASS_TONE), (64, 64))

# ---- terra (para caminhos e o chão do covil) ----
save('terra', crop(SRC2, (966, 86, 1012, 120)))

# ---- decalques sobre grama (borda suave) ----
decals = {
    'flores-amarelas0': (SRC2, (794, 142, 867, 205)),
    'flores-amarelas1': (SRC2, (871, 142, 945, 205)),
    'flores-amarelas2': (SRC2, (949, 142, 1021, 205)),
    'pedra-musgo': (SRC2, (668, 142, 790, 206)),
    'pedrinhas0': (SRC2, (588, 282, 664, 347)),
    'pedrinhas1': (SRC2, (668, 282, 790, 347)),
    'vitorias-regias': (SRC2, (795, 282, 867, 347)),
    'lago-pequeno': (SRC2, (872, 282, 946, 347)),
    'tufos': (SRC2, (949, 282, 1021, 347)),
}
for name, (img, b) in decals.items():
    a = crop(img, b)
    a = match_tone(a, (a.reshape(-1, 3).mean(0) * 0.5 + np.array(GRASS_TONE) * 0.5))
    save(name, feather(a, 10))

# ---- objetos sobre o xadrez ----
keyed = {
    'flores0': (SRC2, (2, 422, 75, 490)),
    'flores1': (SRC2, (78, 422, 152, 490)),
    'flores2': (SRC2, (155, 422, 229, 490)),
    'pedras-soltas0': (SRC2, (668, 422, 790, 490)),
    'pedras-soltas1': (SRC2, (795, 422, 868, 490)),
    'lago-redondo': (SRC2, (872, 422, 946, 490)),
    'lago-comprido': (SRC2, (588, 352, 742, 419)),
    'pilar0': (SRC2, (513, 422, 587, 490)),
    'pilar1': (SRC2, (948, 352, 1022, 420)),
    'pilar2': (SRC1, (1, 422, 75, 490)),
    'monte-pedras0': (SRC2, (300, 422, 366, 490)),
    'monte-pedras1': (SRC2, (367, 422, 434, 490)),
    'tronco': (SRC2, (435, 425, 508, 488)),
    'cerca0': (SRC1, (2, 492, 75, 555)),
    'cerca1': (SRC1, (78, 492, 150, 555)),
    'penhasco0': (SRC2, (1, 281, 230, 350)),
    'penhasco1': (SRC2, (240, 281, 512, 350)),
}
for name, (img, b) in keyed.items():
    save(name, trim(key_checker(crop(img, b), everywhere=name.startswith('flores'))))

# ---- rio e ponte (tiles cheios) ----
save('rio', crop(SRC2, (2, 492, 150, 557)))
save('ponte', crop(SRC2, (302, 492, 364, 557)))
print('ok', len(list(OUT.glob('*.webp'))))
