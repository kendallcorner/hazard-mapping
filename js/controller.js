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

    const loadButton = getElementById('load-site');
    loadButton.addEventListener('change', ()=> {
        //loads existing JSON file as a location.
        const fileURL = window.URL.createObjectURL(loadButton.files[0]);
        console.log(fileURL);
        //https://stackoverflow.com/questions/35294633/what-is-the-vanilla-js-version-of-jquerys-getjson#answers
        const request = new XMLHttpRequest();
        request.open('GET', fileURL, true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                const json = JSON.parse(request.responseText);
                window.state.site = json;
                window.state.panel = "site-content";
                EM.emit("change-panel");
            } else {
                throw new Error("File did not load properly: " + request.status);
            }
        };

        request.onerror = function() {
            throw new Error("File did not load properly: " + request.status);
        };

        request.send();
    });

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
    
    window.state.placesMarkers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.

    searchBox.addListener('places_changed', function() {
        // from: https://developers.google.com/maps/documentation/javascript/places-autocomplete
        const places = searchBox.getPlaces();
        if (places.length == 0) { return; }

        // Clear out the old markers.
        for (const marker of window.state.placesMarkers) {
            marker.setMap(null);
        }
        window.state.placesMarkers = [];

        // For each place, get the icon, name and location.
        var bounds = new window.googleAPI.maps.LatLngBounds();
        places.forEach(function(place) {
            if (!place.geometry) {
                throw new Error("Returned place contains no geometry");
            }
            // Create a marker for each place.
            const marker = new window.googleAPI.maps.Marker({
                map: window.state.map,
                title: place.formatted_address,
                position: place.geometry.location,
                icon: "http://192.168.11.75:9966/assets/searchPin.png"
            });
            window.googleAPI.maps.event.addListener(marker, "click", latLongListener);
            window.state.placesMarkers.push(marker);

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
        window.state.map.fitBounds(bounds);
    });
}

/*
 * Set up Site Editor listeners
 */
function listenToSiteEditor(EM) {
    setUpPlacesSearch(getElementById('search-box'));
    const eventListeners = placeLatLongListenerOnMap();
    getElementById("submit-button").addEventListener("click", () => {
        EM.emit("new-site-submitted");
        removeLatLongListenerFromMap(eventListeners);
        if (window.state.searchMarker) window.state.searchMarker.setMap(null);
        removeMarkers();
    });
    getElementById("site-cancel-button").addEventListener("click", () => {
        getElementById("navigator").innerHTML = "";
        window.state.panel = null;
        removeLatLongListenerFromMap(eventListeners);
        if (window.state.searchMarker) window.state.searchMarker.setMap(null);
        removeMarkers();
    });
    addKeyboardFunctionality();
    function removeMarkers() {
        if(window.state.placesMarkers) {
            for (const marker of window.state.placesMarkers) {
                marker.setMap(null);
            }
            window.state.placesMarkers = [];
        }
    }
}


function runDropdownMenu(event, EM) {
    const dropdownIdSplit = event.target.id.split("-");
    if (dropdownIdSplit.length === 3) {
        const [ scenario, scenarioNum, menuFunction ] = dropdownIdSplit;
        const scenarioId = scenario + "-" + scenarioNum;
        switch(menuFunction) {
            case "delete":
                window.state.scenarioId = scenarioId;
                EM.emit("delete-scenario");
                break;
            case "edit":
                window.state.scenarioId = scenarioId;
                window.state.panel = "scenario-editor";
                EM.emit("change-panel");
                break;
            case "hide":
                window.state.site.scenarioList[scenarioId].hidden = !window.state.site.scenarioList[scenarioId].hidden;
                EM.emit("change-panel");
                break;
            case "hideRanges":
                window.state.site.scenarioList[scenarioId].rangesHidden = !window.state.site.scenarioList[scenarioId].rangesHidden;
                EM.emit("change-panel");
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
    const state = window.state;
    const eventListeners = placeLatLongListenerOnMap();
    getElementById("submit-button").addEventListener("click", () => {
        EM.emit("create-edit-scenario", state.scenarioId);
        removeLatLongListenerFromMap(eventListeners);
        if (state.searchMarker) state.searchMarker.setMap(null);
    });
    getElementById("scenario-cancel-button").addEventListener("click", () => {
        state.panel = "site-content";
        EM.emit("change-panel");
        removeLatLongListenerFromMap(eventListeners);
        if (state.searchMarker) state.searchMarker.setMap(null);
    });

    // Make initial scenario marker
    if (state.scenarioId) {
        placeDraggableMarkerOnMap(state.site.scenarioList[state.scenarioId].latitude, 
            state.site.scenarioList[state.scenarioId].longitude);
    } else {
        placeDraggableMarkerOnMap(state.site.latitude, state.site.longitude);
    }
    addKeyboardFunctionality();
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
        saveSite(window.state.site);
    });

    function dropdownListener (event) {
        runDropdownMenu(event, EM);
    }
    const dropdowns = document.getElementsByClassName("dropdown-button");
    if (dropdowns) {
        for (const dropdown of dropdowns) {
            dropdown.addEventListener("click", dropdownListener);
        }
    }
}

function saveSite(location) {
    //saves myLocation info as a json file.
    const name = location.name + ".json";
    const file = new Blob([JSON.stringify(location)], {type: "application/json"});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, name);
    else { // Others
        const a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function placeLatLongListenerOnMap() {
    return [
        window.googleAPI.maps.event.addListener(window.state.map, "click", latLongListener),
        window.googleAPI.maps.event.addListener(window.state.map, "click", (event) => {
            placeDraggableMarkerOnMap(event.latLng.lat(), event.latLng.lng());
        })
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

function placeDraggableMarkerOnMap(latitude, longitude){
    const myLatLng = new window.googleAPI.maps.LatLng(latitude, longitude);
    if (window.state.searchMarker) window.state.searchMarker.setMap(null);
    const icon = window.state.panel == "scenario-editor" ?
        "http://192.168.11.75:9966/assets/scenario.png" :
        "http://192.168.11.75:9966/assets/sitePin.png";
    window.state.searchMarker = new window.googleAPI.maps.Marker({
        map: window.state.map,
        position: myLatLng,
        icon: icon,
        draggable: true
    });
    google.maps.event.addListener(window.state.searchMarker, 'dragend', latLongListener);
}

function addKeyboardFunctionality() {
    var form = getElementById("form");
    form.addEventListener("keyup", function(event) {
        // Enter key
        if (event.keyCode === 13) {
            getElementById("submit-button").click();
      }
    }); 
}