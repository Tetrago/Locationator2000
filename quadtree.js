'use strict';

module.exports = class Quadtree {
    constructor() {
        this.root = {
            // Table containing the four possible nodes: TR, TL, BR, and BL
            children: {},

            // The center point of the current node
            center: { lat: 0, lon: 0 },

            // The extent (distance from center on each axis to bounds on node)
            extent: { lat: 90, lon: 180 }
        };
    }

    /**
     * Finds the key of the next child based on the relative coordinates
     */
    findQuadrant(center, lat, lon) {
        return (lat > center.lat ? "T" : "B") + (lon > center.lon ? "R" : "L");
    }

    /**
     * Haversine distance formula
     */
    distance(lat1, lon1, lat2, lon2) {
        const d2 = deg => deg * (Math.PI / 180);

        return Math.asin(Math.sqrt(
            Math.sin(d2(lat2 - lat1) / 2)**2 + Math.cos(d2(lat1)) * Math.cos(d2(lat2)) * Math.sin(d2(lon2 - lon1) / 2)**2
        ));
    }

    insertRecursive(node, lat, lon, data) {
        // Find the next quadrant to move to
        let quad = this.findQuadrant(node.center, lat, lon);
        let child = node.children[quad];

        if(child === undefined) {
            // There is no preexisting element

            node.children[quad] = { lat, lon, data };
        }
        else if(child.hasOwnProperty("children")) {
            // There is a preexisting node

            this.insertRecursive(child, lat, lon, data);
        }
        else {
            // There is a preexisting datapoint

            // Create a new children by shrinking the parent's extent
            let next = {
                children: {},
                center: {
                    lat: node.center.lat + node.extent.lat * (lat > node.center.lat ? 0.5 : -0.5),
                    lon: node.center.lon + node.extent.lon * (lon > node.center.lon ? 0.5 : -0.5),
                },
                extent: {
                    lat: node.extent.lat / 2,
                    lon: node.extent.lon / 2
                }
            };

            // Insert the preexisting data into the new node
            this.insertRecursive(next, child.lat, child.lon, child.data);

            // Assign the new node
            node.children[quad] = next;

            // Continue the insertion within the new node
            this.insertRecursive(next, lat, lon, data);
        }
    }

    /**
     * Insert the given data at the specified latitude and longitude
     */
    insert(lat, lon, data) {
        this.insertRecursive(this.root, lat, lon, data);
    }

    /**
     * Weaves two iterators together by determining the next closest element between the two.
     */
    *weave(lat, lon, a, b) {
        let x = a.next();
        let y = b.next();

        if(!x.done && !y.done) {
            // If both generators still have values

            // Function to prepend a generate with their previous value
            const replace = function*(value, gen) {
                yield value;
                yield* gen;
            }

            if(this.distance(x.value.lat, x.value.lon, lat, lon) < this.distance(y.value.lat, y.value.lon, lat, lon)) {
                yield x.value;
                yield* this.weave(lat, lon, a, replace(y.value, b));
            }
            else {
                yield y.value;
                yield* this.weave(lat, lon, replace(x.value, a), b);
            }
        }
        else if(x.done && y.done) {
            // If both a and b are empty, end

            return;
        }
        else if(x.done) {
            // If a is empty, defer to b

            yield y.value;
            yield* b;
        }
        else if(y.done) {
            // If b is empty, defer to 

            yield x.value;
            yield* a;
        }
    }

    *findRecursive(node, lat, lon) {
        if(node === undefined) {
            // There is no preexisting element

            return;
        }
        else if(node.hasOwnProperty("children")) {
            // There is a preexisting node

            let nodes = ["TR", "TL", "BR", "BL"].map(key => this.findRecursive(node.children[key], lat, lon));
            yield* this.weave(lat, lon, this.weave(lat, lon, nodes[0], nodes[1]), this.weave(lat, lon, nodes[2], nodes[3]));
        }
        else {
            // There is a preexisting datapoint

            yield node;
        }
    }

    /**
     * Creates a generate of the closest elements to the given point
     */
    *find(lat, lon) {
        yield* this.findRecursive(this.root, lat, lon);
    }

    /**
     * Get the n closest datapoints to the given location
     */
    findn(lat, lon, n) {
        let items = [];
        let gen = this.find(lat, lon);

        for(let i = 0; i < n; ++i) {
            let val = gen.next();

            if(val.done) break;
            items.push(val.value);
        }

        return items;
    }
}
