/*global describe, it, define, expect*/
/*jslint indent: 2, todo: true */

define(['blame'], function (blame) {
  'use strict';

  function unused() { return; }

  var tarr = blame.tarr,
    Arr = blame.Arr,
    Num = blame.Num,
    Bool = blame.Bool,
    Str = blame.Str,
    Fun = blame.Fun,
    tfun = blame.tfun,
    wrap = blame.wrap,
    forall = blame.forall,
    tyvar = blame.tyvar,
    used = unused,
    gen_label;


  function wrapped() {
    var args = Array.prototype.slice.call(arguments || []);

    return function () {
      return wrap.apply(undefined, args);
    };
  }

  gen_label = (function () {
    var counter = 0;

    return function () {
      counter += 1;

      return 'label_' + counter;
    };

  }());

  describe('JavaScript Array type', function () {
    describe('assumption', function () {
      it('should have the property of length', function () {
        used(expect([].hasOwnProperty('length')).to.be.true);
      });

      it('should not loop over properties', function () {
        var count = 0,
         other_count = 0,
         array = [],
         property;

        for (property in array) {
          if (array.hasOwnProperty(property)) {
            count += 1;
          } else {
            other_count += 1;
          }
        }

        expect(count).to.equal(0);
        expect(other_count).to.equal(0);
      });
    });
  });

  describe('Array wrapper', function () {
    it('should exist', function () {
      used(expect(tarr).to.exist);
      used(expect(Arr).to.exist);
    });

    it('should wrap simple arrays', function () {
      var label = gen_label();
      [[], [1, 2], ['a', 1, true]].forEach(function (e) {
        expect(wrapped(Arr, e, label)).not.to.throw();
      });
    });

   it('should reject other types', function () {
      var label = gen_label();

      [1, 'a', true, function () {return;}, {}].forEach(function (e) {
        expect(wrapped(Arr, e, label)).to.throw(label);
      });
   });

   it('should wrap the array', function () {
     var label = gen_label(),
      array = [];

      expect(array).to.equal(array);
      expect(wrap(Arr, array, label)).to.equal(array);
      expect(wrap(tarr(Num), array, label)).not.to.equal(array);
   });

   it('should defer the check on elements until read/write', function () {
     var label = gen_label();

     expect(wrapped(tarr(Num), ['a', 'b', 'c'], label)).not.to.throw();
   });

   it('should preserve the length', function () {
     function repeat(e, n) {
       var a = [];
       while(n--) {
         a.push(e);
       }
       return a;
     }

     var label = gen_label();

     [0,1,2,3,4,5,6].forEach(function (v) {
       var a = repeat(1, v),
        wrapped_a = wrap(tarr(Num), a, label);

        expect(wrapped_a.length).to.equal(a.length);

        // Check for different type than Num:
        a = repeat(true, v);
        wrapped_a = wrap(tarr(Bool), a, label);
        expect(wrapped_a.length).to.equal(a.length);
     });
   });

   describe('checks on read', function () {
     function get(array, i) {
       return function () {
         return array[i];
       };
     }

     it('should accept the correct type', function () {
       var label = gen_label(),
        array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        wrapped_array = wrap(tarr(Num), array, label);

      array.forEach(function (v, i) {
        expect(get(wrapped_array, i)).not.to.throw();
        expect(get(wrapped_array, i)()).to.equal(v);
      });
     });

     it('should reject the incorrect type', function () {
       var label = gen_label(),
        array = ['a', true, [], unused],
        wrapped_array = wrap(tarr(Num), array, label);

      array.forEach(function (v, i) {
        unused(v);
        expect(get(wrapped_array, i)).to.throw(label);
      });
     });
   });

   describe('checks on write', function () {
     function set(array, i, v) {
       return function () {
         array[i] = v;
         return array[i];
       };
     }

     it('should accept the correct type', function () {
       var label = gen_label(),
        values = [1, true, 'a', unused, []],
        types = [Num, Bool, Str, Fun, Arr];

        values.forEach(function (v, i) {
          var array = [],
            wrapped_array = wrap(tarr(types[i]), array, label);

          expect(set(wrapped_array, 0, v)).not.to.throw();
          expect(set(wrapped_array, 0, v)()).to.equal(v);
        });
     });

     it('should reject the incorrect type', function () {
       var label = gen_label(),
        values = [1, true, 'a', unused, []],
        types = [Arr, Num, Bool, Str, Fun];

        values.forEach(function (v, i) {
          var array = [],
            wrapped_array = wrap(tarr(types[i]), array, label);

          expect(set(wrapped_array, 0, v)).to.throw('~' + label);
        });
     });
   });
  });
});

// vim: set ts=2 sw=2 sts=2 et :
