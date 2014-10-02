Blame Calculus
==============
A simple implementation of Blame calculus in JavaScript.

Notice
------
Because the model for overloaded functions needs to be updated, generating wrappers for overloaded functions is slightly buggy.

TODO
----
1. Add *useful* information to this Readme
2. Give pointers on compiling node with harmony flags on by default
3. Clean stuff:
    - refactor out gulp-karma
    - remove dependency on git submodules -- find a neater way
4. Fix stuff:
    - Fix the model for overloaded functions
    - refactor shell scripts to JavaScript
    - cache results of querying npm registry in json
    - output results to json

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

