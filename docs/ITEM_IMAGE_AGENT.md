# Item image generator

The project-scoped `item_image_generator` agent creates catalog artwork for any
kind of item—not only Techno-Wizard devices. Its mandatory default uses the
original pre-refresh TW catalog's clean, fairly simple, bold wireframe geometry
with saturated blue contours, selective bright orange details, restrained
pale-blue structure, and an opaque solid dark-navy background targeting the
card's `#040b26`. Transparency and chroma-key removal are prohibited. Images
must remain crisp when enlarged and after the 1280x720 runtime conversion. It
derives each object's shape exclusively from that item's name and description.

The permanent user-approved calibration set is stored in the ignored
`tmp/item-image-review/original-style-calibration/` workspace folder: TK-80
Heavy Machine-gun, Night Goggles, and Protective Energy Field. All subsequent
item art must match that set's opaque navy canvas, bold blue/orange palette,
crisp enlarged linework, and balanced functional detail. These images are local
QA benchmarks only and are never sent to ImageGen as references, preventing
their subject shapes from influencing unrelated items.

Items always retain their natural proportions. The agent must not compress a
tall or long object into a short, wide silhouette to fit the 16:9 card, and an
item does not need to stand perfectly upright. Long axes should normally run
horizontally across the canvas, with a gentle diagonal reserved for cases where
it improves recognition without misrepresenting the object's construction.

Enlarged-image QA includes a full structural-continuity trace. Handles, shafts,
barrels, cables, chains, whips, straps, hoses, limbs, plates, mounts, wheels,
emitters, and other parts that belong together must connect coherently. Floating
parts, unexplained gaps, broken contours, impossible joins, missing connectors,
and accidental overlaps require a fresh isolated regeneration.

The detail benchmark is
`public/assets/tw-devices/tw-45-revolver-six-shooter.webp`: an immediately
readable silhouette, layered blue primary lines plus pale-blue or white
secondary structural outlines, a moderate amount of meaningful internal panel
and functional geometry, selective orange accents, and gem or crystal ornament
only where the source description supports it. The result remains flat technical
line art with deliberate negative space, avoiding both empty icon-like
oversimplification and dense clutter.

Start a new Codex session at the repository root after pulling the agent file,
then invoke it explicitly:

```text
Use the item_image_generator agent to create the catalog image for [item name]. Read its canonical record, generate and visually verify the artwork, optimize the approved asset, update the catalog and dependencies, and run verification. Do not commit or push.
```

For a batch, identify the catalog and item names. The agent still generates each
item independently. It does not supply earlier images to the image model, which
prevents a sword or another early subject from influencing later objects.

The agent rejects a result when the silhouette does not clearly match the item's
named physical form. It also rejects transparency, chroma-key backgrounds,
gradients, vignettes, scenery, texture, lighting variation, fuzzy or blurry
edges, or artwork that otherwise lacks the bold blue/orange wireframe treatment
or uses shading, filled/painted surfaces, photorealism, painterly rendering,
3D-rendered volume, excessive glow, or ornamental clutter. Non-bladed items
receive explicit anti-sword constraints and are regenerated from a fresh prompt
if they resemble a sword, blade, or generic weapon.

Every candidate receives a balanced-detail check against the TW-45 benchmark.
The agent rejects both under-detailed icon-like results and busy results
dominated by decorative or speculative geometry, then starts over from a fresh
isolated prompt at the corrected detail level.
