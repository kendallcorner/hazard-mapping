/*jshint esversion: 7 */
const { getElementById } = require("./views");
exports.setupModel = setupModel;

function setupModel(EM) {
    const state = {
        panel: "home",
        mapFeatures: {},
        scenarioCount: 0,
        scenarioId: null
    };

    /**
     * Create new site
     */
    EM.on("new-site-submitted", () => {
        try {
            state.site = makeSite({
                name:  getElementById('name').value,
                latitude: Number(getElementById('latitude').value),
                longitude: Number(getElementById('longitude').value)
            });
        } catch(error) {
            window.alert(error);
            EM.emit("change-panel");
            return;
        }
        EM.emit("map-site", state.site);
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
            state.site.scenarioList[scenarioId] = makeScenario({
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
        EM.emit("map-scenarios", state.scenarioId);
        window.state.scenarioId = null;
        EM.emit("change-panel");
    });

    EM.on("delete-scenario", () => {
       if(state.mapFeatures.scenarioList[state.scenarioId]) {
            state.mapFeatures.scenarioList[state.scenarioId].setMap(null);
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

function makeScenario (overrides) {
    if (!overrides.name) throw new Error("Name is required");
    if (!overrides.latitude) throw new Error("Latitude is required (click to place on map)");    
    if (!overrides.longitude) throw new Error("Longitude is required (click to place on map)");
    if (!overrides.scenarioId) throw new Error("ScenarioId is not being assigned");

    const defaultValues = {
        material: null,
        ranges: []
    };
    overrides.latitude = Number(overrides.latitude).toFixed(5);
    overrides.longitude = Number(overrides.longitude).toFixed(5);
    return Object.assign(defaultValues, overrides);
}

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