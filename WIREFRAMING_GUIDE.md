# Wireframe Generation Guide

This guide establishes a standard protocol for creating reliable, low-fidelity wireframes using AI image generation tools. It ensures consistency across sessions and features.

## 1. Visual Style & Aesthetics

**Style Name**: "Blueprint Dark Mode Wireframe"

**Core Characteristics**:
- **Low Fidelity**: Focus on layout and structure, not detailed UI polish.
- **Monochrome with Accent**: Dark gray background, white/light gray lines for structure, single accent color (Purple/Violet) for active elements/interactions.
- **Font**: Monospaced or simple sans-serif (e.g., Roboto Mono), legible at small sizes.
- **Shapes**:
  - **Containers**: Boxy, 2px borders, rounded corners (4px).
  - **Buttons**: Rectangular, distinct borders.
  - **Inputs**: Rectangular, lighter background fill.
  - **Images/Media**: Placeholders with crossed lines (X).
  - **Text**: Squiggly lines for paragraphs, block rectangles for headers if text content isn't critical.

**Color Palette**:
- **Background**: `#1E1E1E` (Dark Grey)
- **Container Background**: `#2D2D2D` (Lighter Grey)
- **Lines/Borders**: `#E0E0E0` (Off-White)
- **Accent/Action**: `#A855F7` (Purple - Matching app theme)
- **Text**: `#FFFFFF` (White)

## 2. Prompt Structure

To generate a wireframe, construct the prompt using this template:

```markdown
**Context**: [Device Type] wireframe for [Screen/Feature Name].
**Layout**: [Layout Description: Grid, Sidebar, Modal, etc. Be specific about position].
**Components**:
- [Component 1]: [Description of look, size, and position].
- [Component 2]: [Description of look, size, and position].
**Style**: Low-fidelity, blueprint style, dark mode. Dark grey background (#1E1E1E), white outlines (#E0E0E0), purple accents (#A855F7) for buttons/active states. Clean lines, flat design, no shadows, no gradients. Text placeholders are squiggly lines.
**Specific Renderings**:
- [Element A] should be labeled "[Exact Text]".
- [Element B] should look like [Analogy, e.g., "a floating card"].
```

## 3. Component Control Library

Use these standard descriptions for common UI elements:

| Component | Prompt Description |
|-----------|--------------------|
| **Modal** | "A centered rectangular overlay card with high contrast border. It floats above the darkened background content." |
| **Sidebar** | "A vertical column on the left/right spanning full height. Defined by a solid vertical separator line." |
| **List Item** | "A horizontal rectangle containing a small square (icon placeholder) on the left and two stacked horizontal lines (text lines) on the right." |
| **Button (Primary)** | "A solid purple rectangle with white text label centered inside." |
| **Button (Secondary)** | "A transparent rectangle with a purple border and purple text." |
| **Input Field** | "A rectangle with a thin white border and a text label floating on the top-left border." |
| **Toggle/Switch** | "A small pill-shaped container with a circle inside shifted to one side." |
| **Tabs** | "A horizontal row of text labels, with the active one having a solid purple underline." |

## 4. Example: Job Details Panel

**Prompt**:
> "Desktop wireframe for a Job Details Panel.
> **Layout**: A right-side vertical drawer panel occupying 1/3 of the screen width. The left 2/3 is a blurred list of cards.
> **Components**:
> - **Header**: Top of the panel has a bold title hierarchy.
> - **Attachments Section**: Located in the middle. clearly titled 'Attachments'.
> - **File List**: Vertical stack of two rectangles. Each rectangle has a file icon (small square) on the left, filename text, and a pill-shaped button on the right.
> - **Primary Button**: At the bottom, a solid purple button labeled 'Save Changes'.
> **Style**: Low-fidelity wireframe, dark mode, white outlines on dark grey. Purple accent for the 'Save Changes' button and the active file pill button."

## 5. Workflow

1.  **Define Requirements**: Identify the user story and necessary UI elements.
2.  **Select Components**: internalize the component controls from Section 3.
3.  **Construct Prompt**: Fill the template in Section 2.
4.  **Generate**: detailed generation command.
5.  **Review**: Check against visual style guidelines.
