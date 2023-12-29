const attr_osm = 'Map data &copy; <a href="http://openstreetmap.org/">OpenStreetMap</a> contributors';
const attr_overpass = 'POI via <a href="http://www.overpass-api.de/">Overpass API</a>';
const all_data = `
[out:json][timeout:25];
nwr[\"type\"=\"route\"][\"route\"=\"bus\"][\"operator\"~\"mobus\"];
out;`;
const query_meta = `
[out:json][timeout:25];
nwr[\"type\"=\"route\"][\"route\"=\"bus\"][\"operator\"~\"mobus\"];
out tags;`;
const overpassUrl = 'https://overpass-api.de/api/interpreter';
const sideMenuElement = "<a href=\"?osmid=OSMID\"><h4>Bus BUSREF (OPERATOR)</h4>BUSNAME</a>";


async function getBusMeta() {
    const busarray = []
    const apiUrl = `${overpassUrl}?data=${encodeURIComponent(query_meta)}`;
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        var div_content = ""
        for (let i of data["elements"]) {
            busarray.push({"lol": "test", "data": i});
            var tmp = sideMenuElement.replace("OSMID", i["id"]).replace("BUSREF", i["tags"]["ref"]).replace("OPERATOR", i["tags"]["operator"]).replace("BUSNAME", i["tags"]["name"]);
            div_content += tmp;
        }
        document.getElementById("side-menu-bus-routes").innerHTML = div_content
    })
    .catch(error => {
        console.error('Fehler beim Abrufen der Overpass API-Daten:', error);
    });
}

function createSideMenu() {
    getBusMeta()
}

function createMap() {
    const urlParams = new URLSearchParams(window.location.search);
    const myParam = urlParams.get('osmid');
    if (myParam) {
        console.log(myParam)
    };
    var map = L.map('map');
    map.setView([52.5326, 13.8347], 11);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: [attr_osm, attr_overpass].join(', ')
    }).addTo(map);
}

createMap();
createSideMenu();