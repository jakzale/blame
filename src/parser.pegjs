AmbientDeclaration "declaration"
  = 'declare' ' ' AmbientVariableDeclaration

AmbientVariableDeclaration "variable"
  = 'var' ' ' Identifier ';'

Identifier "identifier"
  = [a-z | A-Z | '$' | '_'] [a-z | A-Z | '$' | '_' | 0-9]*


WhiteSpace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "\uFEFF"
  / Zs


// Separator, Space
Zs = [\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]

// vim: set ts=2 sw=2 sts=2 et :
