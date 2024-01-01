// debugging and developing options
const executeNewCode = true; // only used while developing (should only be true in commits)

// leaflet map layer stuff
const attr_osm = 'Map data &copy; <a href="http://openstreetmap.org/">OpenStreetMap</a> contributors';
const attr_overpass = 'POI via <a href="http://www.overpass-api.de/">Overpass API</a>';
const attr_jakob = 'Entwickelt von <a href="https://github.com/ham-jaky">Jakob, DO2JFR</a>';
var currentMapLayers = [];
var map = null;
var layerControl = null;

// sidebar
const sideMenuElementSummary = "<details><summary>SUMMARYTEXT (OPERATOR)</summary>BUSLINKS</details>";
const sideMenuElementDetails = "<a href=\"#OSMID\"><h4>Bus BUSREF</h4>BUSNAME</a>\n";
const sideMenuElement = "<a href=\"#OSMID\"><h4>Bus BUSREF (OPERATOR)</h4>BUSNAME</a>\n";
//sideMenuElement.replace("OSMID", i["id"]).replace("BUSREF", i["tags"]["ref"]).replace("OPERATOR", i["tags"]["operator"]).replace("BUSNAME", i["tags"]["name"])

// overpass stuff (queries)
const queryOsmID = `
[out:json][timeout:25];
relation[type=route](OSMID);
out geom;`;
const queryOsmMetaID = `
[out:json][timeout:25];
relation[type=route](OSMID);
out tags;`;
const queryMeta = `
[out:json][timeout:25];
relation["type"="route"]["route"="bus"]["operator"~"mobus"];
out tags;`;
const queryMaster = `
[out:json][timeout:25];
relation["type"="route_master"]["route_master"="bus"]["operator"~"mobus"];
out;`;
const queryNodeOSMID = `
[out:json][timeout:25];
node(OSMID);
out;`
const overpassUrl = 'https://overpass-api.de/api/interpreter';


// here is the start
function setSideBarDivContent(content){
    document.getElementById("side-menu-bus-routes").innerHTML = content;
}

async function createSideMenuFromOverpass() {
    const apiUrlMeta = `${overpassUrl}?data=${encodeURIComponent(queryMeta)}`;
    let responseMeta = await fetch(apiUrlMeta);
    let routes = await responseMeta.json();
    const apiUrlMaster = `${overpassUrl}?data=${encodeURIComponent(queryMaster)}`;
    let responseMaster = await fetch(apiUrlMaster);
    let routeMasters = await responseMaster.json();
    var divContent = "";

    var routesDict = {};
    for (let routeTmp of routes["elements"]) {
        routesDict[routeTmp["id"]] = routeTmp;
    }

    var usedRoutes = [];
    for (let routeMaster of routeMasters["elements"]) {
        var routemasterdiv = sideMenuElementSummary.replace("OPERATOR", routeMaster["tags"]["operator"]).replace("SUMMARYTEXT", routeMaster["tags"]["name"]);
        var tmp = "";
        for (let busRoute of routeMaster["members"]) {
            var route = routesDict[busRoute["ref"]];
            usedRoutes.push(route["id"]);
            tmp += sideMenuElementDetails.replace("OSMID", route["id"]).replace("BUSREF", route["tags"]["ref"]).replace("BUSNAME", route["tags"]["name"]);
        }
        divContent += routemasterdiv.replace("BUSLINKS", tmp);
    }

    for (let busRoute of routes["elements"]) {
        if (!usedRoutes.includes(busRoute["id"])) {
            divContent += sideMenuElement.replace("OSMID", busRoute["id"]).replace("BUSREF", busRoute["tags"]["ref"]).replace("OPERATOR", busRoute["tags"]["operator"]).replace("BUSNAME", busRoute["tags"]["name"]);
        }
    }
    setSideBarDivContent(divContent)
    localStorage.setItem("side-menu-div-content", divContent);
}

function createSideMenu(loadFromStorage=true) {
    let storedDivContent = localStorage.getItem("side-menu-div-content");
    if (storedDivContent && loadFromStorage) {
        setSideBarDivContent(storedDivContent);
    } else {
        createSideMenuFromOverpass();
    };
}

async function createMap() {
    map = L.map('map');
    map.setView([52.5326, 13.8347], 11);

    var OpenStreetMapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: [attr_osm, attr_overpass, attr_jakob].join(', ')
    }).addTo(map);

    layerControl = L.control.layers({"OpenStreetMap": OpenStreetMapLayer}, {});
    layerControl.addTo(map);
}

function setMeta(osmid, tags) {
    document.getElementById("osm-id").innerHTML = "<a href='https://www.openstreetmap.org/relation/OSMID' target='_blank'>OSMID</a>".replaceAll("OSMID", osmid);

    let websiteSpan = document.getElementById("website");
    if ("website" in tags) {
        websiteSpan.innerHTML = "<a href='WEBSITE' target='_blank'>WEBSITE</a>".replaceAll("WEBSITE", tags["website"]);
    } else {
        websiteSpan.innerHTML = "N/A";
    }

    let refSpan = document.getElementById("ref");
    let nameSpan = document.getElementById("name");
    let networkSpan = document.getElementById("network");
    let networkShortSpan = document.getElementById("network_short");
    let operatorSpan = document.getElementById("operator");
    let fromSpan = document.getElementById("from");
    let toSpan = document.getElementById("to");

    let elementTagList = [
        [refSpan, "ref"],
        [nameSpan, "name"],
        [networkSpan, "network"],
        [networkShortSpan, "network:short"],
        [operatorSpan, "operator"],
        [fromSpan, "from"],
        [toSpan, "to"]
    ];
    for (let [spanElement, tag] of elementTagList) {
        if (tag in tags) {
            spanElement.innerHTML = tags[tag];
        } else {
            spanElement.innerHTML = "N/A";
        }
    }
}

async function hashChanged() {
    for (let layer of currentMapLayers){
        map.removeLayer(layer)
        layerControl.removeLayer(layer)
    }
    currentMapLayers = [];
    let osmid = window.location.hash.substring(1);

    ifblockOSMID: if (osmid) {
        let apiUrlOSMID = `${overpassUrl}?data=${encodeURIComponent(queryOsmID.replace("OSMID", osmid))}`;
        let responseOSMID = await fetch(apiUrlOSMID);

        if (responseOSMID["status"] == 400) {
            console.warn("Es gab einen Fehler bei der Abfrage bei Overpass.");
            break ifblockOSMID;
        }

        let routesOSMID = await responseOSMID.json();

        if (routesOSMID["elements"].lenght > 0) {
            console.warn("Es wurde eine Fehlerhafte OSM-ID angegeben!");
            break ifblockOSMID;
        }


        let routeOSMID = routesOSMID["elements"][0];

        bounds = routeOSMID["bounds"];
        map.fitBounds([[bounds["minlat"], bounds["minlon"]], [bounds["maxlat"], bounds["maxlon"]]]);
        setMeta(routeOSMID["id"], routeOSMID["tags"])

        var polylines = [];
        var platforms = [];
        var platformRequest = "[out:json][timeout:25];(";
        for (let member of routeOSMID["members"]) {
            if (member["type"] == "way") {
                polylines.push(L.polyline(member["geometry"], {"weight": 3}));
            } else if (member["type"] == "node" && member["role"] == "platform") {
                platformRequest += "node(OSMID);".replace("OSMID", member["ref"]);
            }
        }
        platformRequest += ");out;";

        let polylineLayer = L.layerGroup(polylines);
        currentMapLayers.push(polylineLayer);
        layerControl.addOverlay(polylineLayer, "Strecke");
        map.addLayer(polylineLayer);

        let apiUrlNodesOSMID = `${overpassUrl}?data=${encodeURIComponent(platformRequest)}`;
        let responseNodesOSMID = await fetch(apiUrlNodesOSMID);
        let platformsJSON = await responseNodesOSMID.json();
        for (let busPlatform of platformsJSON["elements"]){
            platforms.push(L.marker([busPlatform["lat"], busPlatform["lon"]]).bindPopup(busPlatform["tags"]["name"]));
        }

        let platformsLayer = L.layerGroup(platforms);
        currentMapLayers.push(platformsLayer);
        layerControl.addOverlay(platformsLayer, "Haltestellen");
        map.addLayer(platformsLayer);
    }
}

async function startSide(){
    if ("onhashchange" in window) {
        window.onhashchange = function () {
            hashChanged();
        }
    } else {
        var storedHash = window.location.hash.substring(1);
        window.setInterval(function () {
            if (window.location.hash.substring(1) != storedHash) {
                storedHash = window.location.hash.substring(1);
                hashChanged();
            }
        }, 100);
    }
    await createMap();
    createSideMenu();
    hashChanged();
}

if (!executeNewCode) {
    alert("Hi, es sieht so aus, als wärst du gerade in einer Entwicklungsversion dieser Seite.\nWenn dies auf der Github.io-Seite auftritt, kannst du mich gerne anschreiben.\nWenn die Seite trotzdem funktioniert, spricht natürlich nichts dagegen, sie zu benutzen. :)\n Viel Spaß.")
}

startSide()
