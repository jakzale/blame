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

var private_token = {};

var generate_label = (function () {
    var counter = 0;
    return function () {
        counter += 1;
        return 'label ' + counter;
    };
}());

var Label = function (public_token, label, state) {
    // Ensuring that Label is always called as a constructor
    if (!(this instanceof Label)) {
        return new Label(public_token, label, state);
    }

    if (public_token !== private_token) {

        this.label = generate_label();
        this.state = true;
    }
    else {
        this.label = label;
        this.state = state;
    }

    Object.freeze(this);
};

// Default value for label
Label.prototype.label = '';

Label.prototype.negate = function () {
    if(!(this instanceof Label)) {
        throw new TypeError("this is not the Label you are looking for...");
    }

    return new Label(private_token, this.label, !this.state);
};

var Fun = function (A, B) {
    if (!(this instanceof Fun)) {
        return new Fun(A, B);
    }

    this.domain = A;
    this.range = B;
};

var wrap_ground, wrap_function, wrap_poly;

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

var Tvar = function(variable) {
    this.v = String(variable);
};

Tvar.prototype.v = '';

// Forall types, note: forall types are only for functional types
function Forall(name, f) {
    if (!(f instanceof Fun)) {
        throw new TypeError('wrapping a non functional type');
    }


}

// An example of a function wrapped in a polymorphic X -> X
wrap_poly = function(fun) {
    return function (x) {
        var obj = {};
        Object.freeze(obj);

        var v =  fun(x);
        if (v !== obj) {
            throw new TypeError();
        }
        return v;
    };
};

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
