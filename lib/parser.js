/*global define, window, WeakMap, console, Proxy, PEG */
/*jslint indent: 2, todo: true, bitwise: true */

define('blame_parser', ['peg'], function () {
  var parser, rules;


/*

Rules for the parser
--------------------

AmbientDeclaration =
  "declare" " " AmbientVariableDeclaration

AmbientVariableDeclaration =
  "var" " " Identifier ";"

Identifier =
  [a-z | A-Z | "_" | "$"] [a-z | A-Z | "_" | "$" | 0-9]*

*/
  rules = [
    'AmbientDeclaration =',
    '  "declare" " " AmbientVariableDeclaration',
    '',
    'AmbientVariableDeclaration =',
    '  "var" " " Identifier ";"',
    '',
    'Identifier =',
    '  [a-z | A-Z | "_" | "$"] [a-z | A-Z | "_" | "$" | 0-9]*'
  ];

  parser = PEG.buildParser(rules.join('\n'));
  return parser;
});

// vim: set ts=2 sw=2 sts=2 et :
