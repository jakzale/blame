/*global Blame */
(function (require) {
    'use strict';

    var module = require('some-module');

    module.someFun('woo!');

}(this,
  (function () {
    var declaredModules = Object.create(null);

    // Blame Declarations go here

    return function (module) {
        var imported = require(module);

        if (Object.prototype.hasOwnProperty.call(declaredModules, module)) {
            imported = Blame.simple_wrap(imported, declaredModules[module]);
        }

        return imported;
    };
  }()))
);
