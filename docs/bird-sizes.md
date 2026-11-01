# Bird sizes

Bird sizes use representative wingspans from the Cornell Lab's All About Birds
identification guides. These are approximate game proportions, not measurements
of individual birds. Sex, age, posture, and distance affect apparent size.

| Species | Representative wingspan (cm) | Guide |
| --- | ---: | --- |
| American Kestrel | 56 | [51–61 cm](https://www.allaboutbirds.org/guide/American_Kestrel/id) |
| Cooper's Hawk | 79 | [62–90 cm male; 75–90 cm female](https://www.allaboutbirds.org/guide/Coopers_Hawk/id) |
| Northern Harrier | 110 | [102–118 cm](https://www.allaboutbirds.org/guide/Northern_Harrier/id) |
| Red-shouldered Hawk | 102.5 | [94–111 cm](https://www.allaboutbirds.org/guide/Red-shouldered_Hawk/id) |
| Red-tailed Hawk | 123.5 | [114–133 cm](https://www.allaboutbirds.org/guide/Red-tailed_Hawk/id) |
| White-tailed Kite | 104.5 | [99–110 cm](https://www.allaboutbirds.org/guide/White-tailed_Kite/id) |
| Osprey | 165 | [150–180 cm](https://www.allaboutbirds.org/guide/Osprey/id) |
| Turkey Vulture | 174 | [170–178 cm](https://www.allaboutbirds.org/guide/Turkey_Vulture/id) |
| Golden Eagle | 202.5 | [185–220 cm](https://www.allaboutbirds.org/guide/Golden_Eagle/id) |
| Bald Eagle | 204 | [204 cm](https://www.allaboutbirds.org/guide/Bald_Eagle/id) |

`src/birdSizes.ts` stores the representative values. The red-tail is the reference.
The ordinary birds, hunting kite, mobbed hawk, and distant soaring birds share
those ratios. Both harrier color variants share one species size.

Each flight sheet is normalized against its visible neutral glide frame, rather
than the surrounding transparent tile. The same scale is retained through the
wingbeat, so moving wings do not resize the body. The original artwork's poses
and perspective remain approximations; this is a visual guide, not an anatomical
model with exact projected wing lengths.

Distance changes size separately from species. Nearby birds are capped at a
smaller apparent size than before. The virtual field of view also scales down
with screen width below 1280 pixels, so phone birds do not retain desktop pixel
sizes. The flight review page shows species together at the same distance.
