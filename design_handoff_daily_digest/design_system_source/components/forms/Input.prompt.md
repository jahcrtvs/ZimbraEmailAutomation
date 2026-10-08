Single-line text field with label, helper and error. Focus = orange border + soft ring.
```jsx
<Input label="Default recipient" value={to} onChange={setTo} />
<Input label="Zimbra URL" error="Couldn't reach this address" />
```
States: default, focus, filled, error, disabled.
