Tinted pill showing a digest's lifecycle state. Use the same status everywhere (home card, page header, lists).
```jsx
<StatusBadge status="ready" />
<StatusBadge status="scheduled" detail="5:00 PM" />
<StatusBadge status="sent" detail="5:01 PM" />
```
Statuses: none, draft, generating (pulse), ready, scheduled, sending, sent, failed, cancelled, missed.
