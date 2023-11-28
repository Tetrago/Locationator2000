const { load } = require('./document_loader');
const Quadtree = require('./quadtree');

const qt = new Quadtree();

load('ufo_sightings.csv', (lat, lon) => {
    qt.insert(lat, lon, {});
}, () => {
    console.log(qt.findn(30, 30, 4));
});