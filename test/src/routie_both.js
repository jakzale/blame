/*global routie, it */
/// <reference path="../../typings/routie/routie.d.ts" />

// BASIC

it('should pass', function () {
  // There are three ways to call routie. Here is the most basic way:

  routie("users", function () {
    // This gets called when hash == #users
  });

  // If you want to define multiple routes you can pass in an object like this:

  routie({
    "users": function () {
    },
    "about": function () {
    }
  });

  // If you want to trigger a route manually, you can call routie like this:

  routie("users/bob"); // window.location.hash will be #users/bob

  // ADVANCED

  // Routie also supports regex style routes, so you can do advanced routing like this:

  routie("users/:name", function (name) {
    // name == "bob";
  });

  routie("users/bob");

  // Optional params:

  routie("users/?:name", function (name) {
    //name == undefined
    //then
    //name == bob
  });

  routie("users/");
  routie("users/bob");

  // Wildcard:

  routie("users/*", function () {
  });

  routie("users/12312312");

  // Catch all:

  routie("*", function () {
  });

  routie("anything");

  // Additional tests
  var expect = require('chai').expect;

  expect(function () {
    routie(1);
  }).to.throw('negative');

  expect(function () {
    routie({'a': 2});
  }).to.throw('negative');
});

