let map;
let layerControl;
let coords = {};
let last;
let settings = {};
let layers = [];

const coordsIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const lastIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const closestIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Object containing the adapters for each search method
let methods = [
    {
        name: "Quadtree",
        init: state => {
            state.map = new Quadtree();
        },
        insert: (state, lat, lon, label) => {
            state.map.insert(lat, lon, label);
        },
        find: (state, lat, lon, n) => {
            return state.map.findn(lat, lon, n).map(it => {
                it.name = it.data;
                return it;
            });
        },
        bench: (state, lat, lon, n, times) => {
            const start = window.performance.now();
            for(let i = 0; i < times; ++i) state.map.findn(lat, lon, n);
            const end = window.performance.now();

            document.getElementById("quadtree").innerText = `Quadtree: ${(end - start) / times} ms`;
        }
    },
    {
        name: "Geohash",
        init: state => {
            state.map = new world_map();
        },
        insert: (state, lat, lon, label) => {
            state.map.insert(label, lat, lon);
        },
        find: (state, lat, lon, n) => {
            return state.map.search(n, lat, lon).map(it => {
                it.lat = it.latitude;
                it.lon = it.longitude;
                return it;
            });
        },
        bench: (state, lat, lon, n, times) => {
            const start = window.performance.now();
            for(let i = 0; i < times; ++i) state.map.search(n, lat, lon);
            const end = window.performance.now();

            document.getElementById("geohash").innerText = `Geohash: ${(end - start) / times} ms`;
        }
    },
    {
        name: "Linear",
        init: state => {
            state.list = [];
        },
        insert: (state, lat, lon, label) => {
            if(!state.list.find(it => it.lat == lat && it.lon == lon)) {
                state.list.push({ lat, lon, name: label });
            }
        },
        find: (state, lat, lon, n) => {
            let items = state.list.slice(0, n).map(it => { return { dist: distance(lat, lon, it.lat, it.lon), item: it }; });

            state.list.forEach(it => {
                if(items.find(item => {
                    let dist = distance(lat, lon, it.lat, it.lon);
                    if(dist < item.dist) {
                        item.dist = dist;
                        item.item = it;
                        return true;
                    }

                    return false;
                })) {
                    items = items.sort((a, b) => distance(lat, lon, a.item.lat, a.item.lon) < distance(lat, lon, b.item.lat, b.item.lon));
                }
            });

            return items.map(it => it.item);
        },
        bench: (state, lat, lon, n, times) => {
            const start = window.performance.now();
            for(let i = 0; i < times; ++i) state.find(state, lat, lon, n);
            const end = window.performance.now();

            document.getElementById("linear").innerText = `Linear: ${(end - start) / times} ms`;
        }
    }
]

/**
 * Haversine distance formula
 * 
 * @returns Distance in kilometers
 */
function distance(lat1, lon1, lat2, lon2) {
    const d2 = deg => deg * (Math.PI / 180);

    return 2 * 6371 * Math.asin(Math.sqrt(
        Math.sin(d2(lat2 - lat1) / 2)**2 + Math.cos(d2(lat1)) * Math.cos(d2(lat2)) * Math.sin(d2(lon2 - lon1) / 2)**2
    ));
}

/**
 * Gets the datasets enabled by the user
 * 
 * @returns List of objects containing the dataset name and lexical label
 */
function getDatasets() {
    let datasets = [];
    let menu = document.getElementById("datasets").options;

    for(let i = 0; i < menu.length; ++i) {
        if(menu[i].selected) {
            datasets.push({ label: menu[i].innerText, dataset: menu[i].value });
        }
    }

    return datasets;
}

/**
 * Performs the searches and adds the markers to the map
 */
async function search() {
    // Place the last search marker (in case the user moves the coordinates)
    if(last !== undefined) map.removeLayer(last);
    last = L.marker([coords.lat, coords.lon], { icon: lastIcon }).addTo(map);

    // Remove existing map layers
    layers.forEach(it => {
        layerControl.removeLayer(it);
        map.removeLayer(it);
    });

    // Initialize (and clear existing) maps
    methods.forEach(it => it.init(it));

    // For each enabled dataset
    for({ label, dataset } of getDatasets()) {

        // Fetch the dataset points
        for await(const { lat, lon } of loadDataset(dataset)) {

            // Add points to each data structure
            methods.forEach(it => it.insert(it, lat, lon, label));
        }
    }

    // Add the necessary markers to the map
    methods.forEach(it => {
        let markers = [];
        let closest;

        it.find(it, coords.lat, coords.lon, 10)
            .sort((a, b) => distance(coords.lat, coords.lon, a.lat, a.lon) > distance(coords.lat, coords.lon, b.lat, b.lon))
            .forEach(point => {
            let marker;

            if(closest === undefined) {
                closest = marker = L.marker([point.lat, point.lon], { icon: closestIcon });
            }
            else {
                marker = L.marker([point.lat, point.lon]);
            }

            markers.push(marker.bindPopup(`${point.name}: ${distance(coords.lat, coords.lon, point.lat, point.lon).toFixed(2)} km`));
        });

        const layer = L.layerGroup(markers).addTo(map);
        layerControl.addOverlay(layer, it.name);
        layers.push(layer);
    });
}

/**
 * Performs benchmarks and updates the on-screen text
 */
async function benchmark() {
    let count = document.getElementById("count").value;
    let times = document.getElementById("times").value;

    if(isNaN(count) || isNaN(times)) {
        alert("Entered invalid number");
        return;
    }

    methods.forEach(it => it.init(it));

    for await(const { lat, lon } of loadDataset("ufo_sightings")) {
        methods.forEach(it => it.insert(it, lat, lon, "UFO"));
    }

    methods.forEach(it => it.bench(it, coords.lat, coords.lon, Number(count), Number(times)));
}

/**
 * One-time setup of the map
 */
function setup() {
    map = L.map("map").setView([0, 0], 5);
    layerControl = L.control.layers([], []).addTo(map);

    map.on("click", e => {
        moveTo(e.latlng.lat, e.latlng.lng);
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="http://openstreemap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

/**
 * Responsible for updating the map and marker position and internal coordinate storage when the user enters custom coordinates
 */
function onCoordsChanged() {
    if(isNaN(settings.lat.value) || isNaN(settings.lon.value)) {
        alert("Entered invalid coordinates");

        settings.lat.value = coords.lat;
        settings.lon.value = coords.lon;
    }
    else {
        moveTo(settings.lat.value, settings.lon.value);
    }
}

/**
 * Moves the map to the specified coordinates and updates the global stored coordinates;
 */
function moveTo(lat, lon) {
    settings.lat.value = lat;
    settings.lon.value = lon;

    coords.lat = lat;
    coords.lon = lon;
    
    if(settings.marker !== undefined) map.removeLayer(settings.marker);
    settings.marker = L.marker([lat, lon], { icon: coordsIcon }).addTo(map);

    map.flyTo([lat, lon]);
}

async function upload() {
    const file = document.getElementById("file").files[0];
    if(file === undefined) return;

    const name = prompt("Enter the dataset name");
    if(name.length == 0) return;

    uploadDataset(name, file);

    let opt = document.createElement("option");
    opt.value = name;
    opt.innerText = name;
    document.getElementById("datasets").appendChild(opt);
}

window.onload = () => {
    // Load the map
    setup();

    // Store the coordinate input fields and set the global state
    settings.lat = document.getElementById("lat");
    settings.lon = document.getElementById("lon");
    moveTo(0, 0);

    // Add the coordinate input listeners
    settings.lat.addEventListener("change", onCoordsChanged);
    settings.lon.addEventListener("change", onCoordsChanged);

    // Attempt to get the device's current location and update the map
    if("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
            moveTo(pos.coords.latitude, pos.coords.longitude);
            document.getElementById("alert").style.display = "none";
        }, () => {
            document.getElementById("alert").style.display = "none";
        });
    }
    else {
        document.getElementById("alert").style.display = "none";
    }

    // Add button click listeners
    document.getElementById("go").addEventListener("click", search);
    document.getElementById("upload").addEventListener("click", upload);
    document.getElementById("bench").addEventListener("click", benchmark);
}