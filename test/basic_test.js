
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
    Num = blame.Num;

  function identity (x) { return x; }

  function gen_const (x) {
    return function () {
      return x;
    };
  }

  function closed (f) {
    return function () {
      var args = Array.prototype.slice.call(arguments || []);
      return function () {
        return f.apply(undefined, args);
      };
    };
  }

  // Some constants for testing
  var p = new Label(),
    q = new Label();

  describe('Blame module', function () {
    it('should be imported', function () {
      used(expect(blame).to.exist);
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
        var type = fun(Num, Num),
          bad = gen_const('a'),
          wrapped_good = wrap(identity, p, q, type, type),
          wrapped_bad = wrap(bad, p, q, type, type),
          closed_good = closed(wrapped_good),
          closed_bad = closed(wrapped_bad);

      it('should permit proper types', function () {
          expect(closed_good(1)).not.to.throw();
      });

      it('should reject improper types', function () {
        expect(closed_bad(1)).to.throw(p.msg());
        expect(closed_bad('a')).to.throw(q.msg());
        expect(closed_good('a')).to.throw(q.msg());
      });
    });

  });
});

// vim: set ts=2 sw=2 sts=2 et :
