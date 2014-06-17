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

  function Fun() {
    var args = Array.prototype.slice.call(arguments || []),
      instance;

    if (!(this instanceof Fun)) {
      instance = Object.create(Fun.prototype);
      Fun.apply(instance, args);
      return instance;
    }

    if (args.length < 1) {
      throw new Error('Fun needs at least one argument');
    }

    var nargs = args.length - 1;
    var domain = args.slice(0, nargs),
      range = args[nargs];

    this.domain = domain;
    this.range = range;

    var descs = [];
    var i;
    for (i = 0; i < args.length; i++) {
      if (args[i] instanceof Fun) {
        descs.push('(' + args[i].description + ')');
      } else {
        descs.push(args[i].description);
      }
    }
    this.description = descs.join(' -> ');
  }

  Fun.prototype = Object.create(Type.prototype);
  blame.fun = Fun;

  function Forall (tyvar, type) {
    if (!this instanceof Forall) {
      return new Forall(tyvar, type);
    }

    this.tyvar = String(tyvar);
    this.type = type;
    this.description = 'forall ' + this.tyvar + '. ' + type.description;
  }

  Forall.prototype = Object.create(Fun.prototype);
  blame.forall = Forall;

  function Tyvar (id) {
    if (!this instanceof Tyvar) {
      return new Tyvar(id);
    }

    this.description = String(id);
  }
  Tyvar.prototype = Object.create(Type.prototype);
  blame.tyvar = Tyvar;

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
          var wrapped_args, ret;

          if (args.length !== A.domain.length || args.length !== B.domain.length) {
            throw new Error(p.msg() + ', wrong number of arguments, A:' +
                            A.domain.length + ', B: ' + B.domain.length + ',' +
                            'args: ' + args.length);
          }

          wrapped_args = [];
          args.forEach(function (arg, i) {
            var wrapped_arg = wrap(arg, q, p, B.domain[i], A.domain[i]);
            wrapped_args.push(wrapped_arg);
          });

          ret = target.apply(thisValue, wrapped_args);

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
