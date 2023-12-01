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

class world_map {
    constructor() {
        this.map = new Map();
        this.arrK = [];
    };

    test(){
        return "test";
    };

    insert(name,lat,lon){
        // insertedArr = [name, latitude, longitude]
        let tempObj = new Obj(lon,lat,name);
        var latitude = lat;
        var longitude = lon;
        var latMap = Math.floor(latitude/10)*10;
        var longMap = Math.floor(longitude/10)*10;
    
        //edge cases
        if(longMap === 180){
            longMap = 170;
        } 
        if(longitude === -180){
            longMap = 170;
        }
        if(latMap === -90){
            latMap = -80;
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
        var R = 6371;
        var dLat = this.degtorad(lat2-lat1);
        var dLon = this.degtorad(long2-long1); 
        var a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(this.degtorad(lat1)) * Math.cos(this.degtorad(lat2)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2)
          ; 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c;
        return d;
    };
    degtorad(deg) {
        return deg * (Math.PI/180)
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
                
                if(this.arrK.length < K){
                    //console.log("PUSHED");
                    this.arrK.push(tempObj);
                    if(this.arrK.length === K){
                        //sort by distance
                        this.arrK.sort((a,b) => {
                            return a.distance - b.distance;
                        })
                    }
                }
                else{
                    if(this.arrK[K-1].distance < tempObj.distance){
                        this.arrK[K-1] = tempObj;
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
        let tempLong = Math.floor(long/10)*10;
        let tempLat = Math.floor(lat/10)*10;
        let userGridPoint = new Point(tempLong, tempLat);

        this.searchhelper(K,userGridPoint,userPoint);

        this.radialhelper(K,1,userGridPoint,userPoint);
        //console.log("Radialhelper success");
        
        if(this.arrK.length < K){
            this.radialhelper(K, 2, userGridPoint,userPoint);
        }

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
        //calculate corners
        var x = userGridPoint.long;
        var y = userGridPoint.lat;

        let left = x-(r*10);
        let right = x+(r*10);
        let top = y + (r*10);
        let bottom = y - (r*10);

        //console.log(left + " " + right);
        //console.log(top + " " + bottom);



        //edge cases
        if(x-(r*10) < -180){
            left = 170;
        }
        if(x+(r*10) > 180){
            right = -180;
        }
        if(y-(r*10) < -90){
            bottom = -80;
        }
        if(y+(r*10) > 90){
            top = 90;
        }

        
    
        //iterating clockwise
        let xitr = left - 10;
        let yitr = top;
        
        while(xitr != right){
            xitr = xitr + 10;
            let temp = new Point(xitr,top);
            this.searchhelper(K,temp,userPoint);
        }
    
        while(yitr != bottom){
            yitr = yitr - 10;
            let temp = new Point(right,yitr);
            this.searchhelper(K,temp,userPoint);
        }

        xitr = right + 10;
        while(xitr != left){
            xitr = xitr - 10;
            let temp = new Point(xitr,bottom);
            this.searchhelper(K,temp,userPoint);
        }

        yitr = bottom- 10;
        while (yitr != top - 10){
            yitr = yitr + 10;
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
