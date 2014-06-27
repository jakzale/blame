
/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  // Global utils
  function empty() { return; }
  var unused = empty,
    used = empty;

  used(unused);

  var wrap = blame.wrap,
    Label = blame.Label,
    fun = blame.fun,
    Num = blame.Num,
    Bool = blame.Bool,
    Str = blame.Str,
    Und = blame.Und,
    tyvar = blame.tyvar,
    forall = blame.forall,
    arr = blame.arr;

  function identity (x) { return x; }

  function gen_const (x) {
    return function () {
      return x;
    };
  }

  function closed(f) {
    return function () {
      var args = Array.prototype.slice.call(arguments || []);
      return function () {
        return f.apply(undefined, args);
      };
    };
  }

  function wrapped(value, p, q, A, B) {
    return function() {
      return wrap(value, p, q, A, B);
    };
  }

  function wrap_fun(fun, p, q, A, B) {
    var wrapped_fun = wrap(fun, p, q, A, B);
    return closed(wrapped_fun);
  }

  // Some constants for testing
  var p = new Label(),
    q = new Label(),
    values = [1, 'a', true, undefined, empty, []],
    types = [Num, Str, Bool, Und, fun(Und), arr(Num)];

  describe('Blame module', function () {
    it('should be imported and populated', function () {
      [blame, wrap, Label, fun, Num, Bool, Str, Und, tyvar, forall, arr].forEach(function (v) {
        used(expect(v).to.exist);
      });
    });

    describe('blame labels', function () {
      it('should initialize properly', function () {
        var l1 = new Label(),
          l2 = new Label();
        expect(l1.label).to.not.equal('label');
        expect(l1.label).to.not.equal(l2.label);
      });

      it('should negate properly', function () {
        var l1 = new Label(),
          l2 = l1.negated();
        expect(l1.label).to.equal(l2.label);
        expect(l1.status).to.not.equal(l2.status);
      });
    });
  });

  describe('wrapping', function () {

    describe('basic types', function () {
      it('should permit proper types', function () {
        types.forEach(function (type, i) {
          var value = values[i];
          expect(wrapped(value, p, q, type, type)).not.to.throw();
        });
      });

      it('should reject improper types', function () {
        types.forEach(function (type, i) {
          values.forEach(function (value, j) {
            if (i !== j) {
              //console.log(type);
              expect(wrapped(value, p, q, type, type)).to.throw(p.msg());
            }
          });
        });
      });
    });

    describe('functions', function () {

      it('should permit types for identity', function () {
        types.forEach(function (type, i) {
          var fun_type = fun(type, type),
            closed_good = wrap_fun(identity, p, q, fun_type, fun_type),
            value = values[i];

          closed_good(value)();
          //expect(closed_good(value)).not.to.throw();
        });
      });

      it('should pass the mix of types', function () {
        types.forEach(function (type, i) {
          types.forEach(function (type2, j) {
            values.forEach(function (value, k) {
              values.forEach(function (value2, l) {
                var fun_type = fun(type, type2),
                  closed_fun = wrap_fun(gen_const(value2), p, q, fun_type, fun_type);

                if (i !== k) {
                  // Wrong argument
                  expect(closed_fun(value)).to.throw(q.msg());
                } else if (j !== l) {
                  // Wrong return value
                  expect(closed_fun(value)).to.throw(p.msg());
                } else {
                  // Both ok
                  expect(closed_fun(value)).not.to.throw();
                }
              });
            });
          });
        });
      });

      describe('with multiple arguments', function () {
        var type2 = fun(Num, Num, Num),
          closed_id = wrap_fun(identity, p, q, type2, type2);

        it('should accept right number of arguments', function () {
          expect(closed_id(1, 2)).not.to.throw();
        });

        it('should reject wrong number of arguments', function () {
          expect(closed_id(1)).to.throw('wrong number of arguments');
        });
      });
    });

    describe('foralls', function () {
      var type_id = forall('X', fun(tyvar('X'), tyvar('X')));

      it('should accept identity', function () {
        var forall_id = wrap_fun(identity, p, q, type_id, type_id);
        values.forEach(function (v){
          expect(forall_id(v)).not.to.throw();
          expect(forall_id(v)()).to.equal(v);
        });
      });

      it('should reject other functions', function () {
        function bad () {
          return 1;
        }
        expect(function () {
          wrap(bad, p, q, type_id, type_id)(1);
        }).to.throw(q.negated().msg());
      });

      it('should accept Phills example', function () {
        // forall Y. (forall X. (Y -> X) -> X) -> Y
        function my_iden(x) {
          return x;
        }
        function app(f) {
          var x = f(1);
          return x;
        }
        function apply(app) {
          var y = app(my_iden);
          return y;
        }
        var type = forall('Y', fun(forall('X', fun(fun(tyvar('Y'), tyvar('X')), tyvar('X'))), tyvar('Y'))),
          closed_fun = wrap_fun(apply, p, q, type, type);

          expect(closed_fun(app)).not.to.throw();
      });

      it('should generate fresh seals', function () {
        var repeat = false,
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
          var wrapped_iden_or_repeat = wrap(iden_or_repeat, p, q, type_id, type_id);

          wrapped_iden_or_repeat(1);
          wrapped_iden_or_repeat(2);

        }).to.throw(q.negated().msg());

      });
    });


    it('should check for the right seal', function () {
      function first(x, y) {
        unused(y);
        return x;
      }

      function second(x, y) {
        unused(x);
        return y;
      }
      var AX_XXX = forall('X', fun(tyvar('X'), tyvar('X'), tyvar('X'))),
      AX_AY_XYX = forall('X', forall('Y', fun(tyvar('X'), tyvar('Y'), tyvar('X'))));

      expect(wrap_fun(first, p, q, AX_XXX, AX_XXX)(1, 1)).not.to.throw();
      expect(wrap_fun(second, p, q, AX_XXX, AX_XXX)(1, 1)).not.to.throw();

      expect(wrap_fun(first, p, q, AX_AY_XYX, AX_AY_XYX)(1, 1)).not.to.throw();
      expect(wrap_fun(second, p, q, AX_AY_XYX, AX_AY_XYX)(1, 1)).to.throw(q.negated().msg());
    });

  });

  describe('Arr', function () {
    it('should wrap arrays', function () {
      [[], [1], [1, 2, 3]].forEach(function (e) {
        expect(wrapped(e, p, q, arr(Num), arr(Num))).not.to.throw();
        expect(wrap(e, p, q, arr(Num), arr(Num))).not.to.equal(e);
      });
    });

    it('wrap arrays lazily', function () {
      [[], ['a'], [true]].forEach(function (e) {
        expect(wrapped(e, p, q, arr(Num), arr(Num))).not.to.throw();
      });
    });

    it('should check on read', function () {
      function get(array, i) {
        return function () {
          return array[i];
        };
      }

      types.forEach(function (type, i) {
        values.forEach(function (value, j) {
          var atype = arr(type),
          array = wrap([value], p, q, atype, atype);

          if (i === j) {
            expect(get(array, 0)).not.to.throw();
            //expect(array[0]).to.equal(value);
          } else {

            expect(get(array, 0)).to.throw(p.msg());
          }
        });
      });
    });

    it('should check on write', function () {
      function set(array, i, v) {
        return function () {
          array[i] = v;
        };
      }

      types.forEach(function (type, i) {
        values.forEach(function (value, j) {
          var atype = arr(type),
          array = wrap([value], p, q, atype, atype);

          if (i === j) {
            expect(set(array, 0, value)).not.to.throw();
            //expect(array[0]).to.equal(value);
          } else {

            expect(set(array, 0, value)).to.throw(q.msg());
          }
        });
      });
    });
  });

  describe('forall arrays', function () {
      var type_single = forall('X', fun(arr(tyvar('X')), tyvar('X'))),
        type_multi = forall('X', fun(arr(tyvar('X')), arr(tyvar('X')))),
        array = [1, 2, 3, 4, 5];

        function check(array, reference) {
          return function () {
            var i;
            for (i = 0; i < array.length; i++) {
              if (array[i] !== reference[i]) {
                throw new Error('value mismatch: ' + array[i] + ', not ' + reference[i]);
              }
            }
          };
        }

    describe('simple operations', function () {
      it('should allow to define head', function () {
        function head(a) {
          return a[0];
        }

        function bad(a) {
          unused(a);
          return 1;
        }

        expect(wrap_fun(head, p, q, type_single, type_single)(array)).not.to.throw();
        expect(wrap(head, p, q, type_single, type_single)(array)).to.equal(1);

        expect(wrap_fun(bad, p, q, type_single, type_single)(array)).to.throw(q.negated().msg());
      });

      it('should allow to define rest', function () {
        function rest(a) {
          var ret = [], i;

          for (i = 1; i < a.length; i++) {
            ret[i - 1] = a[i];
          }

          return ret;
        }

        var ref = [2, 3, 4, 5];

        function bad() {
          return ref;
        }


        expect(check(wrap(rest, p, q, type_multi, type_multi)(array), ref)).not.to.throw();
        expect(check(wrap(bad, p, q, type_multi, type_multi)(array), ref)).to.throw(q.negated().msg());
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

        var ref = [5, 4, 3, 2, 1];

        function bad() {
          return ref;
        }

        expect(check(wrap(reverse, p, q, type_multi, type_multi)(array), ref)).not.to.throw();
        expect(check(wrap(bad, p, q, type_multi, type_multi)(array), ref)).to.throw(q.negated().msg());
      });
    });

    describe('advanced operations', function () {
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

        var ref = [2, 4];

        function bad() {
          return ref;
        }

        var type_filter = forall('X', fun(fun(tyvar('X'), Bool), arr(tyvar('X')), arr(tyvar('X'))));

        expect(check(wrap(filter, p, q, type_filter, type_filter)(is_even, array), ref)).not.to.throw();
        expect(check(wrap(bad, p, q, type_filter, type_filter)(is_even, array), ref)).to.throw(q.negated().msg());
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

        var ref = [2, 3, 4, 5, 6];

        function bad() {
          return ref;
        }

        var type_map = forall('X', forall('Y', fun(fun(tyvar('X'), tyvar('Y')), arr(tyvar('X')), arr(tyvar('Y')))));

        expect(check(wrap(map, p, q, type_map, type_map)(add1, array), ref)).not.to.throw();
        expect(check(wrap(bad, p, q, type_map, type_map)(add1, array), ref)).to.throw(q.negated().msg());
      });

      it('should allow to define fold', function () {
        function fold(f, s, a) {
          var i;
          for (i = 0; i < a.length; i++) {
            s = f(a[i], s);
          }
          return s;
        }

        function add(x, y) {
          return x + y;
        }

        function bad () {
          return 15;
        }

        var type_fold = forall('X', forall('Y', fun(fun(tyvar('X'), tyvar('Y'), tyvar('Y')), tyvar('Y'), arr(tyvar('X')), tyvar('Y'))));

        expect(wrap_fun(fold, p, q, type_fold, type_fold)(add, 0, array)).not.to.throw();
        expect(wrap(fold, p, q, type_fold, type_fold)(add, 0, array)).to.equal(15);

        expect(wrap_fun(bad, p, q, type_fold, type_fold)(add, 0, array)).to.throw(q.negated().msg());
      });
    });
  });

  describe('ARRAY API', function () {
    var type = arr(Num),
      A = wrap([1, 2, 3, 4], p, q, type, type);

    function even (x) { return x % 2 === 0; }

    describe('map', function () {
      it('should be properly wrapped', function () {
          var B = A.map(function (x) { return x + 1; });

          expect(B[0]).to.equal(2);
          expect(B[1]).to.equal(3);
          expect(B[2]).to.equal(4);
          expect(B[3]).to.equal(5);
      });
    });

    describe('every', function () {
      it('should be properly wrapped', function () {
          var B = wrap([2, 4, 6], p, q, type, type);

          expect(A.every(even)).to.equal(false);
          expect(B.every(even)).to.equal(true);
      });
    });

    describe('filter', function () {
      it('should be properly wrapped', function () {
          var B = A.filter(even);

          expect(B[0]).to.equal(2);
          expect(B[1]).to.equal(4);
      });
    });

    describe('forEach', function () {
      it('should be properly wrapped', function () {
          var c = 0;

          function count(x) { c += x; }

          A.forEach(count);

          expect(c).to.equal(10);
      });
    });

    describe('indexOf', function () {
      it('should be properly wrapped', function () {
          expect(A.indexOf(2, 0)).to.equal(1);
          expect(A.indexOf(1, 1)).to.equal(-1);
      });
    });

    describe('join', function () {
      it('should be properly wrapped', function () {
          expect(A.join(' ')).to.equal('1 2 3 4');
      });
    });

    describe('lastIndexOf', function () {
      it('should be properly wrapped', function () {
          expect(A.lastIndexOf(2, 4)).to.equal(1);
          expect(A.lastIndexOf(2, 0)).to.equal(-1);
      });
    });

    describe('pop', function () {
      it('should be properly wrapped', function () {
        var B = wrap([1, 2, 3, 4], p, q, type, type);

          var b = B.pop();

          expect(b).to.equal(4);
          expect(B.length).to.equal(3);
      });
    });

    describe('push', function () {
      it('should be properly wrapped', function () {
        var B = wrap([1, 2, 3, 4], p, q, type, type);

        expect(B.push(5)).to.equal(5);
        expect(B[4]).to.equal(5);
        expect(B.length).to.equal(5);
      });
    });

    describe('sort', function () {
      it('should be properly wrapped', function () {
        function compare(a, b) {
          return b - a;
        }

        var B = wrap([1, 2, 3, 4], p, q, type, type);

        B.sort(compare);

        expect(B[0]).to.equal(4);
      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
