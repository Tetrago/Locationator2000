
class Point { //helper object class
    constructor(long,lat){
        this.long = long;
        this.lat = lat;
    }
    toKey(){
        return "" + this.long + "" + this.lat;
    }
}

class Obj{ //helper object class
    constructor(long,lat,name){
        this.longitude = long;
        this.latitude = lat;
        this.name = name;
        this.distance = -1;
    }
    
    static fromKey(key){
        let str = "" + key;
        let temp = str.split(',');
        return new Obj(temp[0],temp[1],temp[2]);
    }

    toKey(){
        return "" + this.longitude + "," + this.latitude + "," + this.name;
    }

}

class world_map {
    constructor() {
        this.map = new Map();
        this.arrK = [];
        this.scale = 1; //scale is an option for the developer, it sets the boundaries of the values for the map. Minimum value is 0.2, any smaller and functionality is not guarenteed
        this.size = 0;
    };

    insert(name,lat,lon){
        let tempObj = new Obj(lon,lat,name);
        var latitude = lat;
        var longitude = lon;

        //function to determine where to place the value in the map
        var latMap = Math.floor(latitude/this.scale)*this.scale;
        var longMap = Math.floor(longitude/this.scale)*this.scale;
    
        //edge cases
        if(longMap === 180){
            longMap = 180 - this.scale;
        } 
        if(longitude === -180){
            longMap = 180 - this.scale;
        }
        if(latMap === -90){
            latMap = -90 + this.scale;
        }
        
        let mapPoint = new Point(longMap,latMap);
        let key = mapPoint.toKey();
        //instead of storing the objects, it stores strings that can be converted back into the objects
        let objkey = tempObj.toKey();
        if(!this.map.has(key)){
            //sets are used to remove duplicate values
            let set = new Set();
            set.add(objkey);
            this.map.set(key, set);
            this.size++;
        }
        else{
            this.map.get(key).add(objkey);
            this.size++;
        }
    };

    distancebetweentwocoords(lat1, long1, lat2, long2){ //Haversine Distance Formula
        const d2 = deg => deg * (Math.PI / 180);
        return Math.asin(Math.sqrt(
            Math.sin(d2(lat2 - lat1) / 2)**2 + Math.cos(d2(lat1)) * Math.cos(d2(lat2)) * Math.sin(d2(long2 - long1) / 2)**2
        ));
    };


    searchhelper(K, userGridPoint, userPoint){ //searches the set that that the gridpoint points to
        let tempKey = userGridPoint.toKey();
        if(this.map.has(tempKey)){
            for(const objString of this.map.get(tempKey)){
                let tempObj = Obj.fromKey(objString); //creates object from the stored string
                tempObj.distance = this.distancebetweentwocoords(userPoint.lat,userPoint.long,tempObj.latitude, tempObj.longitude);
                if(this.arrK.length < K){
                    this.arrK.push(tempObj);
                    if(this.arrK.length === K){
                        //sort by distance, a value within the object
                        this.arrK.sort((a,b) => {
                            return a.distance - b.distance;
                        })
                    }
                }
                else{
                    if(this.arrK[K-1].distance > tempObj.distance){ //replaces last object (last object is the furthest away)
                        this.arrK[K-1] = tempObj;
                        //sort by distance, a value within the object
                        this.arrK.sort((a,b) => {
                            return a.distance - b.distance;
                        })
                    }
                }
            }
        }
    };

    search(K, lat, long){
        if(this.size < K){
            //error, not enough elements to insert, returns nothing
            return [];
        }
        if(this.size < 1){
            //error, no locations inserted
            return [];
        }
        
        let userPoint = new Point(long,lat);
        let tempLong = Math.floor(long/this.scale)*this.scale;
        let tempLat = Math.floor(lat/this.scale)*this.scale;
        let userGridPoint = new Point(tempLong, tempLat);

        //searches initial grid point
        this.searchhelper(K,userGridPoint,userPoint);
        //searches neighboring squares and recursively calls itself when arrK is not of size K
        this.radialhelper(K,1,userGridPoint,userPoint);

        //reconstruct arrK to be useful to example.js
        let arr = [];
        for(let i = 0; i < K; i++){
            arr[i] = {
                name: this.arrK[i].name,
                longitude: this.arrK[i].longitude,
                latitude: this.arrK[i].latitude,
            };
        }
        return arr;
    };

    radialhelper(K, r, userGridPoint, userPoint){
        //calculate boundaries
        var x = userGridPoint.long;
        var y = userGridPoint.lat;
        let left = x-(r*this.scale);
        let right = x+(r*this.scale);
        let top = y + (r*this.scale);
        let bottom = y - (r*this.scale);

        //edge cases
        if(x-(r*this.scale) < -180){
            left = 180 - this.scale;
        }
        if(x+(r*this.scale) > 180){
            right = -180;
        }
        if(y-(r*this.scale) < -90){
            bottom = -90 + this.scale;
        }
        if(y+(r*this.scale) > 90){
            top = 90 - this.scale;
        }
    
        //iterating clockwise
        let xitr = left - this.scale;
        let yitr = top;
        while(xitr != right){
            xitr = xitr + this.scale;
            let temp = new Point(xitr,top);
            this.searchhelper(K,temp,userPoint);
        }
        while(yitr != bottom){
            yitr = yitr - this.scale;
            let temp = new Point(right,yitr);
            this.searchhelper(K,temp,userPoint);
        }
        xitr = right + this.scale;
        while(xitr != left){
            xitr = xitr - this.scale;
            let temp = new Point(xitr,bottom);
            this.searchhelper(K,temp,userPoint);
        }
        yitr = bottom - this.scale;
        while (yitr != top - this.scale){
            yitr = yitr + this.scale;
            let temp = new Point(left, yitr);
            this.searchhelper(K,temp,userPoint);
        }
        
        //recursive call when arrK is less than K, increases search radius by 1
        if(this.arrK.length < K){
            r = r + 1;
            this.radialhelper(K,r,userGridPoint,userGridPoint);
        }
    };
}
