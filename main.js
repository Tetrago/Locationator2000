let map;
let layerControl;
let coords = {};
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
        bench: (state, lat, lon, n) => {
            const start = Date.now();
            state.map.findn(lat, lon, n);
            const end = Date.now();

            document.getElementById("quadtree").innerText = `Quadtree: ${(end - start) / n} ms`;
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
        bench: (state, lat, lon, n) => {
            const start = Date.now();
            state.map.search(n, lat, lon);
            const end = Date.now();

            document.getElementById("geohash").innerText = `Geohash: ${(end - start) / n} ms`;
        }
    },
    {
        name: "Linear",
        distance: (lat1, lon1, lat2, lon2) => {
            const d2 = deg => deg * (Math.PI / 180);

            return Math.asin(Math.sqrt(
                Math.sin(d2(lat2 - lat1) / 2)**2 + Math.cos(d2(lat1)) * Math.cos(d2(lat2)) * Math.sin(d2(lon2 - lon1) / 2)**2
            ));
        },
        init: state => {
            state.list = [];
        },
        insert: (state, lat, lon, label) => {
            if(!state.list.find(it => it.lat == lat && it.lon == lon)) {
                state.list.push({ lat, lon, name: label });
            }
        },
        find: (state, lat, lon, n) => {
            let items = state.list.slice(0, n).map(it => { return { dist: state.distance(lat, lon, it.lat, it.lon), item: it }; });

            state.list.forEach(it => {
                items.find(item => {
                    let distance = state.distance(lat, lon, it.lat, it.lon);
                    if(distance < item.dist) {
                        item.dist = distance;
                        item.item = it;
                        return true;
                    }

                    return false;
                });
            });

            return items.map(it => it.item);
        },
        bench: (state, lat, lon, n) => {
            const start = Date.now();
            state.find(state, lat, lon, n);
            const end = Date.now();

            document.getElementById("linear").innerText = `Linear: ${(end - start) / n} ms`;
        }
    }
]

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

async function search() {
    layers.forEach(it => {
        layerControl.removeLayer(it);
        map.removeLayer(it);
    });

    methods.forEach(it => it.init(it));

    for({ label, dataset } of getDatasets()) {
        for await(const { lat, lon } of loadDataset(dataset)) {
            methods.forEach(it => it.insert(it, lat, lon, label));
        }
    }

    methods.forEach(it => {
        let markers = [];

        it.find(it, coords.lat, coords.lon, 10).forEach(point => {
            markers.push(L.marker([point.lat, point.lon]).bindPopup(point.name));
        });

        const layer = L.layerGroup(markers).addTo(map);
        layerControl.addOverlay(layer, it.name);
        layers.push(layer);
    });
}

async function benchmark() {
    let count = document.getElementById("count").value;
    if(isNaN(count)) {
        alert("Entered invalid number");
        return;
    }

    methods.forEach(it => it.init(it));

    for await(const { lat, lon } of loadDataset("ufo_sightings")) {
        methods.forEach(it => it.insert(it, lat, lon, "UFO"));
    }

    methods.forEach(it => it.bench(it, coords.lat, coords.lon, Number(count)));
}

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

function moveTo(lat, lon) {
    settings.lat.value = lat;
    settings.lon.value = lon;

    coords.lat = lat;
    coords.lon = lon;
    
    if(settings.marker !== undefined) map.removeLayer(settings.marker);
    settings.marker = L.marker([lat, lon], { icon: coordsIcon }).addTo(map);

    map.flyTo([lat, lon]);
}

window.onload = () => {
    setup();

    settings.lat = document.getElementById("lat");
    settings.lon = document.getElementById("lon");
    moveTo(0, 0);

    settings.lat.addEventListener("change", onCoordsChanged);
    settings.lon.addEventListener("change", onCoordsChanged);

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

    document.getElementById("go").addEventListener("click", search);
    document.getElementById("bench").addEventListener("click", benchmark);
}