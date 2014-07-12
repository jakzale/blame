// New version of the parser, actually just a custom Emitter

// TypeScriptCompiler
///<reference path='../lib/typescript.d.ts' />

export module Blame {

    export class BlameEmitter extends TypeScript.Emitter {
    }

    export class BlameCompiler extends TypeScript.TypeScriptCompiler {
    }

    export function version() {
        return "0.0.1";
    }
}
