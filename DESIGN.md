# Design System Documentation

This document describes the design patterns and visual language of the Job Board application, inspired by Notion and ClickUp.

## Design Philosophy

The interface follows a **minimalist, professional aesthetic** inspired by modern productivity tools like Notion and ClickUp. Key principles:

1. **Clean hierarchy**: Clear visual structure with generous spacing
2. **Subtle colors**: Muted, professional color palette with colored accents for status
3. **Functional simplicity**: Every element serves a purpose
4. **Consistent patterns**: Reusable design tokens throughout

---

## Color System

### Base Colors
- **Background Primary**: `#ffffff` - Main app background (white)
- **Background Secondary**: `#f7f6f3` - Board area background (warm off-white)
- **Background Tertiary**: `#ffffff` - Cards and headers (white)
- **Border Color**: `#e3e2df` - Subtle borders for separation
- **Text Primary**: `#37352f` - Main content text (dark warm gray)
- **Text Secondary**: `#787774` - Supporting text (medium gray)
- **Text Tertiary**: `#9b9a97` - Muted text (light gray)

### Status Colors
Each workflow stage has three color variants:
1. **Main color**: Used for column headers and card accents
2. **Background**: Very light tint for column containers
3. **Light**: Slightly stronger tint for column headers

```css
/* Purple for "Interested" */
--color-interested: #9d34da
--color-interested-bg: #f6f3f9 (very light purple)
--color-interested-light: #e9d7f7 (light purple)

/* Blue for "Applied" */
--color-applied: #0b6adb
--color-applied-bg: #edf5fd
--color-applied-light: #d3e5fd

/* Orange for "Interview" */
--color-interview: #eb8909
--color-interview-bg: #fef5e7
--color-interview-light: #fbe4bc

/* Teal for "Offer" */
--color-offer: #0f7b6c
--color-offer-bg: #edfbf6
--color-offer-light: #d4f4ea

/* Gray for "Rejected" */
--color-rejected: #787774
--color-rejected-bg: #f7f6f5
--color-rejected-light: #e9e9e8
```

### Action Colors
- **Accent**: `#2383e2` (blue) - Primary actions, links
- **Danger**: `#eb5757` (red) - Delete, destructive actions
- **Success**: `#4CAF50` (green) - Success states

---

## Typography

### Font Family
```css
ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
```
System fonts for optimal performance and native feel.

### Font Sizes
- **XS**: `0.75rem` (12px) - Count badges
- **SM**: `0.875rem` (14px) - Card details, form labels
- **Base**: `0.9375rem` (15px) - Card titles, column headers
- **LG**: `1rem` (16px) - Form inputs
- **XL**: `1.25rem` (20px) - Panel headers
- **2XL**: `1.875rem` (30px) - App title

### Font Weights
- **Normal**: `400` - Body text
- **Medium**: `500` - Emphasized text, labels
- **Semibold**: `600` - Headings, titles

---

## Spacing System

Consistent spacing scale based on 4px increments:

```css
--spacing-xs: 4px    /* Tight spacing within components */
--spacing-sm: 8px    /* Small gaps, card spacing */
--spacing-md: 12px   /* Medium gaps, card padding */
--spacing-lg: 16px   /* Column gaps, form spacing */
--spacing-xl: 24px   /* Section padding, generous spacing */
--spacing-2xl: 32px  /* Large section padding */
```

### Usage Patterns
- Card padding: `16px` (lg)
- Column gaps: `16px` (lg)
- Board padding: `24px` (xl)
- Header padding: `24px 32px` (xl horizontal, 2xl vertical)

---

## Shadows

Subtle shadows for depth without distraction:

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04)
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.04)
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.08)
```

### Usage
- **SM**: Default card state
- **MD**: Card hover state, elevated elements
- **LG**: Modals, important floating elements

---

## Border Radius

Rounded corners for modern, friendly feel:

```css
--radius-sm: 3px   /* Buttons, small elements */
--radius-md: 6px   /* Cards, columns, inputs */
--radius-lg: 8px   /* Large containers */
```

---

## Component Patterns

### Kanban Columns

**Structure**:
```
Column Container (transparent)
├── Column Header (colored background)
│   ├── Title (colored text)
│   └── Count Badge
└── Cards Container (light colored background)
    └── Job Cards
```

**Visual Pattern**:
- Header has stronger color (`-light` variant)
- Container has very subtle color (`-bg` variant)
- Creates visual "swim lanes" for each status

### Job Cards

**Anatomy**:
- White background with subtle shadow
- 3px colored left border (matches column color)
- 16px padding on all sides
- 6px border radius
- Hover: Lift effect with stronger shadow + 2px translate up

**Content Hierarchy**:
1. Position (semibold, base size, dark text)
2. Company (medium weight, small size, dark text)
3. Location (normal weight, small size, gray text)
4. Salary (normal weight, small size, gray text)

### Lateral Detail Panel

**Structure**:
- Fixed 400px width
- White background
- Left border for separation
- Sticky position on right side

**Sections**:
1. Header: 24px padding, bottom border
2. Form: 24px padding, scrollable
3. Actions: Sticky at bottom (future enhancement)

---

## Interaction Patterns

### Hover States
- **Cards**: Lift 2px + stronger shadow + scale slightly
- **Buttons**: Darken background + subtle shadow
- **Inputs**: Blue border accent

### Drag and Drop
- **Dragging**: 50% opacity + 2deg rotation
- **Drop Zone**: Light background tint on hover

### Transitions
All transitions use `0.15s - 0.2s` with `ease` easing:
```css
transition: all 0.15s ease;
```

---

## Accessibility

### Color Contrast
All text meets WCAG AA standards:
- Primary text on white: 11.9:1
- Secondary text on white: 4.8:1
- Colored headers maintain 4.5:1+ contrast

### Interactive Elements
- Minimum touch target: 40x40px
- Clear focus states (browser default)
- Keyboard navigation supported (ESC to close panel)

---

## Design Tokens Reference

Quick reference for common patterns:

**Card Spacing**:
```css
padding: var(--spacing-lg);  /* 16px all sides */
margin-bottom: var(--spacing-md);  /* 12px gap between cards */
```

**Column Width**:
```css
min-width: 280px;
max-width: 320px;
flex: 1;  /* Grows to fill space */
```

**Form Elements**:
```css
padding: var(--spacing-sm);  /* 8px */
border-radius: var(--radius-sm);  /* 3px */
border: 1px solid var(--border-color);
```

---

## LLM Integration Notes

When modifying this design:

1. **Always use CSS variables** - Never hardcode colors/spacing
2. **Match existing patterns** - Reference this doc for consistency
3. **Maintain hierarchy** - Spacing should increase with importance
4. **Status colors** - Each status has 3 variants (main, bg, light)
5. **Shadows** - Use sparingly (sm default, md on hover)
6. **Border radius** - Match element size (sm for buttons, md for cards)
7. **Transitions** - Keep subtle (0.15-0.2s)

### Common Modifications

**Adding a new status**:
```css
--color-newstatus: #hexcolor
--color-newstatus-bg: #verylighttint
--color-newstatus-light: #lighttint
```

**Changing spacing**:
- Adjust root variables, never hardcode
- Maintain 4px increment pattern

**New components**:
- Start with existing patterns
- Use design tokens from this system
- Match font sizes/weights to existing hierarchy
