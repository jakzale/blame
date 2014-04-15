/*global window, define */

/**
 * Blame.js
 *
 * For the time being we are using the AMD.js module definitions,
 * mostly because the current version of Blame.js relies heavily on Firefox and
 * uses Karma for testing.
 *
 */

define('blame', [], function () {
'use strict';

// Label will be a private data type to hold the information

var Label = (function () {
    // Global private counter
    var counter = 0;

    var generate_label = function () {
        counter += 1;
        return 'label' + counter;
    };

    var private_token = {};

    return function (public_token, label, state) {
        var negated = null;
        var that = this;
        // Ensuring that Label is always called as a constructor
        if (!(this instanceof Label)) {
            return new Label(public_token, label, state);
        }

        if (public_token !== private_token) {

            this.label = generate_label();
            this.state = true;

            // Generating a negated version of the label
            negated = new Label(private_token, this.label, false);

            var negate = function() {
                if (this === that) {
                    return negated;
                }
                if (this === negated) {
                    return that;
                }

                throw new TypeError('This is not the label you want to negate');
            };

            this.negate = negate;
            negated.negate = negate;


            // Ensure that the object is frozen
            Object.freeze(this);
            Object.freeze(negated);
        } else {
            this.label = label;
            this.state = state;
        }
    };
}());

// Default value for label
Label.prototype.label = '';

var Fun = function (A, B) {
    if (!(this instanceof Fun)) {
        return new Fun(A, B);
    }

    this.domain = A;
    this.range = B;
};

var wrap_ground, wrap_function;

function wrap(type, value, label) {

    // Checking if wrapping a function
    if (type instanceof Fun) {
        return wrap_function(type.domain, type.range, value, label);
    }

    return wrap_ground(type, value, label);
}

wrap_ground = function (type, value, label) {
    if (type(value)) {
        return value;
    }

    return label;
};

wrap_function = function (A, B, fun, label) {
    return function (x) {
        // Wrap the argument:
        var y = wrap(A, x, label.negate()),
            result;

        if (y instanceof Label) {
            return y;
        }

        // Evaluate the function
        result = fun(x);
        return wrap(B, result, label);
    };
};

// type constructors
function Int(value) {
    return (typeof value === 'number') && ((value % 1) === 0);
}

function Bool(value) {
    return (typeof value === 'boolean');
}

// Forall types, note: forall types are only for functional types

// Polyfil
var exporting = {
    Label: Label,
    wrap: wrap,
    Int: Int,
    Bool: Bool,
    Fun: Fun
};

function polyfill(target, elements) {
    var e;
    for (e in elements) {
        if (elements.hasOwnProperty(e)) {
            target[e] = elements[e];
        }
    }
}

function blame() {
    polyfill(window, exporting);
}

polyfill(blame, exporting);

return blame;
});
