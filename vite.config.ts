/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    "server": {
        "open": "index.html",
        "fs": {
            // @next2d/* はfile:参照でリポジトリ外を指すため、読み込みを許可する
            "allow": [
                path.resolve(process.cwd()),
                path.resolve(process.cwd(), "../player"),
                path.resolve(process.cwd(), "../runtime")
            ]
        }
    },
    "build": {
        "outDir": "docs",
        "target": "esnext",
        "modulePreload": {
            "polyfill": false
        },
        "chunkSizeWarningLimit": 2048, // チャンクサイズの警告を1MBに設定
        "rollupOptions": { //ファイル出力設定
            "output": {
                "assetFileNames": (assetInfo) =>
                {
                    let extType: string = assetInfo?.name?.split(".")[1] as string;

                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
                        extType = "img";
                    }

                    if (extType === "css") {
                        return "assets/css/style.css";
                    }

                    return `assets/${extType}/[name][extname]`;
                },
                "chunkFileNames": "assets/js/[name].js",
                "entryFileNames": "assets/js/zukbox.js"
            }
        }
    },
    "resolve": {
        "alias": {
            "@": path.resolve(process.cwd(), "./src/js"),
            "@zukbox/runtime": path.resolve(process.cwd(), "../runtime/js/zwf-loader.mjs"),
            "@zukbox/runtime/player": path.resolve(process.cwd(), "../runtime/js/zwf-player.mjs"),
            "@next2d-core-internal": path.resolve(process.cwd(), "../player/packages/core/src")
        }
    },
    "test": {
        "globals": true,
        "environment": "jsdom",
        "setupFiles": [
            "test.setup.ts",
            "vitest-webgl-canvas-mock"
        ],
        "pool": "threads",
        "include": ["src/**/*.test.ts"]
    }
});