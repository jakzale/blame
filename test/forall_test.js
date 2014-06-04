/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  function empty() {return; }

  var
    //Num = blame.Num,
    //Str = blame.Str,
    //Bool = blame.Bool,
    //Fun = blame.Fun,
    Any = blame.Any,
    tfun = blame.tfun,
    wrap = blame.wrap,
    forall = blame.forall,
    tyvar = blame.tyvar,
    unused = empty,
    gen_label;


  gen_label = (function () {
    var counter = 0;

    return function () {
      counter += 1;

      return 'label_' + counter;
    };
  }());


  // Generating test cases:

  function wrapped(type, fun, label) {
    return function (arg) {
      return function () {
        var wrapped_fun = wrap(type, fun, label);
        return wrapped_fun(arg);
      };
    };
  }

  describe('Polymorphic Functions', function () {
    it('should accept identity', function () {
      var closure,
        label = gen_label(),
        type = forall('X', tfun(tyvar('X'), tyvar('X')));

      function identity(x) { return x; }

      closure = wrapped(type, identity, label)(1);

      expect(closure).not.to.throw();

    });

    it('should complain about undefined tyvars', function () {
      var type = forall('X', tfun(tyvar('X'), tyvar('Z'), tyvar('X'))),
        label = gen_label();

      function first(x, y) { unused(y); return x; }

      expect(function () {
        wrap(type, first, label)(1, 2);
      }).to.throw('Z is not defined');
    });

    it('should prevent sealed values leaving the function', function () {
      var type = forall('X', tfun(tyvar('X'), Any)),
        label = gen_label();

      function idenitity(x) { return x; }

      // TODO: Check if it throws the right blame label
      expect(function () {
        wrap(type, idenitity, label)(1);
      }).to.throw(label);
    });
  });

  describe('Polymorphic Functions', function () {
    it('should accept identity', function () {
      var
        label = gen_label(),
        //bad_label = gen_label(),
        type = forall('X', tfun(tyvar('X'), tyvar('X'))),
        typed_identity;
        //typed_bad;

      function identity(x) { return x; }

      //function bad(x) {
      //  if (typeof x === 'number') {
      //    return x + 1;
      //  }

      //  return x;
      //}

      typed_identity = wrap(type, identity, label);
      //typed_bad = wrap(type, bad, bad_label);

      // TODO: Figure how to pass this
      //expect(function () {
      //  typed_bad(2);
      //}).to.throw();

      expect(function () {
        typed_identity(2);
      }).not.to.throw();

    });
  });

  describe('Nested Foralls', function () {
    it('should check for the right seal', function () {
      var label = gen_label(),
      bad_label = gen_label(),
      type = forall('X', forall('Y', tfun(tyvar('X'), tfun(tyvar('Y'), tyvar('X')))));


      function good(x) {
        return function (y) {
          unused(y);
          return x;
        };
      }

      function bad(x) {
        return function (y) {
          unused(x);
          return y;
        };
      }

      var typed_good = wrap(type, good, label);

      expect(function () {
        typed_good(1)(1);
      }).not.to.throw();
      expect(function () {
        typed_good('a')('a');
      }).not.to.throw();

      var typed_bad = wrap(type, bad, bad_label);

      expect(function () {
        typed_bad(1)(1);
      }).to.throw(/wrong seal/);

      expect(function () {
        typed_bad('a')('a');
      }).to.throw(/wrong seal/);

    });
  });

  describe('Multiple Arguments', function () {
    it('should check for the right seal', function () {
      var label = gen_label(),
      AX_XXX = forall('X', tfun(tyvar('X'), tyvar('X'), tyvar('X'))),
      AX_AY_XYX = forall('X', forall('Y', tfun(tyvar('X'), tyvar('Y'), tyvar('X'))));

      function first(x, y) {
        unused(y);
        return x;
      }

      function second(x, y) {
        unused(x);
        return y;
      }

      function wrap2(type, fun, label) {
        return function () {
          wrap(type, fun, label)(1, 1);
        };
      }

      expect(wrap2(AX_XXX, first, label)).not.to.throw();
      expect(wrap2(AX_XXX, second, label)).not.to.throw();

      expect(wrap2(AX_AY_XYX, first, label)).not.to.throw();
      expect(wrap2(AX_AY_XYX, second, label)).to.throw(label);
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
