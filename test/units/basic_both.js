/*global describe, it, define */
/*jslint indent: 2, todo: true */
'use strict';


// Global utils
function empty() { return; }
var unused = empty,
  used = empty;

used(unused);

var blame = require('../../build/blame.js');
var expect = require('chai').expect;

var wrap = blame.wrap,
label = blame.label,
func = blame.func,
fun = blame.fun,
Num = blame.Num,
Bool = blame.Bool,
Str = blame.Str,
Void = blame.Void,
tyvar = blame.tyvar,
forall = blame.forall,
arr = blame.arr,
dict = blame.dict,
hybrid = blame.hybrid,
union = blame.union,
obj = blame.obj,
LazyTypeCache = blame.LazyTypeCache;

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

function wrap_fun(func, p, q, A, B) {
  var wrapped_fun = wrap(func, p, q, A, B);
  return closed(wrapped_fun);
}

// Some constants for testing
var p = label(),
q = label(),
values = [1, 'a', true, undefined, empty, []],
types = [Num, Str, Bool, Void, func(Void), arr(Num)];

describe('Blame module', function () {
  describe('blame labels', function () {
    it('should initialize properly', function () {
      var l1 = label(),
      l2 = label();
      expect(l1.msg()).to.not.equal('label');
      expect(l1.msg()).to.not.equal(l2.msg());
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
            expect(wrapped(value, p, q, type, type)).to.throw(p.msg());
          }
        });
      });
    });
  });

  describe('functions', function () {

    it('should permit types for identity', function () {
      types.forEach(function (type, i) {
        var fun_type = func(type, type),
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
              var fun_type = func(type, type2),
              closed_fun = wrap_fun(gen_const(value2), p, q, fun_type, fun_type);

              if (i !== k) {
                // Wrong argument
                expect(closed_fun(value)).to.throw(q.dom().msg());
              } else if (j !== l) {
                // Wrong return value
                expect(closed_fun(value)).to.throw(p.rng().msg());
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
      var type2 = func(Num, Num, Num),
      closed_id = wrap_fun(identity, p, q, type2, type2);

      it('should accept right number of arguments', function () {
        expect(closed_id(1, 2)).not.to.throw();
      });

      it('should reject wrong number of arguments', function () {
        expect(closed_id(1)).to.throw(q.dom().msg());
      });
    });
  });

  describe('new function api', function () {
    it('should properly construct the type', function () {
      var fun_type = fun(null, null, null, Num);

      expect(fun_type.requiredParameters).to.eql([]);
      expect(fun_type.optionalParameters).to.eql([]);
      expect(fun_type.restParameter).to.equal(null);
      expect(fun_type.returnType.description).to.equal(Num.description);
      expect(fun_type.description).to.equal('() -> Num');

      fun_type = fun([Num], [Bool], Str, func(Bool, Bool));
      expect(fun_type.requiredParameters).to.eql([Num]);
      expect(fun_type.optionalParameters).to.eql([Bool]);
      expect(fun_type.restParameter.description).to.equal(Str.description);
      expect(fun_type.description).to.equal('Num -> Bool? -> Str* -> (Bool -> Bool)');

      var obj_type = obj({});

      fun_type = fun([], [], null, Num, obj_type);

      expect(fun_type.requiredParameters).to.eql([]);
      expect(fun_type.optionalParameters).to.eql([]);
      expect(fun_type.restParameter).to.equal(null);
      expect(fun_type.returnType.description).to.equal(Num.description);
      expect(fun_type.constructType.description).to.equal(obj_type.description);
      expect(fun_type.description).to.equal('() -> Num  C:{}');

    });
  });

  describe('foralls', function () {
    var type_id = forall('X', func(tyvar('X'), tyvar('X')));

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
      }).to.throw(p.rng().msg());
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
      var type = forall('Y', func(forall('X', func(func(tyvar('Y'), tyvar('X')), tyvar('X'))), tyvar('Y'))),
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

      }).to.throw(p.rng().msg());

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
    var AX_XXX = forall('X', func(tyvar('X'), tyvar('X'), tyvar('X'))),
    AX_AY_XYX = forall('X', forall('Y', func(tyvar('X'), tyvar('Y'), tyvar('X'))));

    expect(wrap_fun(first, p, q, AX_XXX, AX_XXX)(1, 1)).not.to.throw();
    expect(wrap_fun(second, p, q, AX_XXX, AX_XXX)(1, 1)).not.to.throw();

    expect(wrap_fun(first, p, q, AX_AY_XYX, AX_AY_XYX)(1, 1)).not.to.throw();
    expect(wrap_fun(second, p, q, AX_AY_XYX, AX_AY_XYX)(1, 1)).to.throw(p.rng().msg());
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

          expect(get(array, 0)).to.throw(p.get().msg());
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

          expect(set(array, 0, value)).to.throw(q.set().msg());
        }
      });
    });
  });
});

describe('forall arrays', function () {
  var type_single = forall('X', func(arr(tyvar('X')), tyvar('X'))),
  type_multi = forall('X', func(arr(tyvar('X')), arr(tyvar('X')))),
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

      expect(wrap_fun(bad, p, q, type_single, type_single)(array)).to.throw(p.rng().msg());
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
      expect(check(wrap(bad, p, q, type_multi, type_multi)(array), ref)).to.throw(p.rng().get().msg());
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
      expect(check(wrap(bad, p, q, type_multi, type_multi)(array), ref)).to.throw(p.rng().get().msg());
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

      var type_filter = forall('X', func(func(tyvar('X'), Bool), arr(tyvar('X')), arr(tyvar('X'))));

      expect(check(wrap(filter, p, q, type_filter, type_filter)(is_even, array), ref)).not.to.throw();
      expect(check(wrap(bad, p, q, type_filter, type_filter)(is_even, array), ref)).to.throw(p.rng().get().msg());
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

      var type_map = forall('X', forall('Y', func(func(tyvar('X'), tyvar('Y')), arr(tyvar('X')), arr(tyvar('Y')))));

      expect(check(wrap(map, p, q, type_map, type_map)(add1, array), ref)).not.to.throw();
      expect(check(wrap(bad, p, q, type_map, type_map)(add1, array), ref)).to.throw(p.rng().get().msg());
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

      var type_fold = forall('X', forall('Y', func(func(tyvar('X'), tyvar('Y'), tyvar('Y')), tyvar('Y'), arr(tyvar('X')), tyvar('Y'))));

      expect(wrap_fun(fold, p, q, type_fold, type_fold)(add, 0, array)).not.to.throw();
      expect(wrap(fold, p, q, type_fold, type_fold)(add, 0, array)).to.equal(15);

      expect(wrap_fun(bad, p, q, type_fold, type_fold)(add, 0, array)).to.throw(p.rng().msg());
    });
  });
});

describe('ARRAY API', function () {
  var type = arr(Num),
  type_id = forall('X', func(arr(tyvar('X')), arr(tyvar('X')))),
  wrapped_id_array = wrap(identity, p, q, type_id, type_id),
  A = wrap([1, 2, 3, 4], p, q, type, type),
  B = wrapped_id_array([1, 2, 3, 4]),
  C = wrap(wrapped_id_array([1, 2, 3, 4]), p, q, type, type);

  function even (x) { return x % 2 === 0; }

  describe('element access', function () {
    it('should allow to get', function () {
      [A, B, C].forEach(function (A) {
        expect(A).to.eql([1, 2, 3, 4]);
      });
    });

    it('should allow to set', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        D[0] = 1;
      });

      [D, F].forEach(function (D) {
        expect(function () {
          D[0] = true;
        }).to.throw(q.set().msg());
      });

      E[0] = true;
    });
  });

  describe('length', function () {
    it('should allow to get', function () {
      expect(A.length).to.equal(4);
    });

    it('should allow to set', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type);

      D.length = 2;
      expect(D.length).to.equal(2);
      expect(D).to.eql([1, 2]);
    });
  });

  describe('concat', function () {
    it('should return an unwrapped array', function () {
      [A, B, C].forEach(function (A) {
        var D = A.concat([5], 6, [7]);

        D[0] = true;
        expect(D).to.eql([true, 2, 3, 4, 5, 6, 7]);
      });
    });
  });

  describe('map', function () {
    it('should be properly wrapped', function () {
      function add1(x) { return x + 1; }

      [A, B, C].forEach(function (A) {
        var D = A.map(add1);

        expect(D).to.eql([2, 3, 4, 5]);
      });
    });

    it('should allow for optional thisArg', function () {
      function append(x) {
        this.push(x);
        return x;
      }

      [A, B, C].forEach(function (A) {
        var D = [], E;

        E = A.map(append, D);

        expect(D).to.eql([1, 2, 3, 4]);
        expect(E).to.eql([1, 2, 3, 4]);
      });
    });

    it('should allow for forall types', function () {
      function add1(x) {
        return x + 1;
      }

      var D, E, F;

      D = wrapped_id_array([1, 2, 3, 4]);
      expect(D).to.eql([1, 2, 3, 4]);

      E = D.map(add1);
      expect(E).to.eql([2, 3, 4, 5]);

      F = E.map(add1);
      expect(F).to.eql([3, 4, 5, 6]);
    });
  });

  describe('every', function () {
    it('should be properly wrapped', function () {
      var D = wrap([2, 4, 6], p, q, type, type);

      expect(A.every(even)).to.equal(false);
      expect(B.every(even)).to.equal(false);
      expect(C.every(even)).to.equal(false);
      expect(D.every(even)).to.equal(true);
    });

    it('should allow for optional thisArg', function () {

      function append(x) {
        this.push(x);
        return true;
      }

      [A, B, C].forEach(function (A) {
        var D = [];

        expect(A.every(append, D)).to.equal(true);
        expect(D).to.eql([1, 2, 3, 4]);
      });
    });
  });

  describe('filter', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        var D = A.filter(even);

        expect(D[0]).to.equal(2);
        expect(D[1]).to.equal(4);
      });
    });

    it('should allow for optional thisArg', function () {
      function append(x) {
        this.push(x);
        return true;
      }

      [A, B, C].forEach(function (A) {
        var D = [],
        E = A.filter(append, D);

        expect(D).to.eql([1, 2, 3, 4]);
        expect(E).to.eql([1, 2, 3, 4]);
      });
    });
  });

  describe('forEach', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        var c = 0;

        function count(x) { c += x; }

        A.forEach(count);

        expect(c).to.equal(10);
      });
    });


    it('should allow for optional thisArg', function () {
      function append(x) {
        this.push(x);
      }

      [A, B, C].forEach(function (A) {
        var D = [];

        A.forEach(append, D);

        expect(D).to.eql([1, 2, 3, 4]);
      });
    });
  });

  describe('indexOf', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        expect(A.indexOf(2, 0)).to.equal(1);
        expect(A.indexOf(1, 1)).to.equal(-1);
        expect(A.indexOf(2)).to.equal(1);
      });
    });
  });

  describe('join', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        expect(A.join(' ')).to.equal('1 2 3 4');
      });
    });
  });

  describe('lastIndexOf', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        expect(A.lastIndexOf(2, 4)).to.equal(1);
        expect(A.lastIndexOf(2, 0)).to.equal(-1);
        expect(A.lastIndexOf(2)).to.equal(1);
      });
    });
  });

  describe('pop', function () {
    it('should be properly wrapped', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        var b = D.pop();

        expect(b).to.equal(4);
        expect(D).to.eql([1, 2, 3]);
        expect(D.length).to.equal(3);
      });
    });
  });

  describe('push', function () {
    it('should be properly wrapped', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        expect(D.push(5)).to.equal(5);
        expect(D.length).to.equal(5);
        expect(D).to.eql([1, 2, 3, 4, 5]);
      });
    });

    it('should allow for repeated arguments', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        expect(D.push(5, 6, 7, 8, 9, 10)).to.equal(10);
        expect(D.length).to.equal(10);
        expect(D).to.eql([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      });
    });

    it('should allow for zero arguments', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        expect(D.push()).to.equal(4);
      });
    });
  });

  describe('reduce', function () {
    it('should be properly wrapped', function () {
      function add(a, b) { return a + b; }

      [A, B, C].forEach(function (A) {
        expect(A.reduce(add, 0)).to.equal(10);
      });
    });

    it('sould allow for optional accumulator', function () {
      function add(a, b) { return a + b; }

      [A, B, C].forEach(function (A) {
        expect(A.reduce(add)).to.equal(10);
      });
    });

    it('sould allow for more complex reduction', function () {
      function addS(a, b) {
        return String(a) + String(b);
      }

      [A, B, C].forEach(function (A) {
        expect(A.reduce(addS)).to.equal('1234');

        expect(A.reduce(addS, 'a')).to.equal('a1234');
      });
    });
  });

  describe('reduceRight', function () {
    it('should be properly wrapped', function () {
      function add(a, b) { return a + b; }

      [A, B, C].forEach(function (A) {
        expect(A.reduceRight(add, 0)).to.equal(10);
      });
    });

    it('sould allow for optional accumulator', function () {
      function add(a, b) { return a + b; }

      [A, B, C].forEach(function (A) {
        expect(A.reduceRight(add)).to.equal(10);
      });
    });

    it('sould allow for more complex reduction', function () {
      function addS(a, b) {
        return String(a) + String(b);
      }

      [A, B, C].forEach(function (A) {
        expect(A.reduceRight(addS)).to.equal('4321');

        expect(A.reduceRight(addS, 'a')).to.equal('a4321');
      });
    });
  });

  describe('reverse', function () {
    it('should be properly wrapped', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        expect(D.reverse()).to.eql([4, 3, 2, 1]);
      });
    });
  });

  describe('shift', function () {
    it('should be properly wrapped', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        expect(D.shift()).to.equal(1);
        expect(D[0]).to.equal(2);
        expect(D.length).to.equal(3);
      });
    });
  });

  describe('slice', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        var D = A.slice(1, 2);
        expect(D.length).to.equal(1);
        expect(D[0]).to.equal(2);

        D = A.slice(1);
        expect(D.length).to.equal(3);
        expect(D[0]).to.equal(2);

        D = A.slice();
        expect(D.length).to.equal(4);
        expect(D[0]).to.equal(1);
      });
    });
  });

  describe('some', function () {
    it('should be properly wrapped', function () {
      var D = wrap([3, 5, 7], p, q, type, type);

      [A, B, C].forEach(function (A) {
        expect(A.some(even)).to.equal(true);
        expect(D.some(even)).to.equal(false);
      });
    });

    it('should allow for optional thisArg', function () {
      function append(x) {
        this.push(x);

        return false;
      }

      [A, B, C].forEach(function (A) {
        var D = [];

        expect(A.some(append, D)).to.equal(false);
        expect(D).to.eql([1, 2, 3, 4]);
      });
    });
  });

  describe('sort', function () {
    it('should be properly wrapped', function () {
      function compare(a, b) {
        return b - a;
      }

      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        D.sort(compare);

        expect(D).to.eql([4, 3, 2, 1]);
      });
    });

    it('should allow for optional compare', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        D.sort();

        expect(D).to.eql([1, 2, 3, 4]);
      });
    });
  });

  describe('splice', function () {
    it('should be properly wrapped', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        D.splice(2, 2, 1, 2);

        expect(D).to.eql([1, 2, 1, 2]);
      });
    });
  });

  describe('toLocaleString', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        expect(A.toLocaleString()).to.equal('1,2,3,4');
      });
    });
  });

  describe('toString', function () {
    it('should be properly wrapped', function () {
      [A, B, C].forEach(function (A) {
        expect(A.toString()).to.equal('1,2,3,4');
      });
    });
  });

  describe('unshift', function () {
    it('should be properly wrapped', function () {
      var D = wrap([1, 2, 3, 4], p, q, type, type),
      E = wrapped_id_array([1, 2, 3, 4]),
      F = wrapped_id_array(wrap([1, 2, 3, 4], p, q, type, type));

      [D, E, F].forEach(function (D) {
        expect(D.unshift()).to.equal(4);
        expect(D).to.eql([1, 2, 3, 4]);

        expect(D.unshift(0)).to.equal(5);
        expect(D).to.eql([0, 1, 2, 3, 4]);

        expect(D.unshift(-2, -1)).to.equal(7);
        expect(D).to.eql([-2, -1, 0, 1, 2, 3, 4]);
      });
    });
  });
});

//describe('sums', function () {
//  var sum_type = sum([Num, Bool]);

//  it('should be properly created', function () {
//    expect(sum_type.description).to.equal('(Num | Bool)');
//  });

//  it('should allow correct types', function () {

//    wrap(1, p, q, sum_type, sum_type);
//    wrap(true, p, q, sum_type, sum_type);
//  });

//  it('should reject incorrect type', function () {
//    expect(wrapped('a', p, q, sum_type, sum_type)).to.throw();
//  });

//  it('should detect ambiguous sum', function () {
//    var ambiguous = sum([arr(Num), arr(Bool)]);
//    expect(wrapped([], p, q, ambiguous, ambiguous)).to.throw('ambiguous');
//  });
//});

describe('Objects', function () {

  describe('basic wrapping', function () {
    var type = obj({a: Num});

    it('should lazily test for types', function () {
      var A = wrap({a: true}, p, q, type, type);

      expect(function () {
        used(A.a);
      }).to.throw(p.get().msg());

      expect(function () {
        A.a = false;
      }).to.throw(q.set().msg());
    });

    it('should permit other properties', function () {
      var A = wrap({a: true}, p, q, type, type);

      A.b = true;
      A.b = false;
      A.b = 1;
      expect(A.b).to.equal(1);
    });

    it('should permit valueOf', function () {
      var A = wrap({a: true}, p, q, type, type),
      B = A.valueOf();

      expect(B).to.equal(A);

      expect(function () {
        B.a = true;
      }).to.throw(q.set().msg());
    });
  });

  describe('foralls', function () {
    describe('property swap', function () {
      var type = forall('X', func(obj({a: tyvar('X'), b: tyvar('X')}), Void));

      it('should permit good swap', function () {
        function swap_ab(o) {
          var temp = o.a;
          o.a = o.b;
          o.b = temp;
        }

        var A = {a: true, b: 1},
        wrapped_swap = wrap(swap_ab, p, q, type, type);

        expect(type.description).to.equal('forall X. {a: X, b: X} -> Void');
        wrapped_swap(A);

        expect(A.a).to.equal(1);
        expect(A.b).to.equal(true);

      });

      it('should reject improper', function () {
        function swap_bad(o) {
          o.a = 1;
          o.b = true;
        }

        var A = {a: true, b: 1},
        wrapped_swap = wrap(swap_bad, p, q, type, type);

        expect(function () {
          wrapped_swap(A);
        }).to.throw(q.dom().set());
      });
    });
  });

  describe('constructors', function () {
    describe('as a function returning an object', function () {
      function MyType(a) {
        this.a = a;
      }


      var type = fun([Num], [], null, Void, obj({a: Num})),
        Wrapped = wrap(MyType, p, q, type, type);

      it('should check the arguments', function () {
        var A;
        used(A);

        expect(function () {
          A = new Wrapped('a');
        }).to.throw(q.dom().msg());

        expect(function () {
          A = new Wrapped();
        }).to.throw(q.dom().msg());

        expect(function () {
          A = new Wrapped(1, 1);
        }).to.throw(q.dom().msg());

        A = new Wrapped(1);
      });

      it('should set up the prototype chain', function () {
        var A = new Wrapped(1);

        expect(A instanceof Wrapped).to.equal(true);
        expect(A instanceof MyType).to.equal(true);
      });

      it('should wrap the object', function () {
        var A = new Wrapped(1);

        expect(A.a).to.equal(1);
        A.a = 2;
        expect(A.a).to.equal(2);

        expect(function () {
          A.a = 'a';
        }).to.throw(q.set().msg());

        expect(A.a).to.equal(2);
      });

      it('wrap object before calling the constructor', function () {
        function BadType(a) {
          used(a);
          this.a = 'a';
        }

        var BadWrapped = wrap(BadType, p, q, type, type);

        expect(function () {
          var B = new BadWrapped(1);
          used(B);
        }).to.throw(p.set().msg());

      });
    });
  });

  describe('as a function returning void', function () {
    function MyType () { return; }
    var type = fun([Num], [], null, Void),
      Wrapped = wrap(MyType, p, q, type, type);

    it('should just wrap arguments', function () {
      var A;

      expect(function () {
        A = new Wrapped('a');
      }).to.throw(q.dom().msg());

      expect(function () {
        A = new Wrapped();
      }).to.throw(q.dom().msg());

      expect(function () {
        A = new Wrapped(1, 2);
      }).to.throw(q.dom().msg());

      A = new Wrapped(1);
      used(A);
    });
  });
});

describe('Hybrid Types', function () {
  it('should allow to define a hybrid type', function () {
    var A = arr(Num),
      B = obj({length: Num}),
      C = hybrid(A, B);

    expect(C.description).to.eql(A.description + ' && ' + B.description);
  });

  it('should allow to specify array', function () {
    var A = arr(Num),
      B = obj({length: Num}),
      C = hybrid(A, B),
      a = wrap([], p, q, C, C);

      expect(a.length).to.equal(0);

      expect(function () {
        a.length = 'a';
      }).to.throw(q.set().msg());

      expect(a.length).to.equal(0);

      expect(function () {
        a[0] = 'a';
      }).to.throw(q.set().msg());

      expect(a.length).to.equal(0);

      a[0] = 1;
      expect(a.length).to.equal(1);
  });
});

describe('Dictionaries', function () {
  it('should allow to define a dictionary', function () {
    var A = dict(Num),
      a = wrap({}, p, q, A, A);

      expect(function () {
        a.a = 'a';
      }).to.throw(q.set().msg());

      a.a = 1;
      expect(a.a).to.equal(1);
  });
});

describe('Unions', function () {
  it('should allow to define simple unions', function () {
    var type = union(Num, Str);

    wrap('a', p, q, type, type);
    wrap(1, p, q, type, type);

    expect(function () {
      wrap({}, p, q, type, type);
    }).to.throw(p.l());
  });

  it('should allow to define ambiguous unions', function () {
    function goodA() { return 'a'; }
    function goodB() { return 1; }

    var funcA = fun([Num], [], null, Str),
      funcB = fun([Str], [], null, Num),
      type = union(funcA, funcB),
      wrappedA = wrap(goodA, p, q, type, type),
      wrappedB = wrap(goodB, p, q, type, type);

    wrappedA(1);
    wrappedB('a');

    expect(function () {
      wrappedA('a');
    }).to.throw();

    expect(function () {
      wrappedB(1);
    }).to.throw();

  });

  it('should allow for even more ambiguous unions', function () {
    function goodA(o) {
      used(o.a);
      return {a: 1};
    }

    function goodB(o) {
      used(o.a);
      return {a: 'a'};
    }

    var objAN = obj({a: Num}),
      objAS = obj({a: Str}),
      funcA = fun([objAN], [], null, objAS),
      funcB = fun([objAS], [], null, objAN),
      type = union(funcA, funcB),
      wrappedA = wrap(goodA, p, q, type, type),
      o;

    expect(function () {
      wrappedA('a');
    }).to.throw();

    o = wrappedA({a: 'a'});
    expect(o.a).to.equal(1);

    o = wrappedA({a: 1});
    expect(function () {
      used(o.a);
    }).to.throw();

    o = wrappedA({a: 'a'});
    expect(o.a).to.equal(1);

  });
});

describe('recursive types', function () {
  describe('type cache', function () {

      it('empty cache is valid', function () {
        var typeCache = new LazyTypeCache();
        expect(typeCache.verify()).to.equal(true);
      });

      it('too much provided is valid', function () {
        var typeCache = new LazyTypeCache();
        typeCache.set('Num', Num);
        expect(typeCache.verify()).to.equal(true);
      });

      it('balanced types are valid', function () {
        var typeCache = new LazyTypeCache();
        expect(typeCache.get('Num').description).to.equal('Num');

        expect(typeCache.verify()).to.equal(false);

        typeCache.set('Num', Num);
        expect(typeCache.verify()).to.equal(true);
      });

      it('should be valid even if requested many times', function () {
        var typeCache = new LazyTypeCache();
        expect(typeCache.get('Num').description).to.equal('Num');
        expect(typeCache.get('Num').description).to.equal('Num');

        expect(typeCache.verify()).to.equal(false);

        typeCache.set('Num', Num);
        expect(typeCache.get('Num').description).to.equal('Num');

        expect(typeCache.verify()).to.equal(true);
    });
  });

  describe('lazy types', function () {
    it('should allow to define recursive types', function () {
      var typeCache = new LazyTypeCache();
      var MyObj = obj({n: func(Num), p: func(Num, typeCache.get('MyObj'))});

      function Counter(n) {
        this.n = function() {
          return n;
        };

        this.p = function(k) {
          return new Counter(k+n);
        };
      }

      expect(MyObj.description).to.equal('{n: () -> Num, p: Num -> MyObj}');

      typeCache.set('MyObj', MyObj);

      expect(typeCache.verify()).to.equal(true);

      var o = new Counter(0),
        wO = wrap(o, p, q, MyObj, MyObj);

      expect(wO.n()).to.equal(0);
      expect(wO.p(1).p(2).p(3).n()).to.equal(6);

      expect(function () {
        wO.p(1).p(2).p('a').n();
      }).to.throw(q.get().rng().get().rng().get().dom().msg());


      // Wrapped bad recursive type
      var bad = new Counter('a'),
        wBad = wrap(bad, p, q, MyObj, MyObj);

      expect(function () {
        wBad.p('a');
      }).to.throw(q.get().dom().msg());

      expect(function () {
        wBad.p(1).p(2).p(3).n();
      }).to.throw(p.get().rng().get().rng().get().rng().get().rng().msg());
    });
  });

  describe('foralls', function () {
    it('should allow to define recursive forall type', function () {
      var typeCache = new LazyTypeCache();
      var MyObj = obj({put: func(tyvar('X'), typeCache.get('MyObj')), get: func(tyvar('X'))});
      typeCache.set('MyObj', MyObj);

      var FactType = forall('X', func(tyvar('X'), typeCache.get('MyObj')));

      function Constructor(x) {
        this.get = function () {
          return x;
        };

        this.put = function (n) {
          return new Constructor(n);
        };
      }

      function Factory(x) {
        return new Constructor(x);
      }

      var f = wrap(Factory, p, q, FactType, FactType);

      expect(f(1).put(2).put('a').put(3).get()).to.equal(3);
    });

    it('should detect recursive error', function () {
      var typeCache = new LazyTypeCache();
      var MyObj = obj({put: func(tyvar('X'), typeCache.get('MyObj')), get: func(tyvar('X'))});
      typeCache.set('MyObj', MyObj);

      var FactType = forall('X', func(tyvar('X'), typeCache.get('MyObj')));

      function Constructor(x) {
        used(x);
        this.get = function () {
          return 3;
        };

        this.put = function (n) {
          return new Constructor(n);
        };
      }

      function Factory(x) {
        return new Constructor(x);
      }

      var f = wrap(Factory, p, q, FactType, FactType);

      expect(function () {
        f(1).put(2).put('a').put(3).get();
      }).to.throw(p.rng().get().rng().get().rng().get().rng().get().rng());
    });
  });

});
// vim: set ts=2 sw=2 sts=2 et :
