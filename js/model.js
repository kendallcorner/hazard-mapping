/*jshint esversion: 7 */
const { EM } = require("./controller");
const { getElementById } = require("./views");

const site = {};
let scenarioCount = 0;

/**
 * Create new site
 */
EM.on("new-site-submitted", () => {
    site.name =  getElementById('name').value;
    site.latitude =  Number(getElementById('lat').value).toFixed(5);
    site.longitude =  Number(getElementById('lon').value).toFixed(5);
    site.scenarioList =  {};
    console.log(site);
    EM.emit("map-site", site);
    EM.emit("show-site-content-panel", site);
});

/**
 * Send location info to site content panel
 */
EM.on("scenario-cancel-button-clicked", () => {
    EM.emit("show-site-content-panel", site);
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
    if (scenarioId in site.scenarioList) {
        //showHideMapFeatures(scenarioId, null);
        //delete myMapFeatures[scenarioId]; 
    }
    site.scenarioList[scenarioId] = {
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
    //createMapFeatures(site.hazMatList[hazMatID], hazMatID);
    EM.emit("show-site-content-panel", site);
});
