# CSS Animation Delay Flash Fix

## Problem

When using CSS animations with `animation-delay`, elements would appear visible first, then "flash" or appear to animate twice.

## Root Cause

The element's initial state before an animation starts is determined by its **static CSS properties**, not the keyframe's `from` state.

```css
/* ❌ Broken - element is visible, then jumps to opacity:0 when delay ends */
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease forwards;
  animation-delay: 0.1s;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Without `opacity: 0` on the element itself:
1. Element renders fully visible (default `opacity: 1`)
2. Animation delay passes
3. Animation starts → element jumps to `opacity: 0` (keyframe `from`)
4. Animation completes → element fades to `opacity: 1`

This causes a visible "flash" or double-animation effect.

## Solution

Set the initial state on the element to match the keyframe's `from` state:

```css
/* ✅ Fixed - element starts hidden, stays hidden during delay, then animates */
.animate-fade-in-up {
  opacity: 0;
  transform: translateY(16px);
  animation: fade-in-up 0.5s ease forwards;
}
```

The `forwards` fill mode ensures the element stays at the `to` state after animation completes.

## Files Changed

- `src/app/globals.css` - Added initial state to `.animate-fade-in-up` class

## Related

- MDN: [animation-fill-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode)
- The `stagger-children` utility already handled this correctly by setting `opacity: 0` on child elements
