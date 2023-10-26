const fs = require("fs");
const Papa = require('./papaparse.min.js')
/*
This files uses papaparse
All credit goes to the people at papaparse.com
The file papaparse.min.js belongs to papaparse.
*/

/*
This file will acts as a link between the frontend and the datastructures.
It will input an array of settings, names and files.

The array needs to be formatted as such:
array = [type, name1, file1, name2, file2, name3, file3, ... , nameN, fileN];
Type will be the type of datastructure used.
name is the name of the object in the file, for example, UFOs in the ufo_sightings.csv files.
file is the file location of the csv

This can be done with up to N files

The size of the array should be 2N + 1
*/


let type = "hashmap"
//const files = [type, namedata1, string data file1, namedata2, string data file2...]
const files = [type, 'UFO Sighting', 'ufo_sightings.csv', 'Wind Turbines', 'wind_turbines.csv']
let run = loadDoc(files);


function loadDoc(dataFiles){
    let i = 1;
    while(i < dataFiles.length){
        const tempName = dataFiles[i];
        const tempfile = dataFiles[i+1];
        const tempType = dataFiles[0];
        
        Papa.parse(fs.createReadStream("./" + tempfile),{
            complete: function(results){
                let j = 0;
                let longitudeColumn = -1;
                let latitudeColumn = -1;
                let headers = results.data[0];
                while (j < headers.length){
                    //code to find the words longitude and latitude
                    let text = headers[j];
                    if(text.includes("longitude") || text.includes("Longitude")){
                        longitudeColumn = j;
                    }
                    else if(text.includes("latitude") || text.includes("Latitude")){
                        latitudeColumn = j;
                    }
                    j = j +1;
                }
                if(longitudeColumn > -1 && latitudeColumn > -1){
                    let k = 1;
                    while(k < results.data.length){
                        let tempArr = results.data[k];
                        let tempLat = tempArr[latitudeColumn];
                        let tempLong = tempArr[longitudeColumn];
                        let tempArr2 = [tempType, tempName, tempLat, tempLong];
                        insert(tempArr2);
                        k = k + 1;
                    }
                }
                else{
                    console.log("File: " + tempfile + " does not contain longitude and/or latitude headers");
                }
            }
        });
        i = i + 2;
        
    }
    return true;
}

function insert(insertedArr){
    /*
    Inserted Array Format:
                   0     1     2         3
    insertedArr = [type, name, latitude, longitude]
    type is the type of datastructure we want to insert it in
    name is the name of the object, for example, UFO
    latitude and longitude are numbers that can be passed through as coordinates, as of now, they are seperate variables

    All arrays will be inserted in this format
    */
    if(type == 'hashmap'){
        console.log("Inserting into hashmap");

        return true;
    }
    else if (type == 'quadtree'){
        console.log("Inserting into quadtree");

        return true;
    }
    else{
        console.log("Error : Invalid Type");
        return false;
    }


}
