// New version of the parser, actually just a custom Emitter

// TypeScriptCompiler
///<reference path='../lib/typescript.d.ts' />

var compiler:TypeScript.TypeScriptCompiler = null;

export class BlameEmitter extends TypeScript.Emitter {
}

export class BlameCompiler extends TypeScript.TypeScriptCompiler {
}

// This to ensure that the Parer Module is properly exported
export function version() {
    return "0.0.1";
}
