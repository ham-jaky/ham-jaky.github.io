var attr_osm = 'Map data &copy; <a href="http://openstreetmap.org/">OpenStreetMap</a> contributors';
var attr_overpass = 'POI via <a href="http://www.overpass-api.de/">Overpass API</a>';

var map = L.map('map').setView([52.5326, 13.8347], 11);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: [attr_osm, attr_overpass].join(', ')
}).addTo(map);