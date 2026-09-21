# Tripzy.travel — Brand Identity & Design System Specification

**Document Version:** 3.0.0  
**Status:** Active Brand Specification  
**Architecture Layer:** Layer 1 (UI & Brand Presentation)  
**Target Market:** Turkey (Global Travel Discount & Autonomous Recommendation Platform)

---

## 1. Executive Summary & Brand Manifesto

**Tripzy.travel** is a next-generation global travel discount and autonomous recommendation platform launching in Turkey, built for extreme scalability (100k+ monthly active users) and frictionless mobile-first discovery.

### Brand Pillars
1. **Mathematical Precision & Modernism:** Zero decorative clutter, zero clunky 3D gradients, zero neon gaming artifacts.
2. **Extreme Scalability:** Iconic vector marks that render with pin-sharp clarity from 16px mobile browser favicons to 4K OLED displays and physical luxury passes.
3. **Trust, Velocity, and Access:** Combining the accessibility of high-value travel savings with the prestige of a private travel club.

---

## 2. The 3 Vector Mark Concepts

Each mark has been engineered as self-contained, mathematically pure SVG geometry.

```
   CONCEPT 1: The Tripzy Loop         CONCEPT 2: Horizon Meridian         CONCEPT 3: The Prism Ticket
      [ Pin + 'T' Monogram ]             [ Ascent Arc + Axis ]               [ Faceted Value Pass ]
          ╭─────────╮                          ╭─────╮                          ╭───────╮
         │   ──┬──   │                        │   │   │                        ╱ ╲     ╱ ╲
          ╲    │    ╱                         │   │   │                       │   ╲   ╱   │
           ╲   │   ╱                         ───  ●  ───                      │    ╲ ╱    │
             ╲ │ ╱                                │                           │     │     │
               ▼                                  ▼                            ╲   ╱ ╲   ╱
                                                                                ╰───────╯
```

---

### Concept 1: The Tripzy Loop *(Recommended)*
* **Geometry:** A continuous single-stroke bezier curve synthesizing a **Location Pin** with the **Letter 'T'**.
* **Symbolism:** Unbroken travel path, algorithmic precision, instant local discovery.
* **SVG Specification:**
```xml
<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer Continuous Bezier Pin -->
  <path d="M 30 45 C 30 20 90 20 90 45 C 90 75 60 100 60 100 C 60 100 30 75 30 45 Z" 
        stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Inner 'T' Crossbar & Stem -->
  <path d="M 45 44 H 75 M 60 44 V 68" 
        stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

---

### Concept 2: Horizon Meridian
* **Geometry:** A minimalist Swiss modernist mark with an upward exploration arc bisected by a central guidance axis.
* **Symbolism:** Ascending to new destinations, navigational clarity, structured travel guidance.
* **SVG Specification:**
```xml
<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Exploration Ascent Arc -->
  <path d="M 22 78 A 38 38 0 0 1 98 78" 
        stroke="currentColor" stroke-width="11" stroke-linecap="round"/>
  <!-- Meridian Axis -->
  <path d="M 60 26 V 96" 
        stroke="currentColor" stroke-width="11" stroke-linecap="round"/>
  <!-- Zenith Node -->
  <circle cx="60" cy="26" r="7.5" fill="currentColor"/>
</svg>
```

---

### Concept 3: The Prism Ticket
* **Geometry:** An isometric faceted hexagon representing a 3D folded digital travel pass.
* **Symbolism:** Unlocked VIP perks, smart value architecture, transparent discounts.
* **SVG Specification:**
```xml
<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Hexagonal Ticket Perimeter -->
  <path d="M 28 42 L 60 22 L 92 42 L 92 78 L 60 98 L 28 78 Z" 
        stroke="currentColor" stroke-width="9" stroke-linejoin="round"/>
  <!-- Top Fold Crease -->
  <path d="M 28 42 L 60 60 L 92 42" 
        stroke="currentColor" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Center Vertical Fold -->
  <path d="M 60 60 V 98" 
        stroke="currentColor" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- Notch Highlight -->
  <path d="M 42 32 L 72 50" 
        stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
</svg>
```

---

## 3. Color Architecture & Tokens

| Color Name | Hex Code | Tailwind Equivalent | Role & Application |
| :--- | :--- | :--- | :--- |
| **Void Black** | `#08090C` | `bg-[#08090C]` | Primary OLED dark background canvas |
| **Surface Dark** | `#0E1117` | `bg-[#0E1117]` | Card surfaces, modals, elevated panels |
| **Stratosphere Indigo** | `#6366F1` | `indigo-500` | Primary brand accent, AI matching, buttons |
| **Oasis Emerald** | `#10B981` | `emerald-500` | Discount badges, savings indicators (`₺XXX KAZANÇ`) |
| **Optic Slate / White** | `#F8FAFC` | `slate-50` / `white` | High-contrast typography & vector strokes |
| **Subtle Border** | `rgba(255,255,255,0.08)` | `border-white/10` | Sleek divider lines and container borders |

---

## 4. Typography System

* **Brand Wordmark & Display Headers:** `Space Grotesk` or `Plus Jakarta Sans` with tight tracking (`tracking-tight` / `-0.02em`).
* **UI Controls & Body Copy:** `Inter` / `Plus Jakarta Sans` for calibrated letter-spacing and readability in data-dense deal lists.
* **Monospace Data (Voucher codes, seeds, coordinates):** `JetBrains Mono` or standard `font-mono`.

---

## 5. Implementation Rules & Best Practices

1. **Vector Only:** Never use raster JPEG/PNG for the primary brand mark inside header navigation or modals. Always embed the inline SVG or load `logo.svg`.
2. **Color Inversion:** When rendering on dark surfaces, use `text-white` or `text-indigo-400`. When rendering on light backgrounds, use `text-slate-950`.
3. **No Drop Shadow Distortions:** Do not apply heavy colored blur/glow filters. Use crisp `drop-shadow(0 2px 8px rgba(0,0,0,0.5))` if elevation is required.
