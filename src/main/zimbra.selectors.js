// Selectors for the company's Zimbra web client. Verify with scripts/probe-zimbra.mjs
// against the real site and adjust; nothing here may reference a send control.
// Based on the Zimbra 8+ classic (Ajax) client: compose ids look like zv__COMPOSE-1_to_control
// (a textarea), zv__COMPOSE-1_subject_control, and the HTML body is a TinyMCE iframe (*_body_ifr).
// Still unconfirmed against the live server.
export const SELECTORS = {
  passwordField: 'input[type="password"]',
  mailMarker: '#zov__main_Mail, .ZmAppChooser, [id^="zb__NEW_MENU"]',
  newMessage: '#zb__NEW_MENU_title, [id^="zb__NEW_MENU_left_icon"], #zb__NEW_MENU',
  to: 'textarea[id$="_to_control"], input[id$="_to_control"], [id$="_to_cell"] textarea, [id$="_to_cell"] input',
  subject: 'input[id$="_subject_control"]',
  // Plain-text compose mode.
  body: 'textarea[id$="_body"], textarea[id$="_body_control"], [id$="_body"] textarea',
  // HTML compose mode: TinyMCE iframe and its editable body.
  bodyFrame: 'iframe[id$="_body_ifr"]',
  bodyInFrame: 'body#tinymce, body[contenteditable="true"]'
};
