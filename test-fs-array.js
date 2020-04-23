const {fsList} = require("./index.js");
const FsArray = require("./fs-array.js");
const mkdirp = require("mkdirp");
const fsp = require("fs").promises;
const path = require("path");

const fileContent = "A\nB\nC";
const testRoot = "d:\\temp\\fs-Array-Test";
const testFiles = ["a.txt", "b.txt", "c.txt"];

async function run() {
    await mkdirp(testRoot);
    for (let f of testFiles) {
        await fsp.writeFile(path.join(testRoot, f), fileContent);
    }
    let files = await fsList(testRoot, {types: "files"});
    console.log(files);
    
    let moveDest = path.join(testRoot, "sub-temp");
    
    await files.move(moveDest);
    files = await fsList(moveDest, {types: "files"});
    console.log(files);
    
    await files.copy(testRoot);
    let rootFiles = await fsList(testRoot, {types: "files"});
    await files.cleanup();
    await rootFiles.cleanup();
}

run().then(result => {
    console.log("Finished successfully.");
}).catch(err => {
    console.log(err);
});


/*

Problems found:

1. copy, move and delete all don't handle directories.  Not sure what they should do with directories.

*/