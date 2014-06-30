/*global define, window, WeakMap, console, Proxy */
/*jslint indent: 2, todo: true, bitwise: true */

define('blame', [], function () {
  'use strict';
  var blame, count, Num, Bool, Str, Und, Any, Forall, fun, arr, tyvar, forall, sum;

  blame = Object.create(null);

  function unused() { return; }

  count = 0;

  function Label(label, status) {
    if (!(this instanceof Label)) {
      return new Label(label, status);
    }

    if (label !== undefined) {
      this.label = String(label);
    } else {
      this.label = 'label_' + count;
      count += 1;
    }

    if (status !== undefined) {
      this.status = !!status;
    } else {
      this.status = true;
    }
  }

  Label.prototype.negated = function () {
    return new Label(this.label, !this.status);
  };

  // TODO: Throw error when reading these
  Label.prototype.status = true;
  Label.prototype.label = 'label';
  Label.prototype.msg = function (message) {
    return '{' + (this.status ? 'positive ' : 'negative ') + this.label + '}' + (message ? ' ' + message : '');
  };

  blame.Label = Label;

  function Type(description) {
    if (!(this instanceof Type)) {
      return new Type(description);
    }

    this.description = String(description);
  }

  function BaseType(description, contract) {
    if (!(this instanceof BaseType)) {
      return new BaseType(description, contract);
    }

    this.description = description;
    this.contract = contract;
  }
  BaseType.prototype = Object.create(Type.prototype);

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

  function is_array(value) {
    return Array.isArray(value);
  }

  //function is_object(value) {
  //  return !!(obj && (typeof obj === 'object') && !Array.isArray(obj));
  //}


  Num = new BaseType('Num', is_number);
  Bool = new BaseType('Bool', is_boolean);
  Str = new BaseType('Str', is_string);
  Und = new BaseType('Und', is_undefined);
  Any = new Type('Any');

  blame.Num = Num;
  blame.Bool = Bool;
  blame.Str = Str;
  blame.Und = Und;

  function Fun(domain, optional, repeated, range) {
    if (!(this instanceof Fun)) {
      return new Fun(domain, optional, repeated, range);
    }

    this.domain = domain || [];
    this.optional = optional || [];
    this.repeated = repeated;
    this.range = range;

    // Building the description
    var descs = [];
    // Push a symbol for no arguments
    if (this.domain.length === 0 && this.optional.length === 0 && !this.repeated) {
      descs.push('()');
    }

    function parse_description(prefix) {
      return function (arg) {
        var desc = arg.description;
        if ((arg instanceof Fun) || (arg instanceof Forall)) {
          desc = '(' + desc + ')';
        }
        descs.push(prefix + desc);
      };
    }

    if (domain) {
      domain.forEach(parse_description(''));
    }

    if (optional) {
      optional.forEach(parse_description('?'));
    }

    if (repeated) {
      parse_description('*')(repeated);
    }

    parse_description('')(range);

    this.description = descs.join(' -> ');
  }
  Fun.prototype = Object.create(Type.prototype);
  blame.fun = Fun;
  fun = Fun;

  function func() {
    var args, nargs, domain, range;

    args = Array.prototype.slice.call(arguments || []);

    if (args.length < 1) {
      throw new Error('Panic, Fun needs at least one argument');
    }

    nargs = args.length - 1;
    domain = args.slice(0, nargs);
    range = args[nargs];

    return new Fun(domain, [], null, range);
  }

  blame.func = func;

  Forall = function Forall(tyvar, type) {
    if (!(this instanceof Forall)) {
      return new Forall(tyvar, type);
    }

    if (!((type instanceof Fun) || (type instanceof Forall))) {
      throw new Error('Panic,' + type + ' is not a function nor a forall type');
    }

    this.tyvar = String(tyvar);
    this.type = type;
    this.description = 'forall ' + this.tyvar + '. ' + type.description;
  };

  Forall.prototype = Object.create(Type.prototype);
  blame.forall = Forall;
  forall = Forall;

  function Tyvar(id) {
    if (!(this instanceof Tyvar)) {
      return new Tyvar(id);
    }

    this.description = String(id);
  }
  Tyvar.prototype = Object.create(Type.prototype);
  blame.tyvar = Tyvar;
  tyvar = Tyvar;

  function Arr(type) {
    if (!(this instanceof Arr)) {
      return new Arr(type);
    }

    if (!(type instanceof Type)) {
      throw new Error('Panic, ' + type + ' is not a type');
    }

    this.type = type;
    this.description = '[' + type.description + ']';
  }
  Arr.prototype = Object.create(Type.prototype);
  blame.arr = Arr;
  arr = Arr;


  function Sum(types) {
    if (!(this instanceof Sum)) {
      return new Sum(types);
    }

    this.types = types;

    var descs = types.map(function (type) {
      return type.description;
    });

    this.description = '(' + descs.join(' | ') + ')';
  }

  Sum.prototype = Object.create(Type.prototype);
  blame.sum = Sum;
  sum = Sum;

  function substitute_tyvar(target, id, new_type) {
    var ty, new_domain, new_optional, new_repeated, new_range;

    ty = String(id);

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

    function substitute_arg(arg) {
      return substitute_tyvar(arg, ty, new_type);
    }

    if (target instanceof Fun) {
      new_domain = [];
      new_optional = [];
      new_repeated = null;
      new_range = null;

      if (target.domain) {
        new_domain = target.domain.map(substitute_arg);
      }

      if (target.optional) {
        new_optional = target.optional.map(substitute_arg);
      }

      if (target.repeated) {
        new_repeated = substitute_arg(target.repeated);
      }

      new_range = substitute_arg(target.range);

      return new Fun(new_domain, new_optional, new_repeated, new_range);
    }

    if (target instanceof Forall) {
      if (target.tyvar === ty) {
        return target;
      }

      return new Forall(target.tyvar, substitute_tyvar(target.type, ty, new_type));
    }

    if (target instanceof Tyvar) {
      if (target.description === ty) {
        return new_type;
      }

      return target;
    }

    if (target instanceof Arr) {
      return new Arr(substitute_arg(target.type));
    }

    if (target instanceof Sum) {
      return new Sum(target.types.map(substitute_arg));
    }

    throw new Error('Panic, type: ' + target + ' is not supported');
  }

  function Token(ty) {
    if (!(this instanceof Token)) {
      return new Token(ty);
    }

    this.tyvar = ty;
  }


  function apply_contract(value, contract, message) {
    if (contract(value)) {
      return value;
    }

    throw new Error(message);
  }

  function is_index(value) {
    // Cast the number to uint32
    var index = Number(value) >>> 0;
    return value === index.toString() && index !== (-1 >>> 0);
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
      return apply_contract(value, A.contract, p.msg('not of type ' + A.description));
    }

    if ((A instanceof Fun) && (B instanceof Fun) && A.domain.length === B.domain.length && A.optional.length === B.optional.length && !!A.repeated === !!B.repeated) {
      // Check if enclosed value is  function
      apply_contract(value, is_function, p.msg('not a function'));

      return new Proxy(value, {
        apply: function (target, thisValue, args) {

          if (args.length < A.domain.length) {
            throw new Error(p.msg('not enough arguments, expected: ' + A.domain.length + ', got: ' + args.length));
          }

          if (args.length > A.domain.length + A.optional.length && !A.repeated) {
            throw new Error(p.msg('too many arguments, expected: ' + (A.domain.length + A.optional.length) + ', got: ' + args.length));
          }

          var i, j, k, ret, wrapped_args = [];

          for (i = 0; i < A.domain.length; i += 1) {
            wrapped_args.push(wrap(args[i], q, p, B.domain[i], A.domain[i]));
          }
          for (j = 0; j < A.optional.length && (i + j) < args.length; j += 1) {
            wrapped_args.push(wrap(args[i + j], q, p, B.optional[j], A.optional[j]));
          }
          for (k = 0; (i + j + k) < args.length; k += 1) {
            wrapped_args.push(wrap(args[i + j + k], q, p, B.repeated, A.repeated));
          }

          ret = target.apply(thisValue, wrapped_args);

          return wrap(ret, p, q, A.range, B.range);
        }
      });
    }

    if ((A instanceof Arr) && (B instanceof Arr)) {
      apply_contract(value, is_array, p.msg('not an array'));

      return new Proxy(value, {
        get: function (target, name, receiver) {
          unused(receiver);

          var ARRAY_API, gen, A_type, B_type;

          ARRAY_API = {
            length: function () {
              return Num;
            },
            // TODO: Remember that concat may accept values
            concat: function (T) {
              return fun(null, null, sum([T, arr(T)]), arr(T));
            },
            every: function (T) {
              var fun_type = func(T, Num, arr(T), Bool);
              return fun([fun_type], [Any], null, Bool);
            },
            filter: function (T) {
              var fun_type = func(T, Num, arr(T), Bool);
              return fun([fun_type], [Any], null, arr(T));
            },
            forEach: function (T) {
              var fun_type = func(T, Num, arr(T), Und);
              return fun([fun_type], [arr(T)], null, Und);
            },
            indexOf: function (T) {
              return fun([T], [Num], null, Num);
            },
            join: function () {
              return fun(null, [Str], null, Str);
            },
            lastIndexOf: function (T) {
              return fun([T], [Num], null, Num);
            },
            map: function (T) {
              var fun_type = func(T, Num, arr(T), tyvar('Z'));
              return forall('Z', fun([fun_type], [Any], null, arr(tyvar('Z'))));
            },
            pop: function (T) {
              return func(T);
            },
            push: function (T) {
              return fun(null, null, T, Num);
            },
            reduce: function (T) {
              var fun_type = func(sum([tyvar('Z'), T]), T, Num, arr(T), tyvar('Z'));
              return forall('Z', fun([fun_type], [tyvar('Z')], null,  tyvar('Z')));
            },
            reduceRight: function (T) {
              var fun_type = func(sum([tyvar('Z'), T]), T, Num, arr(T), tyvar('Z'));
              return forall('Z', fun([fun_type], [tyvar('Z')], null,  tyvar('Z')));
            },
            reverse: function (T) {
              return func(arr(T));
            },
            shift: function (T) {
              return func(T);
            },
            slice: function (T) {
              return func(Num, Num, arr(T));
            },
            some: function (T) {
              var fun_type = func(T, Num, arr(T), Bool);
              return func(fun_type, Bool);
            },
            sort: function (T) {
              var fun_type = func(T, T, Num);
              return func(fun_type, arr(T));
            },
            toLocaleString: function () {
              return func(Str);
            },
            toString: function () {
              return func(Str);
            }
          };

          // Fix, because there is Object.prototype.toString
          if (ARRAY_API.hasOwnProperty(name)) {
            gen = ARRAY_API[name];

            A_type = gen(A.type);
            B_type = gen(B.type);

            return wrap(target[name], p, q, A_type, B_type);
          }

          apply_contract(name, is_index, q.msg(name + ' is not an array index'));

          return wrap(target[name], p, q, A.type, B.type);
        },
        set: function (target, name, val, receiver) {
          unused(receiver);

          var ARRAY_API, gen, A_type, B_type;

          ARRAY_API = {
            length: function () {
              return blame.Num;
            }
          };

          if (ARRAY_API.hasOwnProperty(name)) {
            gen = ARRAY_API[name];
            A_type = gen(A.type);
            B_type = gen(B.type);

            target[name] = wrap(val, q, p, B_type, A_type);

            return;
          }

          apply_contract(name, is_index, q.msg(name + ' is not an array index'));

          target[name] = wrap(val, q, p, B.type, A.type);
        }
      });

    }

    if ((A instanceof Forall) && (B instanceof Forall)) {
      if (A.tyvar === B.tyvar) {

        return new Proxy(value, {
          apply: function (target, thisValue, args) {
            // Generate new seals
            var store, XX, A_XX, B_prim, wrapped_fun;

            store = new WeakMap();
            XX = new Tyvar(A.tyvar);

            XX.seal = function (v) {
              var t = new Token(A.tyvar);
              store.set(t, v);
              return t;
            };

            XX.unseal = function (t, q) {
              if (!(t instanceof Token)) {
                throw new Error(q.negated().msg(t + ' is not a sealed token (' + A.tyvar + ')'));
              }

              if (!store.has(t)) {
                throw new Error(q.negated().msg(t + ' was sealed by different forall (' + A.tyvar + ')'));
              }

              return store.get(t);
            };

            A_XX = substitute_tyvar(A.type, A.tyvar, XX);
            B_prim = substitute_tyvar(B.type, A.tyvar, Any);

            wrapped_fun = wrap(target, p, q, A_XX, B_prim);

            return wrapped_fun.apply(thisValue, args);
          }
        });
      }
    }

    if ((A instanceof Tyvar) && (B === Any)) {
      if (A.unseal) {
        return A.unseal(value, q);
      }
    }

    if ((A === Any) && (B instanceof Tyvar)) {
      if (B.seal) {
        return B.seal(value);
      }
    }

    if ((A instanceof Sum) && (B instanceof Sum) && A.types.length === B.types.length) {
      // Hacky implementation for now
      var i, passed, pass, status;

      passed = [];

      for (i = 0; i < A.types.length; i += 1) {
        status = true;

        try {
          pass = wrap(value, p, q, A.types[i], B.types[i]);
        }
        catch (e) {
          status = false;
        }

        if (status) {
          passed.push(pass);
        }
      }

      if (passed.length === 0) {
        throw new Error(p.msg('not of Sum type: ' + A.description + ' ' + B.description));
      }

      if (passed.length > 1) {
        throw new Error('Panic, ambiguous sum:' + A.description + ' ' + B.description);
      }

      return passed[0];
    }

    throw new Error('Panic, A:' + A.description + ' and B:' + B.description + ' are not compatible');
  }
  blame.wrap = wrap;

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
