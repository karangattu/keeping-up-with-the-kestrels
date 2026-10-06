# Bird flight audit and rebuild

The original 11 sheets each supplied six poses. Their tight, varying crop bounds
were centered on the flight path, so extending the wings moved the body. The
playback order reversed the upstroke, jumped back to glide, then jumped into a
downstroke. Some downstroke slots actually contained raised wings. Gliding birds
also switched abruptly between glide and a raised-wing pose. Timing depended on
how long a bird took to cross the screen.

The replacement transparent PNGs retain the realistic painted species designs,
including the male harrier and the osprey's fish. They were created with the
built-in image-generation tool. The exact prompts are in `bird-flight-prompts.json`.

Each bird now has a 16-slot complete wingbeat. Crop and beak-anchor metadata in
`src/birdSpriteFrames.json` prevents changing wing bounds from shifting the body.
Frames use a shared logical scale, independent of PNG export resolution. Raised
poses accidentally exported in the male harrier and red-tailed hawk recovery are
replaced in playback by reversing the appropriate downstroke intermediates.

Wingbeat periods range from 320 ms for kestrels to 960 ms for vultures. Flap bursts
contain two complete cycles, start/end at glide, and use elapsed milliseconds.
Hovering birds flap continuously; soaring birds hold their extended wings while
the existing path, banking and bobbing animate their movement.

Run the local development server and open `/bird-flight-preview.html` to inspect
all 11 variants together, pause playback, slow it down, and reverse direction.
This review page is separate from the main game.

To remeasure a replacement sheet, run:

```sh
python3 scripts/audit-bird-sprites.py assets/SPECIES-sprite-sheet.png
```

The inspection script uses Pillow and NumPy, reads artwork without modifying it,
and preserves metadata for other species. Check head bands and beak overrides
against any new export before regenerating metadata. The PNGs are illustrated
atlas exports rather than perfectly spaced grids; use the recorded frame crops.
