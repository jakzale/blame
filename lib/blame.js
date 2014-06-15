/*global define, window, WeakMap, console, Proxy */
/*jslint indent: 2, todo: true, nomen: true */

define('blame', [], function () {
  'use strict';
  var blame = Object.create(Object.prototype);

  /**
   * public class Type
   */
  function Type(description) {
    if (!(this instanceof Type)) {
      return new Type(description);
    }

    this.description = description;
  }

  blame.Type = Type;

  /**
   * wrap function
   */
  function wrap(value, label_p, label_q, type_A, typeB) {

  }

  return blame;
});

// vim: set ts=2 sw=2 sts=2 et :
