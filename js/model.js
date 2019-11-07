/*jshint esversion: 7 */
const { EM } = require("./controller");
const { getElementById } = require("./views");

const myLocation = {};
let scenarioCount = 0;

/**
 * Creat new site
 */
EM.on("new-site-submitted", () => {
    myLocation.name =  getElementById('name').value;
    myLocation.latitude =  Number(getElementById('lat').value).toFixed(5);
    myLocation.longitude =  Number(getElementById('lon').value).toFixed(5);
    myLocation.scenarioList =  {};
    console.log(myLocation);
    EM.emit("mapLocation", myLocation);
    EM.emit("show-site-content-panel", myLocation);
});

/**
 * Send location info to site content panel
 */
EM.on("scenario-cancel-button-clicked", () => {
    EM.emit("show-site-content-panel", myLocation);
});

/**
 * Grab info from scenario input panel
 */
EM.on("create-edit-scenario", (scenarioId) => {
    //tempMarker.setMap(null);
    //creates the new HazMat
    if (!scenarioId) {
        scenarioId = "scenario=" + scenarioCount;
        scenarioCount =+ 1;
    }

    var name = getElementById('name').value;
    if (scenarioId in myLocation.scenarioList) {
        //showHideMapFeatures(scenarioId, null);
        //delete myMapFeatures[scenarioId]; 
    }
    myLocation.scenarioList[scenarioId] = {
        name: getElementById('name').value,
        scenarioId: scenarioId,
        material: getElementById('material').value,
        lat: Number(getElementById('lat').value),
        lon: Number(getElementById('lon').value),
        range1: getElementById('range-1').value,
        frequencyRange1: getElementById('material').value,
        range2: getElementById('material').value,
        frequencyRange2: getElementById('material').value,
        range3: getElementById('material').value,
        frequencyRange3: getElementById('material').value
    }; 
    //createMapFeatures(myLocation.hazMatList[hazMatID], hazMatID);
    EM.emit("show-site-content-panel", myLocation);
});
