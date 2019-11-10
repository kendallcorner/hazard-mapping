/*jshint esversion: 7 */
const { getElementById } = require("./views");
exports.setupModel = setupModel;

let scenarioCount = 0;

function setupModel(EM) {
    const state = {
        panel: "home"
    };

    /**
     * Create new site
     */
    EM.on("new-site-submitted", () => {
        state.site = {};
        state.site.name =  getElementById('name').value;
        state.site.latitude =  Number(getElementById('latitude').value).toFixed(5);
        state.site.longitude =  Number(getElementById('longitude').value).toFixed(5);
        state.site.scenarioList =  {};
        EM.emit("map-site", state.site);
        state.panel = "site-content";
        EM.emit("change-panel");
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
        state.site.scenarioList[scenarioId] = {
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
        window.state.panel = "site-content";
        window.state.scenarioId = null;
        EM.emit("change-panel");
    });
    return state;
}
