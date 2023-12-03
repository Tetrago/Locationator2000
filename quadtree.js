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

    /**
     * Finds the nearest node to the coordinates (not point).
     * 
     * @param node Node to search from
     * @param lat  Target latitude
     * @param lon  Target longitude
     * @param minExtent Extent to stop searching at
     */
    findNodeRecursive(node, lat, lon, minExtent=undefined) {
        // Make sure the position is not out of bounds
        if(Math.abs(lat) > this.root.extent.lat || Math.abs(lon) > this.root.extent.lon) return undefined;

        if(node === undefined) {
            // There is no preexisting element

            return undefined;
        }
        else if(node.hasOwnProperty("children")) {
            // There is a preexisting node

            // If the next element is too small for our increasing area search, stop trying to find the next node
            if(minExtent !== undefined && node.extent.lat < minExtent.lat) return node;

            // Get the clostest one of the children
            return this.findNodeRecursive(node.children[this.findQuadrant(node.center, lat, lon)], lat, lon, minExtent);
        }
        else {
            // There is a preexisting datapoint

            return node.parent;
        }
    }

    /**
     * Find all points under a given node except for a given branch
     * 
     * @param node Node to search from
     * @param visted Set of visited nodes; used to prevent searching nodes that have already been searched
     * @param stack List to append to in the search
     */
    findAll(node, visited=new Set(), stack=[]) {
        if(node === undefined) {
            // There is no preexisting element

            return stack;
        }
        else if(node.hasOwnProperty("children")) {
            // There is a preexisting node

            Object.values(node.children).filter(it => !visited.has(it)).forEach(it => this.findAll(it, visited, stack));
        }
        else {
            // There is a preexisting datapoint

            stack.push(node);
        }

        return stack;
    }

    /**
     * Creates a list of the closest elements to the given point, in order of ascending distance
     * 
     * @param lat Target latitude
     * @param lon Target longitude
     * @param n Number of elements to find
     */
    findn(lat, lon, n) {
        // Find the closest node to our point
        let node = this.findNodeRecursive(this.root, lat, lon);

        // Function to find the key of the current node relative to its parent. Used to find relative direction from parent
        const findKey = node => Object.entries(node.parent.children).filter(([key, value]) => value == node)[0][0];

        // Since our search will expand if we don't find enough elements, we need to keep track of the nodes we have already searched
        let nodes = new Set();
        let stack = [];

        while(node !== undefined) {
            // Loop to keep widening the search until either we find all the requested points or we run out of points
            // The search radius is widened by replacing the focused node with its parent

            // The nodes within the same greater quadrant (the three immediate neighbors)
            const internalNodes = Object.values(node.parent.children).filter(it => it != node);

            // The vector direction of the focused node relative to its parent
            const dir = this.decodeQuadrant(findKey(node));

            // Find the closest nodes outside of the current quadrant using the direction vector and global find node searches
            // The depth of the nodes found will be limited to having the same extent (size) as the current focused node to prevent bad point weights (mentioned below)
            const externalNodes = [[dir.lat, dir.lon], [dir.lat, 0], [0, dir.lon], [dir.lat, -dir.lon], [-dir.lat, dir.lon]] // List of five possible external neighbors (opposite from the internal nodes) by direction vector
                .map(([dlat, dlon]) => [lat + dlat * node.extent.lat, lon + dlon * node.extent.lon]) // Finds the theoretical node coordinates using their direction vectors
                .map(([lat, lon]) => this.findNodeRecursive(this.root, lat, lon, node.extent)); // Find the closest node to the coordinates, but don't find any nodes smaller than the extent of the focused node

            // Remove any nodes we've already searched and add the ones we will
            const quadrants = internalNodes.concat(externalNodes).concat(node).filter(it => {
                if(it !== undefined && !nodes.has(it)) {
                    nodes.add(it);
                    return true;
                }

                return false;
            });
            
            // The maximum distance from the target coordinates that a node should be accepted
            // If we include a very large but mostly empty node, we don't want very far away points to count towards the number returned
            const maxDistance = this.distance(0, 0, node.extent.lat * 2, node.extent.lon * 2);

            // Get all points currently available
            const points = quadrants
                .map(it => this.findAll(it, nodes)) // Find all the points within a given node. The nodes set is passed as a visted set to prevent searching nodes multiple times
                .flat()
                .concat(stack); // Include the previous loop's results
            
            if(points.filter(it => this.distance(lat, lon, it.lat, it.lon) <= maxDistance).length >= n) {
                // If we've hit the number of points we need, sort and return
                return points.sort((a, b) => this.distance(lat, lon, a.lat, a.lon) > this.distance(lat, lon, b.lat, b.lon)).slice(0, n);
            }

            // Otherwise, store and continue
            stack = points;
            node = node.parent;
        }

        // If we didn't find all the elements that were requested, return what we have.
        return stack.sort((a, b) => this.distance(lat, lon, a.lat, a.lon) > this.distance(lat, lon, b.lat, b.lon));
    }
}
