/*jshint esversion: 7 */
const { EM } = require("./controller");
const { getElementById } = require("./views");

const site = {};
let scenarioCount = 0;

function setupModel(EM) {
    /**
     * Create new site
     */
    EM.on("new-site-submitted", () => {
        site.name =  getElementById('name').value;
        site.latitude =  Number(getElementById('latitude').value).toFixed(5);
        site.longitude =  Number(getElementById('longitude').value).toFixed(5);
        site.scenarioList =  {};
        console.log(site);
        EM.emit("map-site", site);
        EM.emit("show-site-content-panel", site);
    });

    EM.on("edit-site", () => {
        EM.emit("site-editor-open", site);
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
        if (!scenarioId) {
            scenarioId = "scenario=" + scenarioCount;
            scenarioCount =+ 1;
        }

        var name = getElementById('name').value;
        site.scenarioList[scenarioId] = {
            name: getElementById('name').value,
            scenarioId: scenarioId,
            material: getElementById('material').value,
            latitude: Number(getElementById('latitude').value),
            longitude: Number(getElementById('longitude').value),
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

}

setupModel(EM);
