class Quadtree {
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
        return (lat > center.lat ? 2 : 1) + (lon > center.lon ? 8 : 4);
    }

    /**
     * Decodes a quadrant key into a direction vector
     */
    decodeQuadrant(key) {
        return { lat: key & 2 ? 1 : -1, lon: key & 8 ? 1 : -1 };
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

            node.children[quad] = { lat, lon, data, parent: node };
        }
        else if(child.hasOwnProperty("children")) {
            // There is a preexisting node

            this.insertRecursive(child, lat, lon, data);
        }
        else {
            // There is a preexisting datapoint

            // Make sure it's not the same point
            if(child.lat == lat && child.lon == lon) return;

            // Create a new children by shrinking the parent's extent
            let next = {
                children: {},
                parent: node,
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

    findNodeRecursive(node, lat, lon, minExtent=undefined) {
        // Make sure the position is not out of bounds
        if(Math.abs(lat) > this.root.extent.lat || Math.abs(lon) > this.root.extent.lon) return undefined;

        if(node === undefined) {
            // There is no preexisting element

            return undefined;
        }
        else if(node.hasOwnProperty("children")) {
            // There is a preexisting node

            if(minExtent !== undefined && node.extent.lat < minExtent.lat) return node;

            // Get the clostest one of the children
            return Object.values(node.children).map(it => this.findNodeRecursive(it, lat, lon, minExtent))
                .filter(it => it !== undefined)
                .sort((a, b) => this.distance(lat, lon, a.center.lat, a.center.lon) > this.distance(lat, lon, b.center.lat, b.center.lon))[0];
        }
        else {
            // There is a preexisting datapoint

            return node.parent;
        }
    }

    /**
     * Find all points under a given node except for a given branch
     */
    findAll(node, stack=[]) {
        if(node === undefined) {
            // There is no preexisting element

            return stack;
        }
        else if(node.hasOwnProperty("children")) {
            // There is a preexisting node

            Object.values(node.children).forEach(it => this.findAll(it, stack));
        }
        else {
            // There is a preexisting datapoint

            stack.push(node);
        }

        return stack;
    }

    /**
     * Creates a list of the closest elements to the given point
     */
    findn(lat, lon, n) {
        let node = this.findNodeRecursive(this.root, lat, lon);

        const findKey = node => Object.entries(node.parent.children).filter(([key, value]) => value == node)[0][0];

        while(node !== undefined) {
            const dir = this.decodeQuadrant(findKey(node));
            const internalNodes = Object.values(node.parent.children).filter(it => it != node);

            const externalNodes = [[dir.lat, dir.lon], [dir.lat, 0], [0, dir.lon], [dir.lat, -dir.lon], [-dir.lat, dir.lon]]
                .map(([dlat, dlon]) => [lat + dlat * node.extent.lat, lon + dlon * node.extent.lon])
                .map(([lat, lon]) => this.findNodeRecursive(this.root, lat, lon, node.extent))

            const points = Array.from(new Set(internalNodes.concat(externalNodes).concat(node)))
                .filter(it => it !== undefined)
                .map(it => this.findAll(it))
                .flat()
                .sort((a, b) => this.distance(lat, lon, a.lat, a.lon) > this.distance(lat, lon, b.lat, b.lon));

            if(points.length >= n) return points.slice(0, n);

            node = node.parent;
        }

        return [];
    }
}
