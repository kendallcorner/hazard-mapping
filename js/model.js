/*jshint esversion: 7 */
const { getElementById } = require("./views");
exports.setupModel = setupModel;

function setupModel(EM) {
    const state = {
        panel: "home",
        mapFeatures: {},
        scenarioCount: 0,
        scenarioId: null,
        site: {
            name: "Home",
            latitude: 36.15911,
            longitude: -95.99374,
            zoom: 18
        },
    };

    /**
     * Create new site
     */
    EM.on("new-site-submitted", () => {
        try {
            state.site = makeSite({
                name:  getElementById('name').value,
                latitude: Number(getElementById('latitude').value),
                longitude: Number(getElementById('longitude').value),
                zoom: 18
            });
        } catch(error) {
            window.alert(error);
            EM.emit("change-panel");
            return;
        }
        state.panel = "site-content";
        EM.emit("change-panel");
    });

    /**
     * Grab info from scenario input panel
     */
    EM.on("create-edit-scenario", (scenarioId) => {
        if (!scenarioId) {
            scenarioId = "scenario-" + state.scenarioCount;
            state.scenarioCount +=  1;
        }
        state.scenarioId = scenarioId;
        try {
            state.site.scenarioList[scenarioId] = new Scenario({
                name: getElementById('name').value,
                scenarioId: scenarioId,
                material: getElementById('material').value,
                latitude: Number(getElementById('latitude').value),
                longitude: Number(getElementById('longitude').value),
                ranges: [
                    {
                        range: getElementById('range-1').value,
                        frequency: getElementById('frange-1').value
                    },
                    {
                        range: getElementById('range-2').value,
                        frequency: getElementById('frange-2').value
                    },
                    {
                        range: getElementById('range-3').value,
                        frequency: getElementById('frange-3').value
                    }
                ]
            }); 
        } catch (error) {
            window.alert(error);
            EM.emit("change-panel");
            return;
        }
        window.state.panel = "site-content";
        window.state.scenarioId = null;
        EM.emit("change-panel");
    });

    EM.on("delete-scenario", () => {
        if(state.mapFeatures.scenarioList[state.scenarioId]) {
        for (const featureKey in state.mapFeatures.scenarioList[state.scenarioId]) {
            state.mapFeatures.scenarioList[state.scenarioId][featureKey].setMap(null);
        }
           delete state.site.scenarioList[state.scenarioId];
           window.state.panel = "site-content";
           window.state.scenarioId = null;
           EM.emit("change-panel");
         } else {
             throw new Error("No scenarioMarker exists for " + state.scenarioId);
         }
    });
    return state;
}

function Scenario (scenarioInputs) {
    if (!scenarioInputs.name) throw new Error("Name is required");
    if (!scenarioInputs.latitude) throw new Error("Latitude is required (click to place on map)");    
    if (!scenarioInputs.longitude) throw new Error("Longitude is required (click to place on map)");
    if (!scenarioInputs.scenarioId) throw new Error("ScenarioId is not being assigned");

    const defaultValues = {
        material: null,
        ranges: []
    };
    scenarioInputs.latitude = Number(scenarioInputs.latitude).toFixed(5);
    scenarioInputs.longitude = Number(scenarioInputs.longitude).toFixed(5);
    return Object.assign(this, defaultValues, scenarioInputs);
}

Scenario.prototype = {
     constructor: Scenario,
     update: function (newScenarioInput) { return Object.assign(this, newScenarioInput); }
};


function makeSite (overrides) {
    if (!overrides.name) throw new Error("Name is required");
    if (!overrides.latitude) throw new Error("Latitude is required (click to place on map)");    
    if (!overrides.longitude) throw new Error("Longitude is required (click to place on map)");

    const defaultValues = {
        scenarioList: {}
    };
    overrides.latitude = Number(overrides.latitude).toFixed(5);
    overrides.longitude = Number(overrides.longitude).toFixed(5);
    return Object.assign(defaultValues, overrides);
}