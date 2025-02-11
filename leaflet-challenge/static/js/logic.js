// Create the 'basemap' tile layer that will be the background of our map.
let satellite = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
  noWrap: false
});

// OPTIONAL: Step 2
// Create the 'street' tile layer as a second background of the map
let grayscale = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  noWrap: false
});

let outdoors = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  attribution: "Map data: &copy; OpenStreetMap contributors",
  noWrap: false
});

// Create the map object with center and zoom options.
let myMap = L.map("map", {
  center: [40, -95],
  zoom: 3,
  layers: [satellite],
  worldCopyJump: true, 
});

// Then add the 'basemap' tile layer to the map.
satellite.addTo(myMap);

// OPTIONAL: Step 2
// Create the layer groups, base maps, and overlays for our two sets of data, earthquakes and tectonic_plates.
// Add a control to the map that will allow the user to change which layers are visible.
let earthquakes = new L.LayerGroup();
let tectonicPlates = new L.LayerGroup();

let baseMaps = {
  "Satellite": satellite,
  "Grayscale": grayscale,
  "Outdoors": outdoors
};

let overlayMaps = {
  "Tectonic Plates": tectonicPlates,
  "Earthquakes": earthquakes
};

L.control.layers(baseMaps, overlayMaps).addTo(myMap);

// Make a request that retrieves the earthquake geoJSON data.
let queryUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
d3.json(queryUrl).then(function (data) {

  // This function returns the style data for each of the earthquakes we plot on
  // the map. Pass the magnitude and depth of the earthquake into two separate functions
  // to calculate the color and radius.
  function chooseColor(depth) {
    if (depth < 10) return "#98ee00";
    else if (depth < 30) return "#d4ee00";
    else if (depth < 50) return "#eecc00";
    else if (depth < 70) return "#ee9c00";
    else if (depth < 90) return "#ea822c";
    else return "#ea2c2c";
  }

  // Helper function for magnitude on markers
  function getRadius(mag) {
    return mag * 5;
  }

  // Duplicating function for map wrapping
  function duplicateMarkers(markers) {
    let offsets = [-360, 0, 360];
    let allMarkers = [];

    markers.forEach(marker => {
      offsets.forEach(offset => {
        let newMarker = L.circleMarker(
          [marker.getLatLng().lat, marker.getLatLng().lng + offset],
          marker.options
        ).bindPopup(marker.getPopup().getContent());
        allMarkers.push(newMarker);
      });
    });

    return allMarkers;
  }

  // Loop through earthquake data
  let markers = [];
  for (let i = 0; i < data.features.length; i++) {
    let row = data.features[i];
    let location = row.geometry.coordinates;
    
    if (location) {
      let latitude = location[1];
      let longitude = location[0];
      let depth = location[2];
      let mag = row.properties.mag;

      // Create marker
      let marker = L.circleMarker([latitude, longitude], {
        fillOpacity: 0.75,
        color: "white",
        weight: 0.75,
        fillColor: chooseColor(depth),
        radius: getRadius(mag)
      }).bindPopup(
        `<h3>${row.properties.place}</h3><hr>
         <p>Magnitude: ${mag}</p>
         <p>Depth: ${depth} km</p>`
      );

      markers.push(marker);
    }
  }

  // Duplicate markers for wrapping
  let wrappedMarkers = duplicateMarkers(markers);

  // Add markers to earthquake layer
  L.layerGroup(wrappedMarkers).addTo(earthquakes);

  // OPTIONAL: Step 2
  // Add the data to the earthquake layer instead of directly to the map.
  earthquakes.addTo(myMap);

  // Create a legend control object.
  let legend = L.control({
    position: "bottomright"
  });

  // Then add all the details for the legend
  legend.onAdd = function () {
    let div = L.DomUtil.create("div", "info legend");
    div.style.backgroundColor = "white";
    div.style.padding = "8px";
    div.style.border = "1px solid black";
    div.style.borderRadius = "5px";

    let depthIntervals = [-10, 10, 30, 50, 70, 90];
    let colors = depthIntervals.map(d => chooseColor(d));

    div.innerHTML += "<strong>Depth (km)</strong><br>";

    // Loop through depth intervals to generate a label with a colored square for each interval.
    for (let i = 0; i < depthIntervals.length; i++) {
      div.innerHTML +=
        `<i style="background: ${colors[i]}; width: 18px; height: 18px; display: inline-block;"></i> ` +
        (depthIntervals[i] === -10 ? "<10" : `${depthIntervals[i]}+`) + "<br>";
    }

    return div;
  };

  // Finally, add the legend to the map.
  legend.addTo(myMap);

  // OPTIONAL: Step 2
  // Make a request to get our Tectonic Plate geoJSON data.
  d3.json("https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json").then(function (plate_data) {
    // Save the geoJSON data, along with style information, to the tectonic_plates layer.

    function duplicateTectonicPlates(geojsonLayer) {
      let offsets = [-360, 0, 360]; // Duplicates left and right
      let allLayers = [];

      offsets.forEach(offset => {
        let newLayer = L.geoJson(plate_data, {
          color: "orange",
          weight: 2,
          coordsToLatLng: function (coords) {
            return new L.LatLng(coords[1], coords[0] + offset);
          }
        });
        allLayers.push(newLayer);
      });

      return allLayers;
    }

    let wrappedPlates = duplicateTectonicPlates(plate_data);
    wrappedPlates.forEach(layer => layer.addTo(tectonicPlates));

    // Then add the tectonic_plates layer to the map.
    tectonicPlates.addTo(myMap);
  });
});