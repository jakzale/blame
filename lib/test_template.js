/*global describe, it */
// Automatically generated mocha test case
// File {{{ filename }}}

(function (context, module, require) {
  describe('Wrapper for {{{ filename }}}', function () {
    module.call(context, require);
  });
}(this,
  function (require) {

// --- FILE CONTENTS START ---

{{{ contents }}}

// --- FILE CONTENTS END ---

  },
  (function () {
    var Blame = require('../../build/blame.js'),
      M = Object.create(null),
      T = new Blame.LazyTypeCache(),
      expect = require('chai').expect;

      describe('{{{ filename }}}', function () {
        it('should be well typed', function () {

// --- BLAME DECLARATIONS START ---

{{{ declarations }}}

// --- BLAME DECLARATIONS END ---

        // Verifying the type cache
        });

        it('should wrap all types', function () {
          expect(T.verify()).to.equal(true);
        });
      });

    return function (module) {
      var imported = require(module);

      if (Object.prototype.hasOwnProperty.call(M, module)) {
        // TODO: Add better generation of labels
        imported = Blame.wrap(imported, new Blame.Label(), new Blame.Label(),
                              M[module], M[module]);
      }

      return imported;
    };
  }())
 ));

// vim: set ts=2 sw=2 sts=2 et :
