/** blend_mode 문자열 → ZWF §7 열거값 */
const BLEND_MODE: Readonly<Record<string, number>> = Object.freeze({
    "normal": 0,
    "layer": 1,
    "multiply": 2,
    "screen": 3,
    "lighten": 4,
    "darken": 5,
    "difference": 6,
    "invert": 7,
    "alpha": 8,
    "erase": 9,
    "overlay": 10,
    "hardlight": 11,
    "add": 12,
    "subtract": 13
});

/** filter.class → ZWF §7 filter_class */
const FILTER_CLASS: Readonly<Record<string, number>> = Object.freeze({
    "BevelFilter": 0,
    "BlurFilter": 1,
    "ColorMatrixFilter": 2,
    "ConvolutionFilter": 3,
    "DropShadowFilter": 4,
    "GlowFilter": 5,
    "GradientBevelFilter": 6,
    "GradientGlowFilter": 7,
    "DisplacementMapFilter": 8
});

export const blendModeToZwf = (name: string): number =>
    BLEND_MODE[name] ?? 0;

export const filterClassToZwf = (name: string): number =>
    FILTER_CLASS[name] ?? 0;
