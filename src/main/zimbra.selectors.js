// Selectors for the company's Zimbra web client. Verify with scripts/probe-zimbra.mjs
// against the real site (Task 8, Step 9) and adjust; nothing here may reference a send control.
// NOTE: these are unverified initial guesses; they need a live Zimbra page to confirm.
export const SELECTORS = {
  passwordField: 'input[type="password"]',
  mailMarker: '#zov__main_Mail, .ZmAppChooser, [id^="zb__NEW_MENU"]',
  newMessage: '[id^="zb__NEW_MENU_left_icon"], [id^="zb__App__Mail"] , #zb__NEW_MENU',
  to: 'input[id$="_to_control"], [id$="_to_cell"] input',
  subject: 'input[id$="_subject_control"]',
  bodyFrame: "",
  body: 'textarea[id$="_body_control"], [id$="_body"] textarea, [contenteditable="true"]'
};
