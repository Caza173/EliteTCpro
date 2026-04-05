# EliteTC Theme System

## Overview
A centralized, CSS variable-based theming system with global state management, localStorage persistence, and smooth transitions between themes.

## Themes Available
1. **Light** - Clean professional palette (white/gray backgrounds)
2. **Dark** - Deep navy with blue accents (current default)
3. **Cyber** - Neon cyan command center aesthetic

## Architecture

### CSS Variables (globals.css)
All colors and styles are defined as CSS variables organized by category:

```css
/* Light Theme */
[data-theme="light"] {
  --bg-primary:     #F8FAFC;  /* Page background */
  --bg-secondary:   #FFFFFF;  /* Card backgrounds */
  --text-primary:   #0F172A;  /* Main text */
  --accent:         #2563EB;  /* Primary color */
  --success/warning/danger: /* Status colors */
}

/* Dark Theme */
[data-theme="dark"] {
  --bg-primary:     #0F172A;
  --bg-secondary:   #1E293B;
  --text-primary:   #E2E8F0;
  /* ... etc */
}
```

### React Context (ThemeContext)
Manages theme state and localStorage sync:

```javascript
const { theme, setTheme } = useTheme();
setTheme("dark");  // Updates theme and saves to localStorage
```

### UI Toggle (ThemeToggle)
Located in top navigation (right side):
- Click icon: Quick toggle to next theme
- Click dropdown: Select specific theme
- Smooth fade-in animation
- Responsive (icon only on mobile)

## How to Use Theme Variables in Components

### Inline Styles
```jsx
<div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
  Themed content
</div>
```

### Tailwind CSS (with CSS Variables)
```jsx
<div className="p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
  Themed card
</div>
```

### CSS Classes
```css
.my-component {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--card-border);
  transition: all 0.3s ease;  /* Smooth theme switch */
}
```

## Key CSS Variables Reference

| Category | Light | Dark | Purpose |
|----------|-------|------|---------|
| Backgrounds | #F8FAFC | #0F172A | Page background |
| Cards | #FFFFFF | #1E293B | Card/panel background |
| Text Primary | #0F172A | #E2E8F0 | Main text color |
| Text Secondary | #475569 | #94A3B8 | Muted/secondary text |
| Accent | #2563EB | #3B82F6 | Primary interaction color |
| Borders | #E2E8F0 | #334155 | Component borders |
| Success | #16A34A | #22C55E | Success states |
| Warning | #D97706 | #F59E0B | Warning states |
| Danger | #DC2626 | #EF4444 | Error states |

## Smooth Transitions
All theme changes animate smoothly:
- Global transition: `0.3s ease` on background-color, border-color, color, box-shadow
- No layout shift
- All components update instantly

## localStorage Persistence
Theme preference is saved to `localStorage.elitetc_theme`:
- Loaded on page refresh
- Synced across tabs
- Default: Light (if no preference saved)

## Adding New Color Variables
1. Add to all three theme blocks in `globals.css`:
   ```css
   --my-color: #value;
   ```
2. Use anywhere via `var(--my-color)`
3. No component changes needed

## Browser Support
- All modern browsers (Chrome, Firefox, Safari, Edge)
- CSS custom properties (IE 11 not supported)
- localStorage (IE 8+)

## Best Practices
✅ Use `var(--*)` for all colors
✅ Keep component styling in globals.css where possible
✅ Test dark mode for readability
✅ Use `.transition-theme` class for manual transitions
✗ Don't hardcode colors in components
✗ Don't mix Tailwind fixed colors with theme variables