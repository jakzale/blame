/*global window, define */
define('blame', [], function () {
'use strict';


//var typeCheck = require('type-check').typeCheck;

// Data types
var Label = function (label) {
    if (!(this instanceof Label)) {
        return new Label(label);
    }

    this.label = label;
};
Label.prototype.label = '';

function negate(s) {
    return '~' + s;
}

Label.prototype.negate = function () {
    //'use strict';
    var negated = new Label(negate(this.label));
    return negated;
};

var Fun = function (A, B) {
    if (!(this instanceof Fun)) {
        return new Fun(A, B);
    }

    this.domain = A;
    this.range = B;
};

var wrap_ground, wrap_function;

function wrap(type, value, label) {
    if (!label) { label = 'p'; }

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

    return new Label(label);
};

wrap_function = function (A, B, fun, label) {
    return function (x) {
        // Wrap the argument:
        var y = wrap(A, x, negate(label)),
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
//polyfill(module.exports, exporting);

//module.exports = function () {
    //polyfill(global, exporting);
//};

//  toString on an item:
//  > toString.call(item)
