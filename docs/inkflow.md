# 墨流 / INKFLOW

Public route `/ink`; `/cover` remains a compatible alias. Third motif uses the supplied 狼 calligraphy; fourth uses the supplied Hikaru portrait. Original JPEGs are retained unchanged in public/ink. Runtime masks invert the white calligraphy strokes, suppress the portrait’s light paper background and preserve grayscale ink detail; a 12-source-pixel boundary fade prevents the portrait forming a hard rectangular edge. No generative redraw is used.

## User-controlled progression

No coverage percentage starts a rinse. Painting reveals the quiet gift control “Wash the ink”; the user can keep adding ink, wait indefinitely, or export. Clicking the gift is the only way to start rinsing. It stops injection, starts a water current, then a wavefront releases the fixed stain into mobile pigment from left to right. Once both free pigment and remaining stain are nearly gone, the next motif becomes available. The four motifs loop. Artwork must be loaded before the corresponding advance is enabled.

The current picture is preserved across viewport buffer resizes rather than resetting progression. Time pauses when hidden. Reduced motion reduces advection speed.

## Rendering

WebGL 2, RGBA16F ping-pong fields when EXT_color_buffer_float is available, RGBA8 fallback otherwise. The mobile pigment field is capped at 2560 pixels on its long edge and 3.6 million pixels overall; presentation is capped at 3000 pixels and 2× device scaling.

Two transport passes implement bounded MacCormack correction: backward advection, reverse estimation, correction constrained to upstream cell extrema. This reduces numerical blur from repeated interpolation. Explicit diffusion is small and limited to the dilute component. Pigment injection has a compact body and narrow soft rim, instead of a broad Gaussian fog. This is still an artistic velocity/advection model, not a pressure-solved physical water simulation.

R carries dilute ink; B carries denser oil-like ink; G stores stationary stain saturation. G changes only where mobile ink actually contacts the target mask. High-resolution target edges are applied during display. During a user-triggered wash, a spatial wavefront lifts G into B; the ink is transported offscreen. No timed global text fade controls progression.

White porcelain/water background with restrained surface highlights; no paper/fiber texture. Original controls plus the small gift control; no tutorial copy.

Build: TypeScript/Vite. Browser rendering and interaction were not run in this revision. Cross-device WebGL performance is not verified.
