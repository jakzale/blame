/*global describe, it, define */
/*jslint indent: 2, todo: true */
'use strict';

var blame = require('../build/blame.js');
var expect = require('chai').expect;

function empty() { return; }
var used = empty;

describe('Blame module', function() {
  it('should exist', function () {
    used(expect(blame).to.exist);
  });

});



// vim: set ts=2 sw=2 sts=2 et :
