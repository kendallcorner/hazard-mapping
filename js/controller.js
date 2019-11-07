/*jshint esversion: 7 */
const events = require("events");
const EM = new events.EventEmitter();
exports.EM = EM;
const { getElementById } = require("./views");


/*
 * Add event listeners to site editor panel
 */
EM.on("site-editor-initialized", () => {
    const input = getElementById('search-box');
    const searchBox = new google.maps.places.SearchBox(input);
    // map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    
    let markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.

    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        if (places.length == 0) { return; }

        // Clear out the old markers.
        markers.forEach(function(marker) {
            marker.setMap(null);
        });
        markers = [];

        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
                if (!place.geometry) {
                    throw new Error("Returned place contains no geometry");
                }

            // Create a marker for each place.
            markers.push(new google.maps.Marker({
                map: map,
                title: place.formatted_address,
                position: place.geometry.location
            }));

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });

    document.getElementById("site-submit-button").addEventListener("click", function () {
        EM.emit("new-site-subitted");
    });

    // TODO: setupHazMatMenu is not the correct thing to do here.
    document.getElementById("site-cancel-button").addEventListener("click", () => {
        EM.emit("site-editor-cancel", "navigator");
    });
});