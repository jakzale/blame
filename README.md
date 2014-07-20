Blame Calculus
==============

A simple implementation of Blame calculus in JavaScript.

Karma
-----
* Because the Proxy API is quite unstable, right now direct Proxies are only available in Firefox, therefore for testing we will switch to using Karma connected to Firefox.


Project Structure
-----------------

```
.
├── build     -- JavaScript files compiled from TypeScript files
├── lib       -- plain JavaScript files
├── src       -- TypeScript files
└── test      -- Tests
    └── gen   -- Generated bundle for the browser

```

