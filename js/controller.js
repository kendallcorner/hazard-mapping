/*jshint esversion: 7 */
const { getElementById } = require("./views");
exports.initController = initController;

/*
 * Sets up event listeners
 */
function initController(EM) {
    //getElementById("new-site").addEventListener("click", () => {EM.emit("site-editor-open", {});});
    getElementById("new-site").addEventListener("click", () => {
        window.state.panel = "site-editor";
        EM.emit("change-panel");
    });

    // TODO:
    getElementById("load-site").addEventListener("click", () => {EM.emit("");});

    EM.on("panel-created", () => {
        const panel = window.state.panel;
        if (panel === "site-editor") {
            listenToSiteEditor(EM);
        } else if (panel === "site-content") {
            listenToSiteContentPanel(EM);
        } else if (panel === "scenario-editor") {
            listenToScenarioEditor(EM);
        } else {
            console.err("No panel of the name ", panel);
        }
    });
}

/*
 * Set up places search bar to look up addresses and location names nearby
 */
function setUpPlacesSearch(element) {
    const searchBox = new window.googleAPI.maps.places.SearchBox(element);
    
    let markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.

    searchBox.addListener('places_changed', function() {
        // from: https://developers.google.com/maps/documentation/javascript/places-autocomplete
        var places = searchBox.getPlaces();
        if (places.length == 0) { return; }

        // Clear out the old markers.
        markers.forEach(function(marker) {
            marker.setMap(null);
        });
        markers = [];

        // For each place, get the icon, name and location.
        var bounds = new window.googleAPI.maps.LatLngBounds();
        places.forEach(function(place) {
            if (!place.geometry) {
                throw new Error("Returned place contains no geometry");
            }
            // Create a marker for each place.
            const marker = new window.googleAPI.maps.Marker({
                map: map,
                title: place.formatted_address,
                position: place.geometry.location,
                icon: "http://192.168.11.75:9966/assets/searchPin.png"
            });
            window.googleAPI.maps.event.addListener(marker, "click", latLongListener);
            markers.push(marker);

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
            if (places.length ==1) {
                setLatLongValues(place.geometry.location.lat(), place.geometry.location.lng());
            }
        });
        map.fitBounds(bounds);
    });
}

/*
 * Set up Site Editor listeners
 */
function listenToSiteEditor(EM) {
    setUpPlacesSearch(getElementById('search-box'));
    const eventListeners = placeLatLongListenerOnMap();
    getElementById("site-submit-button").addEventListener("click", () => {
        EM.emit("new-site-submitted");
        removeLatLongListenerFromMap(eventListeners);
        if (window.state.searchMarker) window.state.searchMarker.setMap(null);
    });
    getElementById("site-cancel-button").addEventListener("click", () => {
        getElementById("navigator").innerHTML = "";
        window.state.panel = null;
        removeLatLongListenerFromMap(eventListeners);
        if (window.state.searchMarker) window.state.searchMarker.setMap(null);
    });
}


function runDropdownMenu(event, EM) {
    const dropdownIdSplit = event.target.id.split("-");
    if (dropdownIdSplit.length === 3) {
        const [ scenario, scenarioNum, menuFunction ] = dropdownIdSplit;
        const scenarioId = scenario + "-" + scenarioNum;
        console.log('rDdM ', scenarioId);
        switch(menuFunction) {
            case "delete":
                // code block
                break;
            case "edit":
                window.state.scenarioId = scenarioId;
                window.state.panel = "scenario-editor";
                EM.emit("change-panel");
                break;
            case "hide":
                // code block
                break;
            case "hideRanges":
                // code block
                break;
            default:
                throw new Error("dropdown-scneario-menu-item menuFunction is not correct", menuFunction);
        } 
    } else {
        throw new Error("target Id on dropdown-scneario-menu-item is not correct", targetId);
    }
}
/*
 * Set up Scenario Editor listeners
 */
function listenToScenarioEditor(EM) {
    const eventListeners = placeLatLongListenerOnMap();
    const submitButton = getElementById("scenario-submit-button");
    getElementById("scenario-submit-button").addEventListener("click", () => {
        EM.emit("create-edit-scenario", window.state.scenarioId);
        removeLatLongListenerFromMap(eventListeners);
        if (window.state.searchMarker) window.state.searchMarker.setMap(null);
    });
    getElementById("scenario-cancel-button").addEventListener("click", () => {
        window.state.panel = "site-content";
        EM.emit("change-panel");
        removeLatLongListenerFromMap(eventListeners);
        if (window.state.searchMarker) window.state.searchMarker.setMap(null);
    });
}

/*
 * Set up Site Content panel listeners
 */
function listenToSiteContentPanel(EM) {
    getElementById("new-scenario").addEventListener("click", () => {
        window.state.panel = "scenario-editor";
        EM.emit("change-panel");
    });
    getElementById("edit-site").addEventListener("click", () => {
        window.state.panel = "site-editor";
        EM.emit("change-panel");
    });
    // TODO:
    getElementById("save-site").addEventListener("click", () => {
        EM.emit("", {});
    });

    const dropdowns = document.getElementsByClassName("dropdown-scenario-menu-item");
    if (dropdowns) {
        for (const dropdown of dropdowns) {
            dropdown.addEventListener("click", event => {
                runDropdownMenu(event, EM);
            });
        }
    }
}

function placeLatLongListenerOnMap() {
    return [
        window.googleAPI.maps.event.addListener(map, "click", latLongListener),
        window.googleAPI.maps.event.addListener(map, "click", placeDraggableMarkerOnMap)
    ];

}

function removeLatLongListenerFromMap(eventListeners) {
    for (const listener of eventListeners) {
        window.googleAPI.maps.event.removeListener(listener);
    }
}

function latLongListener(event) {
    setLatLongValues(event.latLng.lat(), event.latLng.lng());
}

function setLatLongValues(latitude, longitude) {
    getElementById("latitude").value = latitude.toFixed(5);
    getElementById("longitude").value = longitude.toFixed(5);
}

function placeDraggableMarkerOnMap(event){
    var myLatLng = new window.googleAPI.maps.LatLng(event.latLng.lat(), event.latLng.lng());
    if (window.state.searchMarker) window.state.searchMarker.setMap(null);
    let icon;
    if (window.state.panel === "site-editor") {
        icon = "http://192.168.11.75:9966/assets/sitePin.png";
    } else if (window.state.panel == "scenario-editor") {
        icon = "http://192.168.11.75:9966/assets/scenario.png";
    }
    window.state.searchMarker = new window.googleAPI.maps.Marker({
        map: map,
        position: myLatLng,
        icon: icon,
        draggable: true
    });
    google.maps.event.addListener(window.state.searchMarker, 'dragend', latLongListener);
}