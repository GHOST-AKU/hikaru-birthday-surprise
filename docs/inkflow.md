# 墨流 / INKFLOW

The public route is `/ink`; `/cover` remains a built alias and replaces its URL with `/ink`. Navigation and page title use the new name.

The WebGL field separates mobile diffuse pigment (R), stationary contact stain (G), and a more coherent oily pigment (B). The velocity is a procedural divergence-free curl component, a gentle directional current, pointer-induced vortices and local drag momentum. This is an artistic advection model, not a full pressure-solved physical fluid simulation. Pigment uses bilinear semi-Lagrangian advection. Diffuse pigment has neighbor diffusion; coherent pigment preserves sharper filaments. The simulation's longest edge is capped at 1100 pixels; the final presentation is capped at 2200 pixels.

Contact is sampled at each field cell. Only pigment actually overlapping the target mask contributes to G. G stays spatially fixed and does not decay during painting or the free-pigment rinse. A 96 × 64 GPU sampling pass measures mask-weighted stain coverage and average remaining free pigment every 0.7 simulation seconds. No stroke-distance or global reveal multiplier is used.

At 84% weighted coverage, injection stops and the directional current clears the free pigment. The image stays stained for at least 3.5 seconds and until free pigment is below 0.006 average density. Then the attached layer is released: it advects with the current and dissipates for 4.5 seconds before the next motif begins. Fourth motif loops back to the first. Time pauses with tab visibility; resizing restarts staining of the current motif. Reduced motion slows the advection.

The background is a nearly white porcelain/water finish with very subtle broad moving highlights. There is no paper noise or fiber texture. Dense moving ink receives a restrained surface sheen. Text remains a single line. The two existing art placeholders remain; their near-white image backgrounds are removed from the pigment masks.

Controls: hold to release ink, drag to guide it; arrows paint, R resets. Existing PNG export and four small chapter indicators remain. No explanatory UI copy was added.

Validation: TypeScript/Vite production build. No automated tests or browser rendering/interaction checks were run in this update; GPU rendering remains unverified on real devices.
