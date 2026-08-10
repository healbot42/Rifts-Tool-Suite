# Item image generator

The project-scoped `item_image_generator` agent creates catalog artwork for any
kind of item—not only Techno-Wizard devices. Its mandatory default uses the
user-approved pistol's sparse technical outline geometry with crisp blue primary
contour and construction lines, very restrained orange circuit/detail accents,
abundant negative space, and a verified transparent background. The consuming
display card supplies the exact solid `#040b26` canvas, so artwork may not bake
in background color, gradients, vignettes, glow fields, lighting variation,
texture, or alternate navy. It derives each object's shape exclusively from that
item's name and description.

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
named physical form. It also rejects any result without verified background
transparency, including baked-in background color, gradients, vignettes, glow
fields, lighting variation, texture, or alternate navy, or that otherwise lacks
the blue/orange wireframe treatment or uses shading, filled/painted surfaces,
photorealism, painterly rendering, 3D-rendered volume, excessive glow, or
ornamental clutter instead of sparse precise line geometry. Non-bladed items
receive explicit anti-sword constraints and are regenerated from a fresh prompt
if they resemble a sword, blade, or generic weapon.

Every candidate receives a balanced-detail check against the TW-45 benchmark.
The agent rejects both under-detailed icon-like results and busy results
dominated by decorative or speculative geometry, then starts over from a fresh
isolated prompt at the corrected detail level.
