Pill button. Exactly one `primary` (orange) per screen marks the next action; everything else is secondary/outline/ghost.
```jsx
<Button variant="primary" icon="sparkles" kbd="⌘↵">Generate Digest</Button>
<Button variant="outline" icon="pencil">Edit</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="primary" loading>Generating…</Button>
```
States: hover (lighter), active (darker + scale .97), disabled (40%), loading (spinner).
