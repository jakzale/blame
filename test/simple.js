/*global describe, it, define, wrap, Int, Bool, Fun, Label */

define(['blame','chai'], function(blame, chai) {
    'use strict';

    // Polyfill blame
    var that = this;
    console.log(that);

    var expect = chai.expect;
    var label = new Label();

    describe('Blame', function () {
        blame();
        describe('label class', function () {
            it('should negate only the state', function() {
                expect(label.negate().label).to.eql(label.label);
                expect(label.negate().state).to.eql(!label.state);
            });

            it('should not allow private constructor', function() {
                var l = new Label({}, 'a', false);
                expect(l.state).to.eql(true);
            });
        });

        describe('simple wrap', function () {
            it('should return value for well-typed', function () {
                expect(wrap(Int, 1, label)).to.eql(1);
                expect(wrap(Bool, true, label)).to.eql(true);
            });

            it('should return label for ill-typed', function () {
                expect(label).to.eql(label);
                expect(wrap(Int, true, label)).to.eql(label);
                expect(wrap(Int, 1.01, label)).to.eql(label);
                expect(wrap(Bool, 1, label)).to.eql(label);
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
                expect(wrap(I_I, nonsense_fun, label)(1)).to.eql(label);
                expect(wrap(I_B, nonsense_fun, label)(1)).to.eql(label);
                expect(wrap(B_I, nonsense_fun, label)(true)).to.eql(label);
                expect(wrap(B_B, nonsense_fun, label)(true)).to.eql(label);
            });

            it('should return negated label for ill-typed arguments', function () {
                expect(wrap(I_I, nonsense_fun, label)(true)).to.eql(label.negate());
                expect(wrap(I_B, nonsense_fun, label)(true)).to.eql(label.negate());
                expect(wrap(B_I, nonsense_fun, label)(1)).to.eql(label.negate());
                expect(wrap(B_B, nonsense_fun, label)(1)).to.eql(label.negate());
            });
        });
    });
});
