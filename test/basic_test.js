
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
    forall = blame.forall;

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
    values = [1, 'a', true, undefined, empty],
    types = [Num, Str, Bool, Und, fun(Und)];

  describe('Blame module', function () {
    it('should be imported and populated', function () {
      [blame, wrap, Label, fun, Num, Bool, Str, Und, tyvar, forall].forEach(function (v) {
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
              expect(wrapped(value, p, q, type, type)).to.throw(p);
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

          expect(closed_good(value)).not.to.throw();
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
                  expect(closed_fun(value)).to.throw(q.msg());
                } else if (j !== l) {
                  expect(closed_fun(value)).to.throw(p.msg());
                } else {
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
        }).to.throw(q);
      });
    });

  });
});

// vim: set ts=2 sw=2 sts=2 et :
