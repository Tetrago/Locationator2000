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

    findRecursive(node, lat, lon) {
        if(node === undefined) {
            // There is no preexisting element

            return undefined;
        }
        else if(node.hasOwnProperty("children")) {
            // There is a preexisting node

            // Get the clostest one of the children
            return ["TR", "TL", "BR", "BL"].map(key => this.findRecursive(node.children[key], lat, lon))
                .filter(it => it !== undefined)
                .sort((a, b) => this.distance(lat, lon, a.lat, a.lon) > this.distance(lat, lon, b.lat, b.lon))[0];
        }
        else {
            // There is a preexisting datapoint

            return node;
        }
    }

    /**
     * Find all points under a given node except for a given branch
     */
    findAll(stack, node) {
        if(node === undefined) {
            // There is no preexisting element

            return stack;
        }
        else if(node.hasOwnProperty("children")) {
            // There is a preexisting node

            return stack.concat(Object.values(node.children).map(it => this.findAll([], it)).flat());
        }
        else {
            // There is a preexisting datapoint

            return stack.concat([node]);
        }
    }

    /**
     * Creates a list of the closest elements to the given point
     */
    findn(lat, lon, n) {
        let stack = [];

        let pointer = this.findRecursive(this.root, lat, lon);
        stack.push(pointer);

        while(stack.length < n && pointer.parent !== undefined) {
            let points = Object.values(pointer.parent.children)
                .filter(it => it != pointer)
                .map(it => this.findAll([], it))
                .flat()
                .sort((a, b) => this.distance(lat, lon, a.lat, a.lon) > this.distance(lat, lon, b.lat, b.lon));
            
            pointer = pointer.parent;

            for(let i = 0; i < points.length; ++i) {
                if(stack.length == n) return stack;
                stack.push(points[i]);
            }
        }

        console.log(stack);
        return stack;
    }
}
