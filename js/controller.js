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
        } else if (panel === "bubbleplot-editor") {
            listenToBubbleplotEditor(EM);
        } else {
            throw new Error("No panel of the name ", panel);
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
                icon: "assets/searchPin.png"
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
        const [ type, scenarioNum, menuFunction ] = dropdownIdSplit;
        const id = type + "-" + scenarioNum;
        if (type === "bubbleplot") {
            switch(menuFunction) {
                case "delete":
                    window.state.mapItem = id;
                    EM.emit("delete-siteItem");
                    break;
                case "edit":
                    window.state.mapItem = id;
                    window.state.panel = "bubbleplot-editor";
                    EM.emit("change-panel");
                    break;
                case "hide":
                    window.state.site.bubbleplotList[id].hidden = !window.state.site.bubbleplotList[id].hidden;
                    EM.emit("change-panel");
                    break;
                default:
                    throw new Error("dropdown-scenario-menu-item menuFunction is not correct", targetId);
            }
        } else if (type === "scenario") {
            switch(menuFunction) {
                case "delete":
                    window.state.mapItem = id;
                    EM.emit("delete-siteItem");
                    break;
                case "edit":
                    window.state.mapItem = id;
                    window.state.panel = "scenario-editor";
                    EM.emit("change-panel");
                    break;
                case "hide":
                    window.state.site.scenarioList[id].hidden = !window.state.site.scenarioList[id].hidden;
                    EM.emit("change-panel");
                    break;
                case "hideRanges":
                    window.state.site.scenarioList[id].rangesHidden = !window.state.site.scenarioList[id].rangesHidden;
                    EM.emit("change-panel");
                    break;
                default:
                    throw new Error("dropdown-scneario-menu-item menuFunction is not correct", targetId);
            }
        } else{
            throw new Error("target Id on dropdown-scneario-menu-item is not correct", targetId);
        }
    } else {
        throw new Error("target Id on dropdown-scneario-menu-item is not correct", targetId);
    }
}

/*
 * Set up Scenario Editor listeners
 */
function listenToBubbleplotEditor(EM) {
    getElementById("submit-button").addEventListener("click", () => {
        EM.emit("create-bubbleplot");
    });
    getElementById("bubbleplot-cancel-button").addEventListener("click", () => {
        state.panel = "site-content";
        EM.emit("change-panel");
    });
}
/*
 * Set up Scenario Editor listeners
 */
function listenToScenarioEditor(EM) {
    const state = window.state;
    const eventListeners = placeLatLongListenerOnMap();
    getElementById("submit-button").addEventListener("click", () => {
        EM.emit("create-edit-scenario", state.mapItem);
        removeLatLongListenerFromMap(eventListeners);
        if (state.searchMarker) state.searchMarker.setMap(null);
    });
    getElementById("scenario-cancel-button").addEventListener("click", () => {
        state.panel = "site-content";
        EM.emit("change-panel");
        removeLatLongListenerFromMap(eventListeners);
        if (state.searchMarker) state.searchMarker.setMap(null);
    });
    getElementById("metric-english-toggle").addEventListener("click", () => {
        window.alert("This feature has not been created yet");
    });
    getElementById("save-model").addEventListener("click", () => {
        getModelData("tnoModel");
    });
    // Make initial scenario marker
    if (state.mapItem) {
        placeDraggableMarkerOnMap(state.site.scenarioList[state.mapItem].latitude, 
            state.site.scenarioList[state.mapItem].longitude);
    } else {
        placeDraggableMarkerOnMap(state.site.latitude, state.site.longitude);
    }
    addKeyboardFunctionality();
}

function getModelData(modelName) {
    if (modelName == "tnoModel") {
        const model = {};
        model.metricEnglish = getElementById("metric-english-toggle").getAttribute("data");
        model.tnoVolume = getElementById("tnoVolume").value;
        model.tnoHeat = getElementById("tnoHeat").value;
        model.tnoAtmPress = getElementById("tnoAtmPress").value;
        model.tnoCurveSelect = getElementById("tnoCurveSelect").value;
        model.tnoPressThresh = [
            getElementById("tnoPressThresh1").value, 
            getElementById("tnoPressThresh2").value, 
            getElementById("tnoPressThresh3").value
        ];

        model.tnoPressThresh.sort((a, b) => {return b-a;});

        // TODO: store model in state

        const radiusForPs = TNOmodelFromPressArray(model);

        getElementById("range-0").value = radiusForPs[0];
        getElementById("range-1").value = radiusForPs[1];
        getElementById("range-2").value = radiusForPs[2];
    }
}

function TNOmodelFromPressArray(model) {
    let distances = [];
    for (const p of model.tnoPressThresh) {
        const scaledP = (p/model.tnoAtmPress);
        console.log("scaledP = " + scaledP);
        const curve = window.state.tnoTable[model.tnoCurveSelect];
        const rbar = tableLookup(curve, scaledP);
        console.log("rbar = " + rbar);
        if (rbar) {
            distances.push(rbar*(model.tnoHeat*1000*model.tnoVolume/(model.tnoAtmPress*100))**(1/3));
        }
        
    }
    console.log(distances);
    return distances;
}

function tableLookup(table, scaledPressure) {
    if (scaledPressure > table.overpressure[0]) {
        window.alert("Not all thresholds can be reached by the chosen curve");
        return false;
    } else {
        for (let i=0; i < table.overpressure.length; i++) {
            if (scaledPressure > table.overpressure[i]) {
                let interp = logInterpolateX (
                    table.distance[i], 
                    table.overpressure[i], 
                    table.distance[i-1], 
                    table.overpressure[i-1], 
                    scaledPressure);
                console.log(interp);
                return interp;
            }
        }
    }
}

function interpolate(x1, y1, x2, y2, x) { return y1+(y2-y1)*(x-x1)/(x2-x1); }
function logInterpolateX(x1, y1, x2, y2, y) { 
    // https://math.stackexchange.com/questions/1777303/interpolation-point-fitting-onto-a-logarithmic-line-segment
    // https://en.wikipedia.org/wiki/Log%E2%80%93log_plot
    const slope = Math.log(y2/y1)/Math.log(x2/x1);
    return x1*(y/y1)**(1/slope); 
}


/*
 * Set up Site Content panel listeners
 */
function listenToSiteContentPanel(EM) {
    getElementById("new-scenario").addEventListener("click", () => {
        window.state.panel = "scenario-editor";
        EM.emit("change-panel");
    });
    getElementById("new-bubbleplot").addEventListener("click", () => {
        window.state.panel = "bubbleplot-editor";
        EM.emit("change-panel");
    });
    getElementById("edit-site").addEventListener("click", () => {
        window.state.panel = "site-editor";
        EM.emit("change-panel");
    });
    getElementById("save-site").addEventListener("click", () => {
        saveSite(window.state.site);
    });
    getElementById("hide-scenarios").addEventListener("click", () => {
        for (const scenario of Object.values(window.state.site.scenarioList)) { scenario.hidden = true;}
        window.state.panel = "site-content";
        EM.emit("change-panel");
    });
    getElementById("hide-bubbleplots").addEventListener("click", () => {
        for (const bubbleplot of Object.values(window.state.site.bubbleplotList)) { bubbleplot.hidden = true;}
        window.state.panel = "site-content";
        EM.emit("change-panel");
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
        "assets/scenario.png" :
        "assets/sitePin.png";
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
