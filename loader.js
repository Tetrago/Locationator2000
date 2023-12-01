function parseFromUrl(url) {
    return new Promise((complete, error) => {
        Papa.parse(url, { download: true, complete, error });
    });
}

async function* loadFromUrl(url) {
    const results = await parseFromUrl(url);
    let headers = {};

    for(let i = 0; i < results.data.length; ++i) {
        const items = results.data[i];

        if(i === 0) {
            for(let j = 0; j < items.length; ++j) {
                if(items[j].includes("Latitude")) headers.lat = j;
                else if(items[j].includes("Longitude")) headers.lon = j;
            }
        }
        else if(i != results.data.length - 1) {
            const lat = Number(items[headers.lat]); 
            const lon = Number(items[headers.lon]); 

            if(lat !== NaN && lon !== NaN) {
                yield { lat, lon };
            }
        }
    }
}
