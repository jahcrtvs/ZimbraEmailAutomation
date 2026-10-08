Centered dialog over a dark scrim; closes on Esc or scrim click. Covers its nearest positioned ancestor (the app window) unless `fixed`.
```jsx
<Modal title="Schedule Daily Digest" onClose={close} footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary">Schedule Digest</Button></>}>
  …fields…
</Modal>
```
