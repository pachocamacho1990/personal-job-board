# Aurora Design System

**Aurora** is the visual language of the Job Board v2. It emphasizes clarity, modern aesthetics, and a "glass-like" depth.

## 🎨 Color Palette

### Primary (Indigo)
Used for primary actions, active states, and focus rings.
- **Primary**: `#4F46E5` (Indigo 600)
- **Hover**: `#4338CA` (Indigo 700)
- **Soft**: `rgba(79, 70, 229, 0.1)` (Backgrounds)

### Accent (Purple)
Used for AI/Agent related features and "Interested" status.
- **Accent**: `#A855F7` (Purple 500)
- **Shine**: `rgba(168, 85, 247, 0.4)` (Glow effect)

### Neutrals (Slate)
- **Surface**: `#F8FAFC` (Slate 50) - App Background
- **Canvas**: `#FFFFFF` (White) - Card/Modal Backgrounds
- **Text Main**: `#0F172A` (Slate 900)
- **Text Muted**: `#64748B` (Slate 500)
- **Border**: `#E2E8F0` (Slate 200)

## 🧩 Components

### Cards
- **Background**: White (`#FFFFFF`)
- **Border**: 1px Solid Slate 200 (`#E2E8F0`)
- **Shadow**: `0 1px 3px rgba(0,0,0,0.1)` (Lifted)
- **Radius**: `0.5rem` (8px)

### Badges
- **Shape**: Pill-shaped with full radius.
- **Type**: Flex container with icon + text.
- **Origin**: Distinct icon badge (👤/🤖) for creation source.

### Buttons
- **Primary**: Indigo background, White text, Shadow-sm.
- **Secondary**: White background, Border, Slate text.
- **Danger**: Red text, Red border/background on hover.

## ✨ Visual Effects

### Shine Effect (`.shining`)
- **Use Case**: New jobs created by AI Agents that haven't been viewed.
- **Animation**: 2s infinite pulse of Purple border and shadow.
- **Interaction**: Removed permanently on click.

### Glassmorphism
- **Modals**: Backdrop blur (`backdrop-filter: blur(4px)`) with semi-transparent dark overlay.

### Locked State (Ghost)
- **Use Case**: Jobs that have been transformed into Business Connections.
- **Visual Style**:
    - **Opacity**: `0.6` (Ghosted effect)
    - **Filter**: `grayscale(0.8)` (Optional, to further distinguish)
    - **Indicator**: Lock icon (🔒) or "Converted" badge overlay.
- **Interaction**:
    - **Card**: Clickable to view details (read-only).
    - **Forms**: All inputs disabled (`pointer-events: none`).
    - **Actions**: "Save" and "Delete" buttons hidden.
