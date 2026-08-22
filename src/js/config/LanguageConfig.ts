/**
 * @description 言語別のJSONの取得先URL
 *              URL to get JSON by language
 *
 * @type {string}
 * @constant
 */
/** ZUKBOX 자체 호스팅 — `public/language/*.json` (vite dev/build 공통) */
export const $LANGUAGE_URL: string = "/language";

/**
 * @description 変換対象のクラス名
 *              Class name to be converted
 *
 * @type {string}
 * @constant
 */
export const $LANGUAGE_ELEMENTS_CLASS_NAME: string = "language";

/**
 * @description Elementのdatasetにセットされた%sの値を分解するキーテキスト
 *              Key text to decompose the %s value set in the Element's dataset
 *
 * @type {string}
 * @constant
 */
export const $LANGUAGE_SPLIT_TEXT: string = "__@";