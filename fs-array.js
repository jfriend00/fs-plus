const mkdirp = require('mkdirp');
const fsp = require('fs').promises;
const path = require('path');

function getFilePath(fsArrayItem) {
    if (typeof fsArrayItem === "string") {
        return fsArrayItem;
    } else if (typeof fsArrayItem === "object") {
        return fsArrayItem.fullPath;
    } else {
        throw new TypeError("Expecting array of strings or array of objects with .fullPath property");
    }
}

class FsArray extends Array {
    constructor(...args) {
        super(...args);
    }
    log() {
        for (const f of this) {
            console.log(f);
        }
    }
    
    // iterator that iterates just the fullPath filename, whether this is
    // an array of objects or an array of filenames
    // options:
    //    types: "files" | "both"
    fullPaths(opts = {}) {
        const options = Object.assign({types: "both"}, opts);
        let index = 0;
        return {
            [Symbol.iterator]: () => {
                return {
                    next: () => {
                        if (index >= this.length) {
                            return {done: true};
                        } else {
                            let fsArrayItem = this[index++];
                            if (options.types === "files") {
                                // check objects for the .type property === "dir"
                                while (typeof fsArrayItem === "object" && fsArrayItem.type === "dir") {
                                    if (index >= this.length) {
                                        return {done: true};
                                    }
                                    // get next item
                                    fsArrayItem = this[index++];
                                }
                            }
                            return {done: false, value: getFilePath(fsArrayItem)};
                        }
                    }
                };
            }
        };
    }
    
    // options takes:
    //     copyFlags (flags from fsPromises.copyFile())
    //     deleteCopiesUponFail: true | false     (defaults to true)
    // 
    // destDir will be created if it does not already exist
    // copy operation ignores directories
    async copy(destDir, opts = {}) {
        const options = Object.assign({deleteCopiesUponFail: true}, opts);
        const copiedFiles = new FsArray();
        await mkdirp(destDir);
        try {
            for (const fullPath of this.fullPaths({types: "files"})) {
                let destFile = path.join(destDir, path.basename(fullPath));
                await fsp.copyFile(fullPath, destFile);
                copiedFiles.push(destFile);
            }
        } catch(e) {
            if (options.deleteCopiesUponFail) {
                return copiedFiles.cleanup({outcome: e, stopOnError: false});
            }
            throw e;
        }
    }
    
    // move moves the list of files to the target directory
    //    It stops upon first error
    //    destDir will be created if it does not already exist
    async move(destDir) {
        await mkdirp(destDir);
        for (const fullPath of this.fullPaths({types: "files"})) {
            let destFile = path.join(destDir, path.basename(fullPath));
            await fsp.rename(fullPath, destFile);
        }
    }
    
    // cleanup deletes the list of files
    // options:
    //    outcome: "resolve" | "natural" | Error Object
    //        "resolve" means to always resolve, regardless of errors
    //        "natural" means to resolve/reject naturally based on errors (default)
    //        Error object means to reject with this error object when
    //             done, regardless of what happens in this function
    //             Used for cleanup operations, will delete as many
    //             files as it can.  Any undeleted files are added
    //             as a .undeleted array of files to the error object
    //    stopOnError: true | false  (default true)
    //        if set to false, then this deletes as many files as it can
    //        it saves the first error it got and rejects with that if outcome is "natural"
    async cleanup(opts = {}) {
        const options = Object.assign({stopOnError: true, outcome: "natural"}, opts);
        if (options.outcome instanceof Error) {
            options.err = options.outcome;
        }
        let firstErr;
        for (const fullPath of this.fullPaths()) {
            try {
                await fsp.unlink(fullPath);
            } catch(err) {
                if (options.stopOnError) {
                    if (options.outcome === "resolve") {
                        return;
                    } else if (options.err) {
                        throw options.err;
                    } else {
                        // must be "natural"
                        throw err;
                    }
                } else {
                    if (!firstErr) {
                        // save first error we got
                        firstErr = err;
                    }
                }
            }
        }
        // all done here, see what kind of outcome the caller wants
        if (options.err) {
            // reject with the passed in error
            throw options.err;
        } else if (options.outcome === "natural" && firstErr) {
            throw firstErr;
        }
        // here it was outcome:"natural" with no error or outcome:"resolve"
        // either way, we resolve
        return;
    }
}

module.exports = FsArray;