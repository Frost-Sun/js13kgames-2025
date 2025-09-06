// Base code from: https://github.com/sz-piotr/js13k-webpack-starter/blob/master/postbuild.js
// Added advzip

/* eslint-disable no-undef */

import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";

let output = fs.createWriteStream("./build.zip");
let archive = archiver("zip", {
    zlib: { level: 9 }, // set compression to best
});

const MAX = 13 * 1024; // 13kb

output.on("close", async function () {
    // Run advzip for maximum compression
    const { exec } = await import("node:child_process");
    exec("advzip -z -4 -i 100 build.zip", (err, stdout, stderr) => {
        if (err) {
            console.error("advzip error:", err);
        } else {
            console.log("advzip output:", stdout || stderr);
            // Get the final size after advzip
            const bytes = fs.statSync("build.zip").size;
            const percent = ((bytes / MAX) * 100).toFixed(2);
            if (bytes > MAX) {
                console.error(`Size overflow: ${bytes} bytes (${percent}%)`);
            } else {
                console.log(`Size: ${bytes} bytes (${percent}%)`);
            }
        }
    });
});

archive.on("warning", function (err) {
    if (err.code === "ENOENT") {
        console.warn(err);
    } else {
        throw err;
    }
});
archive.on("error", function (err) {
    throw err;
});
archive.pipe(output);

fs.readdirSync("dist", { recursive: true, withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .map((f) => path.join(f.path, f.name))
    .forEach((path) => {
        archive.append(fs.createReadStream(path), {
            name: path.replace(/dist(\\|\/)/, ""),
        });
    });

archive.finalize();
