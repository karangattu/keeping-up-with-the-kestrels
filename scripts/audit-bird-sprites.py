"""Inspect atlas alpha and write crop/body-anchor metadata; never modify artwork.

Requires Pillow and NumPy. Run after replacing a flight sheet.
Large connected silhouettes are sorted into four rows of four poses. Cropping
actual silhouettes also accommodates imperfect grid spacing in painted exports.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
metadata = ROOT / "src" / "birdSpriteFrames.json"
# Head-height bands were checked visually on the generated exports. They keep
# forward-reaching feathers from being mistaken for the beak tip.
HEAD_BANDS = {
    'american-kestrel': [215, 520, 785, 1060],
    'coopers-hawk': [235, 535, 785, 1065],
    'golden-eagle': [225, 540, 775, 1035],
    'northern-harrier': [267, 575, 812, 1068],
    'northern-harrier-male': [258, 570, 821, 1145],
    'red-shouldered-hawk': [235, 545, 788, 1090],
    'red-tailed-hawk': [233, 535, 793, 1093],
    'turkey-vulture': [255, 552, 818, 1075],
    'bald-eagle': [230, 540, 764, 1059],
    'white-tailed-kite': [235, 552, 806, 1062],
    'osprey': [233, 548, 816, 1074],
}
BEAK_OVERRIDES = {
    'american-kestrel': {8: (308, 796)},
    'golden-eagle': {0: (336, 225), 8: (338, 783), 14: (941, 1037)},
    'northern-harrier': {0: (299, 273), 1: (623, 274), 8: (300, 817)},
    'red-shouldered-hawk': {0: (254, 236), 1: (582, 236), 8: (254, 811), 15: (1202, 1121)},
    'red-tailed-hawk': {0: (280, 235), 1: (598, 235), 8: (281, 798), 9: (631, 788)},
    'white-tailed-kite': {0: (292, 235), 8: (292, 811)},
}
frames_by_species = json.loads(metadata.read_text()) if metadata.exists() else {}
paths = [Path(arg) for arg in sys.argv[1:]] or sorted((ROOT / 'assets').glob('*-sprite-sheet.png'))
for path in paths:
    image = Image.open(path).convert('RGBA')
    alpha = np.asarray(image)[:, :, 3]
    mask = alpha >= 140
    silhouettes = []
    for seed_y, seed_x in zip(*np.where(mask)):
        if not mask[seed_y, seed_x]:
            continue
        stack = [(int(seed_x), int(seed_y))]
        mask[seed_y, seed_x] = False
        pixels = []
        while stack:
            x, y = stack.pop()
            pixels.append((x, y))
            for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                if 0 <= nx < image.width and 0 <= ny < image.height and mask[ny, nx]:
                    mask[ny, nx] = False
                    stack.append((nx, ny))
        if len(pixels) <= 1000:
            continue
        xs, ys = zip(*pixels)
        xmax = max(xs)
        tip = [y for x, y in pixels if x >= xmax - 2]
        tip_y = sum(tip) / len(tip)
        box = (slice(min(ys), max(ys) + 1), slice(min(xs), xmax + 1))
        silhouettes.append((tip_y, xmax, box))
    if len(silhouettes) != 16:
        raise ValueError(f'{path.name}: expected 16 bird silhouettes, found {len(silhouettes)}')
    silhouettes.sort(key=lambda item: item[0])
    ordered = []
    for row in range(4):
        ordered.extend(sorted(silhouettes[row * 4:row * 4 + 4], key=lambda item: item[1]))
    frames = []
    species = path.stem.replace('-sprite-sheet', '')
    for index, (anchor_y, anchor_x, (ys, xs)) in enumerate(ordered):
        if species in HEAD_BANDS:
            band_y = HEAD_BANDS[species][index // 4]
            band_top, band_bottom = max(ys.start, band_y - 18), min(ys.stop, band_y + 18)
            by, bx = np.where(alpha[band_top:band_bottom, xs.start:xs.stop] >= 200)
            if len(bx):
                rightmost = int(bx.max())
                anchor_x = xs.start + rightmost
                anchor_y = band_top + float(by[bx >= rightmost - 2].mean())
        if index in BEAK_OVERRIDES.get(species, {}):
            anchor_x, anchor_y = BEAK_OVERRIDES[species][index]
        left, top = max(0, xs.start - 3), max(0, ys.start - 3)
        right, bottom = min(image.width, xs.stop + 3), min(image.height, ys.stop + 3)
        frames.append({'sx': left, 'sy': top, 'sw': right - left, 'sh': bottom - top,
                       'anchorX': round(anchor_x - left, 2), 'anchorY': round(anchor_y - top, 2)})
    if species == 'golden-eagle':
        # A neighboring glide wing enters the top-left corner of pose 9's
        # bounding rectangle. Clip that empty corner while drawing the atlas.
        frames[9]['exclude'] = {'x': 0, 'y': 0, 'width': 28, 'height': 50}
    if species in ('northern-harrier-male', 'red-tailed-hawk'):
        # The export's final recovery poses raise the wings too early. Reverse
        # the downstroke intermediates to return smoothly to the flat glide.
        frames[13:] = [frames[11].copy(), frames[10].copy(), frames[9].copy()]
    frames_by_species[species] = frames
    print(f'{path.name}: {image.width}x{image.height}, 16 separate silhouettes')
(ROOT / 'src' / 'birdSpriteFrames.json').write_text(json.dumps(frames_by_species, indent=2) + '\n')
