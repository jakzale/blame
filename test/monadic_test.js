/*global describe, it, define, wrap, Str, Num, Bool, Fun*/

define(['monadic','chai'], function(monadic, chai) {
  'use strict';

  // Pollutue the global namespace with monadic types
  monadic();
  var expect = chai.expect;

  describe('monadic blame', function() {
    it('should be a function', function () {
      expect(typeof monadic === 'function').to.eql(true);
      expect(Fun !== undefined).to.eql(true);
    });

    describe('wrap', function() {
      describe('ground types', function() {
        it ('check numbers', function() {
          // In order to check for errors, you need to pass a closure
          var example = function(){
            return wrap(Num, 2, 'p');
          };
          var example2 = function(){
            return wrap(Num, true, 'p');
          };

          expect(example).not.to.throw(Error);
          expect(example()).to.equal(2);

          expect(example2).to.throw(Error);
        });
      });

      describe('function types', function() {
        it ('check for a function', function() {
          var example = function(){
            return wrap(Fun(Num, Num), 1, 'p');
          };
          var empty = function() {};
          var example2 = function(){
            return empty;
          };

          expect(example).to.throw(Error);
          expect(example2).not.to.throw(Error);
        });

        it ('check type', function() {
          var fun = function(n) {
            return n + 1;
          };

          var fun2 = function(n) {
            return n + '1';
          };

          var wrapped = wrap(Fun(Num, Num), fun, 'p');
          var wrapped2 = wrap(Fun(Num, Num), fun2, 'p');

          var example = function() {
            return wrapped(1);
          };
          expect(example).not.to.throw(Error);
          expect(example()).to.equal(2);

          var example1 = function() {
            return wrapped('1');
          };
          expect(example1).to.throw('~p');
          var example2 = function() {
            return wrapped2(1);
          };
          expect(example2).to.throw('p');

          var example3 = function() {
            return wrapped2('1');
          };
          expect(example3).to.throw('~p');
        });
      });
    });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
