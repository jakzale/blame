// Type definitions for ansicolors
// Project: https://github.com/thlorenz/ansicolors
// Definitions by: rogierschouten <https://github.com/rogierschouten>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

interface IColor {
    (s: string): string;
}

interface IAnsiColors {
    white: IColor;
    black: IColor;
    blue: IColor;
    cyan: IColor;
    green: IColor;
    magenta: IColor;
    red: IColor;
    yellow: IColor;
    brightBlack: IColor;
    brightRed: IColor;
    brightGreen: IColor;
    brightYellow: IColor;
    brightBlue: IColor;
    brightMagenta: IColor;
    brightCyan: IColor;
    brightWhite: IColor;
    bgBlack: IColor;
    bgRed: IColor;
    bgGreen: IColor;
    bgYellow: IColor;
    bgBlue: IColor;
    bgMagenta: IColor;
    bgCyan: IColor;
    bgWhite: IColor;
    bgBrightBlack: IColor;
    bgBrightRed: IColor;
    bgBrightGreen: IColor;
    bgBrightYellow: IColor;
    bgBrightBlue: IColor;
    bgBrightMagenta: IColor;
    bgBrightCyan: IColor;
    bgBrightWhite: IColor;
}

declare module "ansicolors" {
    var colors: IAnsiColors;

	export = colors;
}
