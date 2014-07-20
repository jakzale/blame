/*global define, window, WeakMap, console, Proxy */
/*jslint indent: 2, todo: true, bitwise: true */

'use strict';

var blame, count, Num, Bool, Str, Und, Any, Forall, fun, wrap;

// Use the ReflectJS proxy
if (Proxy && typeof Proxy !== 'function') {
  // Import new style Proxies
  require('harmony-reflect');
}

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

function is_object(value) {
  return !!(value && (typeof value === 'object'));
}


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

  return fun(domain, null, null, range);
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

function Tyvar(id) {
  if (!(this instanceof Tyvar)) {
    return new Tyvar(id);
  }

  this.description = String(id);
}
Tyvar.prototype = Object.create(Type.prototype);
blame.tyvar = Tyvar;

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

function Obj(properties) {
  var key;
  var descs = [];

  if (!(this instanceof Obj)) {
    return new Obj(properties);
  }

  this.properties = {};

  for (key in properties) {
    if(properties.hasOwnProperty(key)) {
      if (!(properties[key] instanceof Type)) {
        throw new Error('Panic, ' + properties[key] + ' is not a type');
      }

      this.properties[key] = properties[key];
      descs.push(key + ': ' + properties[key].description);
    }
  }

  this.description = '{' + descs.join(', ') + '}';
}
Obj.prototype = Object.create(Type.prototype);
blame.obj = Obj;


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

    return new Forall(target.tyvar, substitute_arg(target.type));
  }

  if (target instanceof Tyvar) {
    if (target.description === ty) {
      if (!target.seal) {
        return new_type;
      }
    }

    return target;
  }

  if (target instanceof Arr) {
    return new Arr(substitute_arg(target.type));
  }

  if (target instanceof Sum) {
    return new Sum(target.types.map(substitute_arg));
  }

  if (target instanceof Obj) {
    var properties = {}, key;

    for (key in target.properties) {
      if (target.properties.hasOwnProperty(key)) {
        properties[key] = substitute_arg(target.properties[key]);
      }
    }

    return new Obj(properties);
  }

  throw new Error('Panic, type: ' + target.description + ' is not supported');
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


function wrap_function(value, p, q, A, B) {
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


function wrap_array(value, p, q, A, B) {
  return new Proxy(value, {
    get: function (target, name, receiver) {
      unused(receiver);

      // Returning an element of the array
      if (is_index(name)) {
        var val = wrap(target[name], p, q, A.type, B.type);

        return val;
      }

      return target[name];
    },
    set: function (target, name, val, receiver) {
      unused(receiver);

      if (is_index(name)) {
        target[name] = wrap(val, q, p, B.type, A.type);

        return;
      }

      target[name] = val;
    }
  });
}


function wrap_object(value, p, q, A, B) {
  return new Proxy(value, {
    get: function (target, name, receiver) {
      var A_type, B_type;

      unused(receiver);

      if (A.properties.hasOwnProperty(name)) {
        A_type = A.properties[name];
        B_type = B.properties[name];

        return wrap(target[name], p, q, A_type, B_type);
      }

      return target[name];
    },
    set: function (target, name, val, receiver) {
      var A_type, B_type;

      unused(receiver);

      if (A.properties.hasOwnProperty(name)) {
        A_type = A.properties[name];
        B_type = B.properties[name];

        target[name] = wrap(val, q, p, B_type, A_type);

      }
      else {

        target[name] = val;

      }
    }
  });
}

var counter = 0;
function wrap_forall(value, p, q, A, B) {
  return new Proxy(value, {
    apply: function (target, thisValue, args) {
      // Generate new seals
      var store, XX, A_XX, B_prim, wrapped_fun;

      store = new WeakMap();
      counter += 1;
      XX = new Tyvar(A.tyvar + '_' + counter);

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
      B_prim = substitute_tyvar(B.type, B.tyvar, Any);


      wrapped_fun = wrap(target, p, q, A_XX, B_prim);

      return wrapped_fun.apply(thisValue, args);
    }
  });
}

function wrap_sum(value, p, q, A, B) {
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



/**
 * wrap function
 */
wrap = function (value, p, q, A, B) {
  // Wrapping ground types
  if (A === Any && B === Any) {
    return value;
  }

  if ((A instanceof BaseType) && (B instanceof BaseType) && A === B) {
    return apply_contract(value, A.contract, p.msg('not of type ' + A.description));
  }

  if ((A instanceof Fun) && (B instanceof Fun) &&
      A.domain.length === B.domain.length &&
        A.optional.length === B.optional.length &&
          !!A.repeated === !!B.repeated) {

    // Check if enclosed value is  function
    apply_contract(value, is_function, p.msg('not a function'));

    return wrap_function(value, p, q, A, B);
  }

  if ((A instanceof Arr) && (B instanceof Arr)) {
    apply_contract(value, is_array, p.msg('not an array'));

    return wrap_array(value, p, q, A, B);
  }

  if ((A instanceof Forall) && (B instanceof Forall)) {
    if (A.tyvar === B.tyvar) {
      return wrap_forall(value, p, q, A, B);
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
    return wrap_sum(value, p, q, A, B);
  }

  if ((A instanceof Obj) && (B instanceof Obj) && Object.keys(A).length === Object.keys(B).length) {
    apply_contract(value, is_object, p.msg('not an object'));

    return wrap_object(value, p, q, A, B);
  }

  throw new Error('Panic, A:' + A.description + ' and B:' + B.description + ' are not compatible');
};
blame.wrap = wrap;

module.exports = blame;

// vim: set ts=2 sw=2 sts=2 et :
