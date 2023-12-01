
class Point {
    constructor(long,lat){
        this.long = long;
        this.lat = lat;
    }
    toKey(){
        return "" + this.long + "" + this.lat;
    }
}

class Obj{
    constructor(long,lat,name){
        this.longitude = long;
        this.latitude = lat;
        this.name = name;
        this.distance = -1;
    }

}

module.exports = class world_map {
    constructor() {
        this.map = new Map();
        this.arrK = [];
        this.scale = 10;
    };

    test(){
        return "test";
    };

    insert(name,lat,lon){
        // insertedArr = [name, latitude, longitude]
        let tempObj = new Obj(lon,lat,name);
        var latitude = lat;
        var longitude = lon;
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
        
        if(!this.map.has(key)){
            this.map.set(key, [tempObj]);
        }
        else{
            this.map.get(key).push(tempObj);
        }
        
    };

    distancebetweentwocoords(lat1, long1, lat2, long2){
        const d2 = deg => deg * (Math.PI / 180);

        return Math.asin(Math.sqrt(
            Math.sin(d2(lat2 - lat1) / 2)**2 + Math.cos(d2(lat1)) * Math.cos(d2(lat2)) * Math.sin(d2(long2 - long1) / 2)**2
        ));
    };


    searchhelper(K, userGridPoint, userPoint){
        
        let tempKey = userGridPoint.toKey();
        //console.log(tempKey);

        if(this.map.has(tempKey)){
            //console.log(this.map.get(tempKey).length);
            for(var i = 0; i < this.map.get(tempKey).length; ++i){
                let tempObj = this.map.get(tempKey).at(i);
                //console.log(tempObj);
                //console.log(userPoint.lat);
                tempObj.distance = this.distancebetweentwocoords(userPoint.lat,userPoint.long,tempObj.latitude, tempObj.longitude);
                console.log("attempt check");

                if(this.arrK.length < K){
                    //console.log("PUSHED");
                    this.arrK.push(tempObj);
                    //console.log("inserted: (" + tempObj.longitude + " , " + tempObj.latitude + ")");
                    if(this.arrK.length === K){
                        //sort by distance
                        this.arrK.sort((a,b) => {
                            return a.distance - b.distance;
                        })
                    }
                }
                else{
                    if(this.arrK[K-1].distance < tempObj.distance){
                        //console.log("replaced (" + this.arrK[K-1].longitude + " , " + this.arrK[K-1].latitude + ") with (" + tempObj.longitude + " , " + tempObj.latitude + ")");
                        this.arrK[K-1] = tempObj;
                        //console.log("replaced with: (" + tempObj.longitude + " , " + tempObj.latitude + ")");
                        //sort by distance
                        this.arrK.sort((a,b) => {
                            return a.distance - b.distance;
                        })
                    }
                    }
                }
            }
            
            //return arrK;
    };

    search(K, lat, long){
        
        let userPoint = new Point(long,lat);
        let tempLong = Math.floor(long/this.scale)*this.scale;
        let tempLat = Math.floor(lat/this.scale)*this.scale;
        let userGridPoint = new Point(tempLong, tempLat);

        this.searchhelper(K,userGridPoint,userPoint);

        for(let tempitr of this.arrK){
            console.log(tempitr.latitude + " " + tempitr.longitude);
        }
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
        for(let temp of this.arrK){
            console.log(temp.distance);
        }
        return arr;
    };

    radialhelper(K, r, userGridPoint, userPoint){
        //calculate corners
        var x = userGridPoint.long;
        var y = userGridPoint.lat;

        let left = x-(r*this.scale);
        let right = x+(r*this.scale);
        let top = y + (r*this.scale);
        let bottom = y - (r*this.scale);

        //console.log(left + " " + right);
        //console.log(top + " " + bottom);



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
        //console.log(this.arrK.length);

        //recursive K check
        if(this.arrK.length < K){
            r = r + 1;
            this.radialhelper(K,r,userGridPoint,userGridPoint);
        }
        
        return this.arrK;
    };
}
