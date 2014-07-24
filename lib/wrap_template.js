// Automatically generated Blame wrapper
// File {{{ filename }}}
(function (require) {

  // --- FILE CONTENTS START ---
{{{ contents }}}
  // --- FILE CONTENTS END ---

// Injecting the outer context into the wrapper
}).call(this,
        (function () {
          var Blame = require('../../build/blame.js'),
          declaredModules = Object.create(null);

  // BLAME DECLARATIONS START
{{{ declarations }}}
  // BLAME DECLARATIONS END

  return function (module) {
    var imported = require(module);

    if (Object.prototype.hasOwnProperty.call(declaredModules, module)) {
      // TODO: Add better generation of labels
      imported = Blame.wrap(imported, new Blame.Label(), new Blame.Label(),
                            declaredModules[module], declaredModules[module]);
    }

    return imported;
  };
}()));

// vim: set ts=2 sw=2 sts=2 et :
