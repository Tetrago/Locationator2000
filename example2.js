const { load } = require('./document_loader');
const Quadtree = require('./quadtree');
const world_map = require('./world_map');

const qt = new Quadtree();
const wm = new world_map();

load('ufo_sightings.csv', (lat, lon) => {
    qt.insert(lat, lon, {});
    wm.insert("UFO", lat, lon);
}, () => {

    console.log(qt.findn(30, 30, 4));
    console.log(wm.search(4,0,0));
});