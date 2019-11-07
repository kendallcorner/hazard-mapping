/*jshint esversion: 7 */
const events = require("events");
const EM = new events.EventEmitter();
exports.EM = EM;
const { getElementById } = require("./views");


/*
 * Add event listeners to site editor panel and set up places
 * search bar to look up addresses and location names nearby
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
            const marker = new google.maps.Marker({
                map: map,
                title: place.formatted_address,
                position: place.geometry.location
            });

            google.maps.event.addListener(marker, "click", function (event) {
                getElementById("lat").value = event.latLng.lat().toFixed(5);
                getElementById("lon").value = event.latLng.lng().toFixed(5);
            });

            markers.push(marker);

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });

    getElementById("site-submit-button").addEventListener("click", function () {
        EM.emit("new-site-submitted");
    });

    getElementById("site-cancel-button").addEventListener("click", () => {
        getElementById("navigator").innerHTML = "";
    });
});

/**
 * add event listeners to the site content panel
 */
EM.on("site-content-panel-created", () => {
    getElementById("new-scenario").addEventListener("click", () => {
        EM.emit("show-scenario-panel", {});
    });
});

/**
 * Add event listeners to scenario panel
 */
EM.on("scenario-panel-created", () => {
    const submitButton = getElementById("scenario-submit-button");
    const scenarioId = submitButton.getAttribute("data-scenario-id");
    getElementById("scenario-submit-button").addEventListener("click", () => {
        EM.emit("create-edit-scenario", scenarioId);
    });
    getElementById("scenario-cancel-button").addEventListener("click", () => {
        EM.emit("scenario-cancel-button-clicked");
    });    
});