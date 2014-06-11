/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  function empty() {return; }

  var tfun = blame.tfun,
    wrap = blame.wrap,
    forall = blame.forall,
    tyvar = blame.tyvar,
    tarr = blame.tarr,
    Bool = blame.Bool,
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
    it('accept idenitity', function () {
      function identity(x) { return x; }
      var type = forall('X', tfun(tyvar('X'), tyvar('X'))),
        label = gen_label(),
        wrapped_identity = wrapped(type, identity, label);

        [1, 'a', true].forEach(function (value) {
          expect(wrapped_identity(value)).not.to.throw();
          expect(wrapped_identity(value)()).to.equal(value);
        });
    });

    it('should complain about undefined tyvars', function () {
      var type = forall('X', tfun(tyvar('X'), tyvar('Z'), tyvar('X'))),
        label = gen_label();

      function first(x, y) { unused(y); return x; }

      expect(function () {
        wrap(type, first, label)(1, 2);
      }).to.throw('Z is not defined');
    });

    it('should complain about defining tyvar twice', function () {
      var type = forall('X', forall('X', tfun(tyvar('X'), tyvar('X')))),
        label = gen_label();

      function identity(x) { return x; }

      expect(function () {
        wrap(type, identity, label)(1);
      }).to.throw();
    });

    //it('should prevent sealed values leaving the function', function () {
    //  var type = forall('X', tfun(tyvar('X'), Any)),
    //    label = gen_label();

    //  function idenitity(x) { return x; }

    //  // TODO: Check if it throws the right blame label
    //  expect(function () {
    //    wrap(type, idenitity, label)(1);
    //  }).to.throw(label);
    //});
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

  describe('Seal Generation', function () {
    it('should generate fresh seals', function () {
      var type = forall('X', tfun(tyvar('X'), tyvar('X'))),
      repeat = false,
      label = gen_label(),
      keep;

      function iden_or_repeat(value) {
        if (repeat) {
          return keep;
        }

        keep = value;
        repeat = true;
        return value;
      }

      expect(function () {
        var wrapped_iden_or_repeat = wrap(type, iden_or_repeat, label);

        wrapped_iden_or_repeat(1);
        wrapped_iden_or_repeat(2);

      }).to.throw();
    });
  });

  describe('More Complex Polymorphic Tests', function () {
    describe('Example From Phil', function () {
      //var type = forall('Y', forall('X', tfun(tfun(tfun()))))
      unused();
    });

    describe('Array Operations', function () {
      var type = forall('X', tfun(tarr(tyvar('X')), tyvar('X'))),
        type_id = forall('X', tfun(tarr(tyvar('X')), tarr(tyvar('X')))),
        label = gen_label();

      function apply(fun, val) {
        return function () {
          return fun(val);
        };
      }

      it('should allow to define head', function () {
        function head(a) {
          return a[0];
        }

        var wrapped_head = wrap(type, head, label),
          closure = apply(wrapped_head, [1, 2, 3]);

        expect(closure).to.not.throw();
        expect(closure()).to.equal(1);
      });

      it('should allow to define last', function (){
        function last(a) {
          return a[a.length - 1];
        }

        var wrapped_last = wrap(type, last, label),
          closure = apply(wrapped_last, [1, 2, 3]);

        expect(closure).not.to.throw();
        expect(closure()).to.equal(3);
      });

      it('should allow to define array identity', function () {
        function array_id(a) {
          return a;
        }

        var wrapped_id = wrap(type_id, array_id, label),
          a = [1, 2, 3, 4, 5],
          closure = apply(wrapped_id, a);

          expect(closure).not.to.throw();

          var b = closure();

          a.forEach(function (v, i) {
            expect(b[i]).to.equal(v);
          });

      });

      it('should allow to define reverse', function () {
        function reverse(a) {
          var b = [],
            l = a.length,
            i = 0;

          while(l--) {
            b[i++] = a[l];
          }

          return b;
        }

        var wrapped_reverse = wrap(type_id, reverse, label),
          a = ['a', '1', true, 2],
          closure = apply(wrapped_reverse, a);

        expect(closure).not.to.throw();

        var b = closure();
        // Reverse a:
        a.reverse();
        a.forEach(function (v, i){
          expect(b[i]).to.equal(v);
        });
      });

      it('should allow to define filter', function () {
        function filter(f, a) {
          var b = [], i = 0, k = 0;

          for (i = 0; i < a.length; i++) {
            if (f(a[i])) {
              b[k++] = a[i];
            }
          }

          return b;
        }

        function is_even(x) {
          return (x % 2) === 0;
        }

        var type_filter = forall('X', tfun(tfun(tyvar('X'), Bool), tarr(tyvar('X')), tarr(tyvar('X')))),
        wrapped_filter = wrap(type_filter, filter, label),
        closure = function () {
          return wrapped_filter(is_even, [1, 2, 3, 4, 5, 6]);
        };

        expect(closure).not.to.throw();

        var b = closure();

        [2, 4, 6].forEach(function (v, i) {
          expect(b[i]).to.equal(v);
        });
      });


      it('should allow to define map', function () {
        function map(f, a) {
          var b = [], i;

          for (i = 0; i < a.length; i++) {
            b[i] = f(a[i]);
          }

          return b;
        }

        function add1(x) {
          return x + 1;
        }

        var type_map = forall('X', forall('Y', tfun(tfun(tyvar('X'), tyvar('Y')), tarr(tyvar('X')), tarr(tyvar('Y'))))),
          wrapped_map = wrap(type_map, map, label),
          closure = function () {
            return wrapped_map(add1, [1, 2, 3, 4]);
          };

          expect(closure).not.to.throw();

          var b = closure();
          [2, 3, 4, 5].forEach(function (v, i) {
            expect(b[i]).to.equal(v);
          });

      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
