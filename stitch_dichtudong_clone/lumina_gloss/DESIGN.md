# Design System Documentation: The Cinematic Canvas

## 1. Overview & Creative North Star
The creative North Star for this design system is **"The Cinematic Canvas."** 

Translation is often treated as a utilitarian task, but for a high-end AI video platform, it should feel like an editorial craft. We move away from the "SaaS-dashboard" cliché of rigid grids and heavy borders. Instead, we embrace a layout that breathes—using high-contrast typography scales, intentional asymmetry, and "optical layering." The goal is to make the user feel like they are directing a global masterpiece, not just filling out a spreadsheet. We prioritize depth, translucency, and tonal transitions over structural lines.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
Our palette is anchored by a deep, authoritative Indigo (`primary: #4544dc`) softened by a spectrum of Lavenders and cool whites.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to define sections or containers. 
Structure must be achieved through:
*   **Background Shifts:** Distinguish the sidebar from the main stage by shifting from `surface` to `surface-container-low`.
*   **Tonal Transitions:** Use a subtle gradient or a shift in the surface-container tier to signal where one functional area ends and another begins.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper and frosted glass.
*   **The Foundation:** Use `surface` (#faf4ff) for the global background.
*   **The Content Layer:** Use `surface-container-lowest` (#ffffff) for primary cards or content areas to make them "pop" against the foundation.
*   **The Interactive Layer:** Use `surface-container-highest` (#e1d7ff) for hover states or active selection backgrounds.

### The "Glass & Gradient" Rule
To capture the "High-Tech" requirement:
*   **Glassmorphism:** For floating panels (e.g., the video editor overlay), use `surface_variant` at 60% opacity with a `backdrop-blur` of 20px. 
*   **Signature Textures:** Main Action Buttons and Hero highlights should utilize a soft gradient: `primary` (#4544dc) transitioning diagonally to `primary_container` (#9496ff). This adds a "soul" to the UI that flat indigo cannot provide.

---

## 3. Typography: Editorial Authority
We utilize **Be Vietnam Pro** for its exceptional Vietnamese character support and its geometric, professional rhythm.

*   **Display Scale:** Use `display-lg` (3.5rem) for hero statements. Tighten the letter-spacing (-0.02em) to create a sophisticated, "magazine" feel.
*   **Contrast as Hierarchy:** Pair a large `headline-lg` title with a significantly smaller `label-md` for metadata. This "Big/Small" contrast creates an intentional, high-end aesthetic.
*   **Body Copy:** Use `body-lg` for readability in translation blocks, ensuring a generous line height (1.6) to prevent visual fatigue during long editing sessions.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often too "dirty." We use light and layering to create presence.

### The Layering Principle
Instead of a shadow, place a `surface-container-lowest` element inside a `surface-container` area. The 2-3% difference in lightness creates a "Soft Lift" that is perceived by the eye without cluttering the mind.

### Ambient Shadows
When an element must float (like a context menu or a modal):
*   **Shadow Specs:** Use a blur radius of 40px–60px.
*   **Color Tinting:** Never use black. Use a 6% opacity of the `on-surface` color (#302950). This mimics natural light reflecting off the lavender surfaces.

### The "Ghost Border" Fallback
If a boundary is required for accessibility (e.g., an input field), use a **Ghost Border**: 
*   Token: `outline-variant` (#b1a7d6) at 15-20% opacity. It should be felt, not seen.

---

## 5. Components: Bespoke Elements

### Buttons
*   **Primary:** Indigo-to-Lavender gradient, `xl` (1.5rem) rounded corners. Text is `on-primary` (#f4f1ff).
*   **Secondary:** No background. Use a `Ghost Border` and `primary` text.
*   **Tertiary:** Only text, using `primary` for the label.

### The AI Video Editor (Mockup Specifics)
*   **Timeline:** Use `surface-container-low` for the track background. Use `primary_fixed_dim` for the active video clip.
*   **Transcription Cards:** Forbidden to use dividers. Separate speakers using `md` (0.75rem) vertical spacing and a `surface-container-lowest` background for the active speaker’s block.

### Input Fields
*   **Styling:** `surface-container-low` background, no border, `md` (0.75rem) corners. On focus, the background shifts to `surface-container-lowest` with a 1px `primary` ghost border.

### Chips (Translation States)
*   **Selection Chips:** Use `secondary_container` with `on_secondary_container` text. Use `full` rounded corners (Pill shape) to contrast against the `xl` corners of the cards.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace White Space:** If a section feels crowded, increase the padding; do not add a border.
*   **Use Subtle Gradients:** Use gradients in 5% of the UI (CTAs/Hero) to maintain a premium feel.
*   **Layer Surfaces:** Think in 3D. A sidebar is one layer, a card is another, a tooltip is the third.

### Don’t:
*   **Don't use pure black (#000000):** Use `on-background` (#302950) for high-contrast text. It maintains the indigo-lavender harmony.
*   **Don't use standard Material shadows:** They are too heavy for this "High-Tech" aesthetic. Stick to Ambient Shadows.
*   **Don't use 1px dividers:** Use vertical gaps (the Spacing Scale) or background color shifts to separate content lists.