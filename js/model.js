/*jshint esversion: 7 */
const { getElementById } = require("./views");
exports.setupModel = setupModel;

function setupModel(EM) {
    const state = {
        panel: "home",
        mapFeatures: {},
        scenarioCount: 0,
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
        state.mapFeatures.scenarioMarkerList = {};
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
                range1: getElementById('range-1').value,
                frequencyRange1: getElementById('frange-1').value,
                range2: getElementById('range-2').value,
                frequencyRange2: getElementById('frange-2').value,
                range3: getElementById('range-3').value,
                frequencyRange3: getElementById('frange-3').value
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
    return state;
}


function makeScenario (overrides) {
    if (!overrides.name) throw new Error("Name is required");
    if (!overrides.latitude) throw new Error("Latitude is required (click to place on map)");    
    if (!overrides.longitude) throw new Error("Longitude is required (click to place on map)");
    if (!overrides.scenarioId) throw new Error("ScenarioId is not being assigned: " + overrides.scenarioId);

    const defaultValues = {
        material: null,
        range1: null,
        frequencyRange1: null,
        range2: null,
        frequencyRange2: null,
        range3: null,
        frequencyRange3: null,
    };
    return Object.assign(defaultValues, overrides);
}
