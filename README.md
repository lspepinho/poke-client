# Game UI Studio - Game UI Export

This package was exported from **ArcadeForge Game UI Designer**. It contains the visual assets, layer hierarchy, clickable bounding boxes with geometrical definitions (rectangles, circles, pills), and slide transition states ready for engine integration (Godot, Unity, PixiJS, Phaser, Unreal, or Web Canvas).

---

## 📁 Package Structure

```
├── game-ui-project.json       # Master schema with all slides, hitboxes & layer transforms
├── standalone-player.html     # Double-click to test the interactive game UI offline
├── slides/                    # Per-screen state specifications
│   ├── 01_title_menu.json
│   ├── 02_quest_briefing.json
│   └── ...
├── assets/                    # All visual image assets used in the design
│   ├── bg_celestial_citadel.jpg
│   ├── logo_dragons_legacy.png
│   └── ...
└── README.md                  # This integration guide
```

---

## 🎯 Coordinate System & Geometry

- **Target Resolution**: 1365 x 768 (16:9)
- **Normalized Units**: Coordinates are given in both **Percentage (0 - 100%)** and **Target Pixels**.
- **Bounding Box Shapes**:
  1. `rect`: Axis-Aligned Bounding Box (AABB) defined by `x`, `y`, `width`, `height`.
  2. `circle`: Circular hitbox defined by `centerPixels.x`, `centerPixels.y`, and `radiusPixels`.
  3. `pill`: Capsule shaped button with semicircular ends.

### Hit Testing Formula (Godot / Unity / JS):

```typescript
// Circle hit test
function isPointInCircle(px, py, centerX, centerY, radius) {
  const dx = px - centerX;
  const dy = py - centerY;
  return (dx * dx + dy * dy) <= (radius * radius);
}

// Rectangle hit test
function isPointInRect(px, py, x, y, width, height) {
  return px >= x && px <= (x + width) && py >= y && py <= (y + height);
}
```

---

## 🎮 Action Handling

Each bounding box specifies an action:
- `NAVIGATE_SLIDE`: Switches active game UI state to `targetSlideId` with transition animation.
- `GO_BACK`: Returns to the previous state in the navigation stack.
- `CUSTOM_EVENT`: Fires a gameplay event (e.g. `START_DUNGEON_WHISPERING_CAVERNS`, `VOLUME_LEVEL_CHANGE`).
- `URL_LINK`: External link or web modal.

---

Created with ArcadeForge.
