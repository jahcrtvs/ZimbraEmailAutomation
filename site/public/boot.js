// Turns on the page's motion before first paint. Left off for reduced motion, so nothing starts hidden.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("js");
