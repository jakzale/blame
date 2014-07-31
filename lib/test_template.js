/*global describe, it */
// Automatically generated mocha test case
// File {{{ filename }}}

(function ({{{ bindings }}}) {

  // Module runner
  var run = (function () {
    var that = this;
    return function (module) {
      return module.call(that);
    };
  }).call(this);

  // Blame Wrapper
  require = (function (require) {
    var Blame = require('../../build/blame.js'),
      expect = require('chai').expect,
      M = Object.create(null),
      T = new Blame.LazyTypeCache();

    describe('{{{ filename }}} wrappers', function () {
      it('should be well typed', function () {

        /***********************************************************
         *  BLAME DECLARATIONS START                               *
         ***********************************************************/

{{{ declarations }}}

        /***********************************************************
         *  BLAME DECLARATIONS END                                 *
         ***********************************************************/

      });

      it('should wrap all types', function () {
        expect(T.verify()).to.equal(true);
      });
    });

    // External module loading wrapper
    return function (module) {
      var imported = require(module);

      if (Object.prototype.hasOwnProperty.call(M, module)) {
        // TODO: Add better generation of labels
        imported = Blame.wrap(imported, new Blame.Label(), new Blame.Label(),
                              M[module], M[module]);
      }

      return imported;
    };
  }(require));

  // Wrapped Module
  var module = function () {

    /****************************************************************
     *  FILE CONTENTS START                                         *
     ****************************************************************/

{{{ contents }}}

    /****************************************************************
     *  FILE CONTENTS END                                           *
     ****************************************************************/

  };


  // Running the module
  describe('{{{ filename }}} module', function () {
    it('should be well typed', function () {
      run(module);
    });
  });


}).apply(this, [{{{ bindings }}}]);


// vim: set ts=2 sw=2 sts=2 et :
