const {fsList} = require("./index.js");
const fsp = require('fs').promises;
const path = require('path');

const testRoot = "test.~~~";
const testFiles = [
    {subDir: testRoot, files: [
        "aaa.txt1",
        "bbb.txt2",
        "ccc.txt3",
        {subDir: "subDir1", files: [
            "ddd.txt1",
            "eee.txt2",
            "fff.txt3"
        ]},
        {subDir: "subDir2", files: [
            "ggg.txt1",
            "hhh.txt2",
            "iii.txt3"
        ]},
        {subDir: "subDir3"}
     ]}
];

async function createTestStructure(list, base) {
    for (let item of list) {
        if (typeof item === "string") {
            // create file
            let filename = path.join(base, item);
            try {
                await fsp.writeFile(filename, "0123456789");
            } catch(e) {
                console.log(e);
                throw e;
            }
        } else if (typeof item === "object") {
            let newBase = path.join(base, item.subDir);
            await fsp.mkdir(newBase);
            if (item.files) {
                await createTestStructure(item.files, newBase);
            }
        }
    }
}

async function cleanupTestStructure(list, base) {
    for (let item of list) {
        if (typeof item === "string") {
            // create file
            let filename = path.join(base, item);
            try {
                await fsp.unlink(filename);
            } catch(e) {
                console.log(e);
                throw e;
            }
        } else if (typeof item === "object") {
            let newBase = path.join(base, item.subDir);
            if (item.files) {
                await cleanupTestStructure(item.files, newBase);
            }
            await fsp.rmdir(newBase);
        }
    }
}


let testDir = path.join(".", testRoot);

async function run() {

    await createTestStructure(testFiles, __dirname).then(() => {
        console.log("test files created.")
    }).catch(err => {
        console.log(err);
    });
    
    console.log("\nall files");
    await fsList(testDir, {
        resultType: "fullPath", recurse: true
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\nmatch: "TXT1", matchCaseInsensitive: true`);
    await fsList(testDir, {
        resultType: "fullPath", recurse: true, match: "TXT1", matchCaseInsensitive: true
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\nmatch: /^txt/`);
    await fsList(testDir, {
        resultType: "fullPath", recurse: true, match: /^txt/
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\nmatchWhat:"base", match:"fff"`);
    await fsList(testDir, {
        resultType: "fullPath", recurse: true, matchWhat: "base", match: "fff"
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\nmatchWhat:"file", match:"ggg.txt1"`);
    await fsList(testDir, {
        resultType: "fullPath", recurse: true, matchWhat: "file", match: "ggg.txt1"
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\nmatch: function() { base name is 3 bytes long and ext ends with "1"}`);
    await fsList(testDir, {
        resultType: "fullPath", recurse: true, match: (info) => {
            return info.basename.length === 3 && info.ext.endsWith("1");
        }
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });

    console.log(`\ntypes: "dirs"`);
    await fsList(testDir, {
        resultType: "fullPath", recurse: true, types: "dirs"
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\ntypes: "files"`);
    await fsList(testDir, {
        resultType: "fullPath", recurse: true, types: "files"
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\ntypes: "files", recurse function "subDir2"`);
    await fsList(testDir, {
        resultType: "fullPath", types: "files", recurse: (info) => {
            return info.filename.endsWith("2");
        }
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    console.log(`\ntypes: "files", skipTopLevelFiles: true, recurse function "subDir2"`);
    await fsList(testDir, {
        resultType: "fullPath", types: "files", skipTopLevelFiles: true, recurse: (info) => {
            return info.filename.endsWith("2");
        }
    }).then(results => {
       console.log(results);
    }).catch(err => {
        console.log(err);
    });
    
    await cleanupTestStructure(testFiles, __dirname);
    
}

run();

/* 
Comments:



*/