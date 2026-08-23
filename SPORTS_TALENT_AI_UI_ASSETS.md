# Sports Talent AI — UI/UX Asset Library
This file is the single source of truth for images and visual assets used by the Sports Talent AI frontend.

## Design System Status

The current implementation integrates a Kinetic Precision visual system into the existing Next.js app without replacing the working vertical-jump assessment flow, MediaPipe/OpenCV processing, or backend API contracts.

- Theme: dark athletic surfaces, electric lime highlights, glass navigation, Montserrat / Inter / JetBrains Mono typography
- Production rule: no external Stitch image URLs are used in production; local `public/assets/...` placeholders are the default
- Design reference status: `REFERENCE ONLY`; all shipped visuals must remain local and approved by the team

## Folder Structure

```
public/
└── assets/
    ├── hero/
    ├── athletes/
    ├── sports/
    ├── assessments/
    ├── technology/
    ├── backgrounds/
    └── icons/
```

## Rules for VS Code / AI Coding Agents

1. Before adding a new image, check this file first.
2. Reuse an existing asset when possible.
3. Do not hardcode random external image URLs inside React/Next.js components.
4. Keep image files inside `public/assets/`.
5. Use descriptive filenames, not names such as `IMG_1234.jpg`.
6. Every externally sourced image must have a source URL and license/usage note recorded below.
7. Do not copy proprietary images from ai.io, Picsart, or other commercial products unless we have permission to use them.
8. The ai.io/3DAT screenshot is a visual reference only. Our final assets and UI must be original.
9. Prefer licensed stock images, project-owned images, or AI-generated visuals.
10. When replacing an image, update this file instead of changing image paths throughout the application.

---

# Asset Inventory

## 1. Hero Images

### hero-main

- File: `public/assets/hero/hero-main.webp`
- Purpose: Main landing-page athlete hero
- Recommended composition: Athlete on the right, dark negative space on the left for headline
- Style: Cinematic sports photography
- Status: `PLACEHOLDER`
- Source: `Local design placeholder / approved asset pending`
- License: `Pending approval`

### hero-main

- File: `public/assets/hero/hero-main.webp`
- Purpose: Kinetic Precision hero surface and visual framing
- Status: `PLACEHOLDER`
- Source: `Project-local asset path only`
- License: `Pending approval`

### hero-motion-analysis

- File: `public/assets/hero/hero-motion-analysis.webp`
- Purpose: Motion-analysis / AI Lab visual
- Recommended composition: Athlete with visible pose-tracking treatment
- Status: `PLACEHOLDER`
- Source: `Project-local asset path only`
- License: `Pending approval`

### hero-motion-analysis

- File: `public/assets/hero/hero-motion-analysis.webp`
- Purpose: Secondary motion-analysis panel in Kinetic Precision landing page
- Status: `PLACEHOLDER`
- Source: `Project-local asset path only`
- License: `Pending approval`

---

## 2. Athlete Images

### athlete-volleyball

- File: `public/assets/athletes/athlete-volleyball.webp`
- Purpose: Volleyball talent card
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

### athlete-basketball

- File: `public/assets/athletes/athlete-basketball.webp`
- Purpose: Basketball talent card
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

### athlete-football

- File: `public/assets/athletes/athlete-football.webp`
- Purpose: Football talent card
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

### athlete-athletics

- File: `public/assets/athletes/athlete-athletics.webp`
- Purpose: Athletics / sprint talent card
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

---

## 3. Assessment Images

### vertical-jump

- File: `public/assets/assessments/vertical-jump.webp`
- Purpose: Vertical Jump assessment
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

### sprint

- File: `public/assets/assessments/sprint.webp`
- Purpose: Sprint assessment / future feature
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

### agility

- File: `public/assets/assessments/agility.webp`
- Purpose: Agility assessment / future feature
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

---

## 4. Technology / AI Images

### pose-estimation

- File: `public/assets/technology/pose-estimation.webp`
- Purpose: AI Lab pose-estimation section
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

### motion-tracking

- File: `public/assets/technology/motion-tracking.webp`
- Purpose: Motion tracking / biomechanics section
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

---

## 5. Backgrounds

### dark-sports-background

- File: `public/assets/backgrounds/dark-sports-background.webp`
- Purpose: Section background
- Status: `TODO`
- Source: `TODO`
- License: `TODO`

---

# Image Usage Guidelines

## Hero
Use a large, high-resolution image.

Preferred:

- 16:9 or wider
- athlete positioned away from text
- strong subject separation
- dark/neutral background
- enough negative space for typography

## Cards
Use consistent:

- aspect ratio
- crop
- border radius
- image treatment

## Performance / AI sections
Prefer visuals that communicate:

- movement
- biomechanics
- pose estimation
- performance analytics
Avoid generic AI robot imagery.

---

# Asset Status
Use one of these statuses:

- `TODO` — asset still needs to be added
- `READY` — asset exists and is approved for UI use
- `REPLACE` — temporary asset; replace before final demo
- `LICENSE-CHECK` — source/usage rights need verification

---

# Naming Convention
Use:

```
category-subject-descriptor.webp
```
Examples:

```
hero-main.webp
athlete-volleyball.webp
vertical-jump.webp
pose-estimation.webp
dark-sports-background.webp
```
Avoid:

```
IMG_1234.jpg
download.png
image-final-final2.png
```

---

# Important Product Rule
The website should feel inspired by premium sports-tech platforms, but it must have its own visual identity.

Reference direction:

- cinematic athlete photography
- dark interface
- white typography
- lime/green accent
- motion-tracking graphics
- premium spacing
- minimal navigation
- data-driven UI
Do not reproduce another company's exact artwork, branding, copy, or proprietary assets
