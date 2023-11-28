const fs = require('fs');
const readline = require('readline');

/**
 * @param file Filename from the current directory.
 * @param inserter Callback function that takes in the latitude and longitude of the point.
 * @param done Callback function that is invoked when the parsing is complete.
 */
function load(file, inserter, done) {
    const stream = fs.createReadStream(file);
    const rl = readline.createInterface({ input: stream });

    let headers = undefined;

    rl.on('line', line => {
        const items = line.split(',').map(it => it.replace(/"/g, ''));

        if(headers === undefined) {
            headers = {};

            for(let i = 0; i < items.length; ++i) {
                if(items[i].includes("Latitude")) headers.lat = i;
                else if(items[i].includes("Longitude")) headers.lon = i;
            }
        }
        else {
            inserter(Number(items[headers.lat]), Number(items[headers.lon]));
        }
    });

    rl.on('close', done);
}

module.exports = { load };