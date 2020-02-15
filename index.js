/*
Requires node v10.0+  (fs.promises interface)
listFiles(dir, opts = {})
options interface:

   matchWhat: "ext"|"base"|"file" (defaults to "ext")
       "ext" means you're matching file extensions (without leading ".")  such as "jpeg"
       "base" means you're matching the base filename without the extension and without the path such as "results"
       "file" means you're matching the base filename and extension  such as "results.jpeg"
   match: string|regex|function
        string means you're looking for an exact match with matchWhat setting
        regex is a regex that will be applied to the matchWhat setting
        function is a custom callback function - callback({filename, basename, ext, fullPath, type})
            return true to include in results
            return false to exclude from results
            can return a promise that will be awaited to resolve to true|false
            promise rejecting aborts the whole process
   matchCaseInsensitive: true|false (defaults to true)
        Only applies when match is a string
   
   recurse: true|false|function   (defaults to false)
       true is recurse into sub-directories
       false is no recurse
       function is to call this function on each sub-directory
           return true = recurse into this sub-directory
           return false = don't recurse into this sub-directory
           callback({filename, basename, ext, fullPath, type})
           can return a promise that will be awaited to resolve to true|false
           promise rejecting aborts the whole process
   
   types: "files"|"dirs"|"both"   (defaults to "both")
       files is return only files (skip directories)
       dirs is return only directories (skip files)
       both is to return both files and directories
   
   resultType: "object"|"fullPath"   (defaults to "object")
       object is array of {filename, basename, ext, fullPath, type} objects
       fulLPath is array of fullPath strings
       
   skipTopLevelFiles: true|false    (defaults to false)
       only process directories on the top level, skip top level files
       
   If you just call listFiles(someDir) with no options, it just gets you 
   and array of all the files and directories in object form: {filename, basename, ext, fullPath, type}
   
   You add match options to limit what it returns
   You add the type option to limit it to only files or directories

*/

const fsp = require('fs').promises;
const path = require('path');

// internal function we call for recursion that doesn't have to do some default setup
async function list(dir, options) {

    // collect sub-directories for possible recursion
    const dirs = [];

    const files = await fsp.readdir(dir, {withFileTypes: true});
    for (const dirEnt of files) {
        const filename = dirEnt.name;
        const fullPath = path.join(dir, filename);
        const ext = path.extname(filename).slice(1);                  // file extension without leading "."
        let basename = filename;
        if (ext.length) {
            basename = filename.slice(0, -(ext.length + 1));          // get part without the extension
        }

        // put all this in an object for later use
        const obj = {filename, basename, ext, fullPath};

        // get type of entry
        let type = "<unknown>";
        if (dirEnt.isFile()) {
            type = "file";
        } else if (dirEnt.isDirectory()) {
            type = "dir";
            dirs.push(obj);             // save dir for recursion option
        }
        obj.type = type;

        // see if we should skip top level files
        if (options.skipTopLevelFiles && type === "file") {
            continue;
        }

        // if set to "files" or "dirs", skip any entries that don't match
        if (options.types === "files") {
            if (type !== "file") {
                // not a file, skip it
                continue;
            }
        } else if (options.types === "dirs") {
            if (type !== "dir") {
                // not a directory, skip it
                continue;
            }
        }

        // if doing matching
        if (options.match) {
            let target;
            if (options.matchWhat === "ext") {
                target = ext;
            } else if (options.matchWhat === "base") {
                target = basename;
            } else if (options.matchWhat === "file") {
                target = filename;
            } else {
                throw new Error(`options.matchWhat contains invalid value "${options.matchWhat}", should be "ext", "base" or "file"`);
            }
            switch (typeof options.match) {
                case "string":
                    // require exact match to target, skip if no match
                    if (options.matchCaseInsensitive) {
                        target = target.toLowerCase();
                    }
                    if (options.match !== target) continue;
                    break;
                case "object":
                    // compare with regex, skip if no match
                    if (!options.match.test(target)) continue;
                    break;
                case "function":
                    // custom filter function, if doesn't return true, skip this item
                    if (!await options.match(obj)) continue;
                    break;
                default:
                    throw new TypeError(`options.match contains invalid value, should be a string, regex or function`);
            }
        }

        // passed all the tests, add the summary object to the results
        if (options.resultType === "object") {
            options.results.push(obj);
        } else {
            options.results.push(fullPath);
        }

    }
    if (options.recurse) {
        options.skipTopLevelFiles = false;        // turn this off for recursion
        for (const d of dirs) {
            let include = true;
            if (typeof options.recurse === "function") {
                include = await options.recurse(d);
            }
            if (include) {
                await list(d.fullPath, options);
            }
        }
    }
    return options.results;
}

// Idea: maybe offer an async iterator, but maybe don't really need it

function listFiles(dir, opts = {}) {
    // initialization here that does not need to be done on recursive calls
    
    // make copy of options object and initialize defaults
    // we put results array in the options so it can be passed into the recursive calls and
    //    they can just add to the same array rather than having to merge arrays
    let defaults = {
        matchWhat: "ext", 
        types: "both", 
        resultType: "object", 
        results: []
    };
    if (typeof opts.match === "string") {
        defaults.matchCaseInsensitive = true;
    } else {
        if (opts.matchCaseInsensitive) {
            throw new TypeError("options.matchCaseInsensitive can only be specified when options.match is a string");
        }
    }
    const options = Object.assign(defaults, opts);
    
    if (typeof options.match === "object" && !(options.match instanceof RegExp)) {
        throw new TypeError("If options.match is an object it must be a RegExp object");
    }

    if (options.matchCaseInsensitive) {
        options.match = options.match.toLowerCase();
    }

    // force dir to be absolute path
    let src = dir;
    if (!path.isAbsolute(src)) {
        src = path.resolve(src);
    }
    return list(src, options);
}

module.exports = listFiles;


