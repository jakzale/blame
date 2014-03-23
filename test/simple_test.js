/*global describe, it, define, wrap, Int, Bool, Fun, Label */
define(['blame','chai'], function(blame, chai) {
    'use strict';

    // Polyfill blame
    blame();

    var expect = chai.expect;

    // Loading blame js
    //require('../lib/blame.js')();

    var label = 'p',
    l = new Label(label);

    describe('Blame', function () {
        describe('simple wrap', function () {
            it('should return value for well-typed', function () {
                expect(wrap(Int, 1, label)).to.eql(1);
                expect(wrap(Bool, true, label)).to.eql(true);
            });

            it('should return label for ill-typed', function () {
                expect(wrap(Int, true, label)).to.eql(l);
                expect(wrap(Int, 1.01, label)).to.eql(l);
                expect(wrap(Bool, 1, label)).to.eql(l);
            });
        });

        describe('functional wrap', function () {
            var simple_fun = function (x) {
                return x + 1;
            };

            // Since there is no String in the type system yet, returns nonsense
            var bool_fun = function (x) {
                return (x && true) || false;
            };

            var nonsense_fun = function (x) {
                return x + ' ';
            };

            // Sample types
            var I_I = new Fun(Int, Int),
            I_B = new Fun(Int, Bool),
            B_I = new Fun(Bool, Int),
            B_B = new Fun(Bool, Bool);

            it('should return value for well-typed', function () {
                expect(wrap(I_I, simple_fun, label)(1)).to.eql(2);
                expect(wrap(I_B, bool_fun, label)(2)).to.eql(true);
                // true + 1 = 2
                expect(wrap(B_I, simple_fun, label)(true)).to.eql(2);
            });

            it('should return label for ill-typed function', function () {
                expect(wrap(I_I, nonsense_fun, label)(1)).to.eql(l);
                expect(wrap(I_B, nonsense_fun, label)(1)).to.eql(l);
                expect(wrap(B_I, nonsense_fun, label)(true)).to.eql(l);
                expect(wrap(B_B, nonsense_fun, label)(true)).to.eql(l);
            });

            it('should return negated label for ill-typed arguments', function () {
                expect(wrap(I_I, nonsense_fun, label)(true)).to.eql(l.negate());
                expect(wrap(I_B, nonsense_fun, label)(true)).to.eql(l.negate());
                expect(wrap(B_I, nonsense_fun, label)(1)).to.eql(l.negate());
                expect(wrap(B_B, nonsense_fun, label)(1)).to.eql(l.negate());
            });
        });
    });
});
