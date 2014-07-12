/*global define, TypeScript */
/*jslint indent: 2 */

define('tsc-parser', ['typescript'], function () {

  function parse(source) {
    var filename, syntaxTree, cs, ics, sourceUnit, i, n, me;

    filename = 'generated.d.ts';
    syntaxTree = TypeScript.Parser.parse(filename, TypeScript.SimpleText.fromString(source), true, new TypeScript.ParseOptions(TypeScript.LanguageVersion.EcmaScript5, true));

    if (syntaxTree.diagnostics().length) {
      throw new Error('TSC: ' + syntaxTree.diagnostics()[0].diagnosticKey());
    }

    cs = new TypeScript.CompilationSettings();
    cs.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;

    ics = TypeScript.ImmutableCompilationSettings.fromCompilationSettings(cs);
    sourceUnit = TypeScript.SyntaxTreeToAstVisitor.visit(syntaxTree, filename, ics, false);

    for (i = 0, n = sourceUnit.moduleElements.childCount(); i < n; i++) {
      me = sourceUnit.moduleElements.childAt(i);
      switch (me.kind()) {
        case TypeScript.SyntaxKind.VariableStatement:
          var key, property, type;
          property = me.declaration.declarators.nonSeparatorAt(0).propertyName;
          type = me.declaration.declarators.nonSeparatorAt(0).typeAnnotation.type;

          console.log(property.valueText());
          console.log(type.typeMembers);
          break;
      }
    }

  }


  return parse;
});


// vim: set ts=2 sw=2 sts=2 et :
