/*global define, window, WeakMap, console, Proxy */
/*jslint indent: 2, todo: true, nomen: true */

define('blame', [], function () {
  'use strict';
  var blame = Object.create(Object.prototype);

  var count = 0;
  /**
   * public class Label
   */
  function Label(label, status) {
    if(!(this instanceof Label)) {
      return new Label(label, status);
    }

    if (label !== undefined) {
      this.label = String(label);
    } else {
      this.label = 'label_' + count++;
    }

    if (status !== undefined) {
      this.status = !!status;
    } else {
      this.status = true;
    }
  }

  Label.prototype.negated = function() {
    return new Label(this.label, !this.status);
  };

  // TODO: Throw error when reading these
  Label.prototype.status = true;
  Label.prototype.label = 'label';
  Label.prototype.msg = function() {
    return (this.status ? '' : '~') + this.label;
  };

  blame.Label = Label;

  /**
   * public class Type
   */
  function Type(description) {
    if (!(this instanceof Type)) {
      return new Type(description);
    }

    this.description = String(description);
  }

  function is_number(value) {
    return typeof value === 'number';
  }


  var Num = new Type('Num');
  blame.Num = Num;
  var Any = new Type('Any');

  function contract (value, label, test) {
    if (test(value)) {
      return value;
    }

    throw new Error(label.msg());
  }

  function Tyvar(id) {
    if (!(this instanceof Tyvar)) {
      return new Tyvar(id);
    }

    this.description = String(id);
  }

  blame.Tyvar = Tyvar;

  function Fun(domain, range) {
    if (!(this instanceof Fun)) {
      return new Fun(domain, range);
    }

    this.domain = domain;
    this.range = range;
    this.description = domain.description + ' -> ' + range.description;
  }

  Fun.prototype = Object.create(Type.prototype);
  blame.fun = Fun;

  function Forall(tyvar, type) {
    this.context[tyvar] = true;
    this.type = type;
  }

  /**
   * wrap function
   */
  function wrap(value, p, q, A, B) {
    // Wrapping ground types

    if (A === Num && B === Num) {
      return contract(value, p, is_number);
    }

    if (A === Any && B === Any) {
      return value;
    }

    if ((A instanceof Fun) && (B instanceof Fun)) {
      return new Proxy(value, {
        apply: function (target, thisValue, args) {
          var arg = args[0],
            wrapped_arg = wrap(arg, q, p, B.domain, A.domain),
            ret = target.call(thisValue, wrapped_arg);

            return wrap(ret, p, q, A.range, B.range);
        }
      });
    }

    throw new Error('A:' + A.description + ' and B:' + B.description + ' are not compatible' );
  }
  blame.wrap = wrap;

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
