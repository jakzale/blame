// New version of the parser, actually just a custom Emitter

// TypeScriptCompiler
///<reference path='./typescript.d.ts' />

module Blame {

    export class BlameEmitter extends TypeScript.Emitter {
    }

    export class BlameCompiler extends TypeScript.TypeScriptCompiler {
    }
}
