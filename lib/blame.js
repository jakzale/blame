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
   * private class Type
   */

  function Type(description) {
    if (!(this instanceof Type)) {
      return new Type(description);
    }

    this.description = String(description);
  }

  /**
   * private class BaseType
   */

  function BaseType(description, contract) {
    if (!(this instanceof BaseType)) {
      return new BaseType(description, contract);
    }

    this.description = description;
    this.contract = contract;
  }
  BaseType.prototype = Object.create(Type.prototype);

  function contract(test) {
    return function (value, label) {
      if (test(value)) {
        return value;
      }

      throw new Error(label.msg());
    };
  }

  function define_base_type(description, test) {
    blame[description] = new BaseType(description, contract(test));
  }

  function is_number(value) {
    return typeof value === 'number';
  }

  function is_boolean(value) {
    return typeof value === 'boolean';
  }

  function is_string(value) {
    return typeof value === 'string';
  }

  function is_function(value) {
    return typeof value === 'function';
  }

  function is_undefined(value) {
    return value === undefined;
  }

  //function is_object(value) {
  //  return !!(obj && (typeof obj === 'object') && !Array.isArray(obj));
  //}


  // Defining basic types
  define_base_type('Num', is_number);
  define_base_type('Bool', is_boolean);
  define_base_type('Str', is_string);
  define_base_type('Und', is_undefined);

  var Any = new Type('Any');

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
    if (!(this instanceof Forall)) {
      return new Forall(tyvar, type);
    }

    if (!((type instanceof Fun) || (type instanceof Forall)))  {
      throw new Error('Panic,' + type + ' is not a function nor a forall type');
    }

    this.tyvar = String(tyvar);
    this.type = type;
    this.description = 'forall ' + this.tyvar + '. ' + type.description;
  }

  Forall.prototype = Object.create(Type.prototype);
  blame.forall = Forall;

  function Tyvar (id) {
    if (!(this instanceof Tyvar)) {
      return new Tyvar(id);
    }

    this.description = String(id);
  }
  Tyvar.prototype = Object.create(Type.prototype);
  blame.tyvar = Tyvar;

  /**
   * Inductive type:
   *  | Any : type
   *  | Num : type
   *  | Fun : type+ -> type -> type
   *  | Forall : String -> type -> type
   *  | Tyvar : String -> type
   */

  function substitute_tyvar(target, id, new_type) {
    var tyvar = String(id),
      args = [],
      instance;
    // Checking the arguments
    if (!(target instanceof Type)) {
      throw new Error('Panic, ' + target + ' is not a type');
    }
    if (!(new_type instanceof Type)) {
      throw new Error('Panic, ' + new_type + ' is not a type');
    }

    if (target === Any) {
      return target;
    }

    if (target instanceof BaseType) {
      return target;
    }

    if (target instanceof Fun) {
      target.domain.forEach(function (arg) {
        args.push(substitute_tyvar(arg, id, new_type));
      });
      args.push(substitute_tyvar(target.range, id, new_type));

      instance = Object.create(Fun.prototype);
      Fun.apply(instance, args);

      return instance;
    }

    if (target instanceof Forall) {
      if (target.tyvar === tyvar) {
        return target;
      }
      instance = substitute_tyvar(target.type, tyvar, new_type);

      return new Forall(target.tyvar, instance);
    }

    if (target instanceof Tyvar) {
      if (target.description === tyvar) {
        return new_type;
      }

      return target;
    }

    throw new Error('Panic, type:' + target + ' is not supported');
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
    if (A === Any && B === Any) {
      return value;
    }

    if ((A instanceof BaseType) && (B instanceof BaseType) && A === B) {
      return A.contract(value, p);
    }

    if ((A instanceof Fun) && (B instanceof Fun) && A.domain.length === B.domain.length) {
      // TODO: Split the execution of contract and test fun
      //  This should allow to reuse code here
      if (!is_function(value)) {
        throw new Error(p.msg());
      }

      return new Proxy(value, {
        apply: function (target, thisValue, args) {
          var wrapped_args, ret;

          if (args.length !== A.domain.length) {
            throw new Error(p.msg() + ', wrong number of arguments, expected' + A.domain.length + ', got: ' + args.length);
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

    if ((A instanceof Forall) && (B instanceof Forall)) {
      if (A.tyvar === B.tyvar) {

        return new Proxy(value, {
          apply: function (target, thisValue, args) {
            // Generate new seals
            var store = new WeakMap();

            var XX = new Tyvar(A.tyvar);

            XX.seal = function (v) {
              var t = new Token(A.tyvar);
              store.set(t, v);
              return t;
            };

            XX.unseal = function (t, q) {
              if (!(t instanceof Token)) {
                throw new Error(q.msg() + '[' + A.tyvar + '] not a sealed token: ' + t);
              }

              if (!store.has(t)) {
                throw new Error(q.msg() + '[' + A.tyvar + '] token sealed by a different forall: ' + t);
              }

              return store.get(t);
            };

            var A_XX = substitute_tyvar(A.type, A.tyvar, XX);
            var B_prim = substitute_tyvar(B.type, A.tyvar, Any);

            var wrapped_fun = wrap(target, p, q, A_XX, B_prim);

            return wrapped_fun.apply(thisValue, args);
          }
        });
      }
    }

    if ((A instanceof Tyvar) && (B === Any)) {
      if (!A.unseal) {
        throw new Error(q.msg(), 'not in forall context, B:' + B);
      }
      return A.unseal(value, q);
    }

    if ((A === Any) && (B instanceof Tyvar)) {
      if (!B.seal) {
        throw new Error(p.msg(), 'not in forall context, A:' + A);
      }
      return B.seal(value);
    }

    throw new Error('A:' + A.description + ' and B:' + B.description + ' are not compatible' );
  }
  blame.wrap = wrap;

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
