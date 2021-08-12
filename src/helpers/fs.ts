import * as fs from "fs";

function dirExists(path: string): void {
    try {
        fs.mkdirSync(path);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
}

function removeDir(path: string) {
    try {
        fs.rmdirSync(path, { recursive: true });
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

function removeFile(path: string) {
    try {
        fs.unlinkSync(path);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

export { dirExists, removeDir, removeFile };
