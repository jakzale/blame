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

  function clone(obj) {
    var copy, key;
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // Clone array
    if (obj instanceof Array) {
      copy = [];
      obj.forEach(function (e, i) {
        copy[i] = e;
      });
      return copy;
    }

    if (obj instanceof Object) {
      copy = Object.create(obj.prototype);
      for (key in obj) {
        if (obj.hasOwnProperty(key)) copy[key] = clone(obj[key]);
      }
      return copy;
    }
  }

  function substitue_tyvar(target, tyvar, new_type) {
    var modified, key;
    if (target === null || typeof target !== "object") {
      return target;
    }

    if (target instanceof Array) {
      modified = [];

      target.forEach(function (e, i) {
        modified[i] = substitue_tyvar(e, tyvar, new_type);
        return modified;
      });
    }

    if (target instanceof Object) {
      if (!(target instanceof Type)) {
        return target;
      }
      if ((target instanceof Forall) && Forall.tyvar === tyvar) {
        return target;
      }
      if ((target instanceof Tyvar) && Tyvar.description === tyvar) {
        return new_type;
      }
      modified = Object.create(target.prototype);
      for (key in target) {
        if (target.hasOwnProperty(key)) modified[key] = substitue_tyvar(target[key], tyvar, new_type);
      }
      return modified;
    }

    // for safety return target
    return target;
  }

  function Token(tyvar) {
    if (!(this instanceof Token)) {
      return new Token(tyvar);
    }

    this.tyvar = tyvar;
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

    //if ((A instanceof Tyvar) && (B instanceof Tyvar)) {
    //  if (A.description === B.description) {
    //    return value;
    //  }
    //}

    if ((A instanceof Forall) && (B instanceof Forall)) {
      if (A.tyvar === B.tyvar) {

        return new Proxy(value, {
          apply: function (target, thisValue, args) {
            // Generate new seals
            var store = new WeakMap();

            var XX = new Tyvar(A.tyvar);

            XX.seal = function (v) {
              var t = new Token();
              store.set(t, v);
              return t;
            };

            XX.unseal = function (t, q) {
              if (!(t instanceof Token)) {
                throw new Error(q.msg(), 'not a sealed token: ' + t);
              }

              if (!store.has(t)) {
                throw new Error(q.msg(), 'token sealed by a different forall: ' + t);
              }

              return store.get(t);
            };

            var B_XX = substitue_tyvar(A.type, A.tyvar, XX);
            var B_prim = substitue_tyvar(A.type, A.tyvar, Any);

            var wrapped_fun = wrap(target, p, q, B_XX, B_prim);

            return wrapped_fun.apply(thisValue, args);
          }
        });
      }
    }

    if ((A instanceof Tyvar) && (B instanceof Any)) {
      if (!A.seal) {
        throw new Error(p.msg(), 'not in forall context, A:' + A);
      }
      return A.seal(value);
    }

    if ((A instanceof Any) && (B instanceof Tyvar)) {
      if (!B.seal) {
        throw new Error(q.msg(), 'not in forall context, B:' + B);
      }
      return B.unseal(value, q);
    }

    throw new Error('A:' + A.description + ' and B:' + B.description + ' are not compatible' );
  }
  blame.wrap = wrap;

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
