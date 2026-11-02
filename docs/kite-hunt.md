# Kite animation handoff

The approved hovering sheet stays unchanged. The hunting animation starts with
the exact same registered hover frame 0, then uses the dedicated hunting poses.
There is no crossfade between differently aligned bodies.

`src/kiteHuntFrames.json` records the tail, beak, and talon grip points for each
generated pose. Registration aligns the beak-to-tail axis and body length with
the hovering kite. Both animations rotate around the same torso point. The
mouse remains separate during the ground approach and pickup. The climb-out uses
the carrying poses in `assets/kite-mouse-sprite-sheet.png`, where the mouse is
already painted into the talons. No second mouse is drawn over those poses.
The switch happens just after pickup, behind the counters, with the same torso
registration and body scale.

The game keeps its existing continuous flight path and counts the whole hunt as
one kite observation. The shared neutral pose is reused from the original sheet
at runtime, guaranteeing identical pixels at the handoff even if the generated
sheet's first pose has minor differences.

## Artwork

Generated with the built-in image generator, using
`assets/white-tailed-kite-sprite-sheet.png` as the reference. Output:
`assets/white-tailed-kite-hunting-sprite-sheet.png`.

Prompt:

```text
Use case: scientific-educational. Asset: transparent white-tailed kite game sprite sheet, 4 columns by 4 rows, 16 equal cells. Reference image is the existing approved hovering kite: preserve that exact individual, realistic photographic illustration style, white head/body, gray wings, black shoulders, red eye, feather detail and proportions. Every frame faces RIGHT in the SAME side/three-quarter view with a HORIZONTAL body axis. Keep the torso center and body size precisely fixed in each cell; animate wings, head tilt and legs only. Cell0 MUST match reference cell0's level-wing neutral glide pose for a common transition. Cells1-3: progressively tuck wings slightly for a dive, look down. Cells4-7: extend yellow legs and spread talons downward, then curl talons to grasp prey. Cells8-15: eight-frame complete wingbeat loop taking off with legs lowered and talons curled: 8 level wings,9 lifting halfway,10 fully raised,11 lowering halfway,12 level,13 down halfway,14 fully down,15 recovering halfway. NO MOUSE drawn anywhere: prey is a separate game sprite. No scenery, no shadows, no labels, no grids, no text. Genuinely transparent background. Plenty of margins so wings never cross cells. Critical: torso and tail size and torso center stay identical in every cell; do not rotate whole bird or change camera. The game applies the descending and ascending angles.
```
