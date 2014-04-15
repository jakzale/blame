// Checking for an integer
function Int(value) {
  return Number.isInteger(value);
}

function succ(value) {
  return value + 1;
}

// Functional wrapper
function wrap_functional(A, B, f, label) {
  var l = Object.prototype.toString.call(label);
  var wrapped = function (x) {

    if(!A(x)) {
      throw new Error("blame: ~" + l);
    }

    var result = f(x);
    if(!B(result)) {
      throw new Error("blame: " + l);
    }
    return result;
  };

  return wrapped;
}

// Proxy handler
function wrap_proxy (A, B, f, label) {
    var l = Object.prototype.toString.call(label);
    var handler = {
        apply: function(target, thisArg, args) {
            var x = args[0];
            if (!A(x)) {
                throw new Error("blame: ~" + l);
            }
            var result = target(x);
            if (!B(result)) {
                throw new Error("blame: " + l);
            }
            return result;
        }
    };

    return new Proxy(f, handler);
}

var succ_func = wrap_functional(Int, Int, succ, 'f');
var succ_proxy = wrap_proxy(Int, Int, succ, 'p');
