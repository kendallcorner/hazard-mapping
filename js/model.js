/*jshint esversion: 7 */
const { getElementById } = require("./views");
exports.setupModel = setupModel;

function setupModel(EM) {
    const state = {
        panel: "home",
        mapFeatures: {},
        scenarioCount: 0,
        scenarioId: null,
        bubbleplotId: null,
        site: {
            name: "Home",
            latitude: 36.15911,
            longitude: -95.99374,
            zoom: 18
        },
        tnoTable: {}
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
        state.mapItem = scenarioId;
        try {
            state.site.scenarioList[scenarioId] = new Scenario({
                name: getElementById('name').value,
                scenarioId: scenarioId,
                material: getElementById('material').value,
                latitude: Number(getElementById('latitude').value),
                longitude: Number(getElementById('longitude').value),
                range0: getElementById('range-0').value,
                frequency0: getElementById('frange-0').value,
                range1: getElementById('range-1').value,
                frequency1: getElementById('frange-1').value,
                range2: getElementById('range-2').value,
                frequency2: getElementById('frange-2').value
            }); 
        } catch (error) {
            window.alert(error);
            EM.emit("change-panel");
            return;
        }
        window.state.panel = "site-content";
        window.state.mapItem = null;
        EM.emit("change-panel");
    });

    EM.on("create-bubbleplot", (bubbleplotId) => {
        if (!bubbleplotId) {
            bubbleplotId = "bubbleplot-" + state.scenarioCount;
            state.scenarioCount +=  1;
        }
        state.bubbleplotId = bubbleplotId;
        let rangelist = {};
        for (const scenario of Object.keys(state.site.scenarioList)) {
            const range0check = getElementById(scenario + "-range0");
            const range1check = getElementById(scenario + "-range1");
            const range2check = getElementById(scenario + "-range2");
            if (range0check || range1check || range2check) rangelist[scenario] = [];
            if (range0check.checked) rangelist[scenario].push("range0");
            if (range1check.checked) rangelist[scenario].push("range1");
            if (range2check.checked) rangelist[scenario].push("range2");
        }

        try {
            state.site.bubbleplotList[bubbleplotId] = new Bubbleplot({
                name: getElementById('name').value,
                bubbleplotId: bubbleplotId,
                rangelist: rangelist
            }); 
        } catch (error) {
            window.alert(error);
            EM.emit("change-panel");
            return;
        }
        window.state.panel = "site-content";
        window.state.mapItem = null;
        EM.emit("change-panel");
    });

    EM.on("delete-siteItem", () => {
        if(state.site.scenarioList[state.mapItem]) {
           delete state.site.scenarioList[state.mapItem];
           window.state.panel = "site-content";
           window.state.mapItem = null;
           EM.emit("change-panel");
         } else if (state.site.bubbleplotList[state.mapItem]) {
           delete state.site.bubbleplotList[state.mapItem];
           window.state.panel = "site-content";
           window.state.mapItem = null;
           EM.emit("change-panel");
         } else {
             throw new Error("No scenarioMarker exists for " + state.mapItem);
         }
    });

    try {
        $.getJSON("data/tnoTable.json", function(json) {
            state.tnoTable = json;
        });
    } catch (error) {
        throw new Error("Error Loading data: ", error);
    }

    return state;
}

function Scenario (scenarioInputs) {
    if (!scenarioInputs.name) throw new Error("Name is required");
    if (!scenarioInputs.latitude) throw new Error("Latitude is required (click to place on map)");    
    if (!scenarioInputs.longitude) throw new Error("Longitude is required (click to place on map)");
    if (!scenarioInputs.scenarioId) throw new Error("ScenarioId is not being assigned");

    const defaultValues = {
        material: null,
        hidden: false,
        rangesHidden: false
    };
    scenarioInputs.latitude = Number(scenarioInputs.latitude).toFixed(5);
    scenarioInputs.longitude = Number(scenarioInputs.longitude).toFixed(5);
    return Object.assign(this, defaultValues, scenarioInputs);
}

function Bubbleplot (inputs) {
    if (!inputs.name) throw new Error("Name is required");
    if (!inputs.bubbleplotId) throw new Error("bubbleplotId is not being assigned");
    if (inputs.rangelist === []) throw new Error("At least one range must be selected");

    const defaultValues = {
        hidden: false,
        rangesHidden: false,
    };

    defaultValues.path = [];
    for (const scenario of Object.keys(inputs.rangelist)) {
        const location = window.state.site.scenarioList[scenario];
        const myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);
        for (const range of inputs.rangelist[scenario]) {
            defaultValues.path.push(makeCirclePath(myLatLng, location[range]));
        }
    }
    return Object.assign(this, defaultValues, inputs);
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
        scenarioList: {},
        bubbleplotList: {}
    };
    overrides.latitude = Number(overrides.latitude).toFixed(5);
    overrides.longitude = Number(overrides.longitude).toFixed(5);
    return Object.assign(defaultValues, overrides);
}

function makeCirclePath(point, radius) { 
    // https://stackoverflow.com/questions/23154254/google-map-multiple-overlay-no-cumulative-opacity
    const d2r = Math.PI / 180;   // degrees to radians 
    const r2d = 180 / Math.PI;   // radians to degrees 
    const earthsradius = 6371000; // 3963 is the radius of the earth in meters
    const points = 32; 

    // find the raidus in lat/lon 
    const rlat = (radius / earthsradius) * r2d; 
    const rlng = rlat / Math.cos(point.lat() * d2r); 

    const extp = [];
    for (let i=0; i < points + 1; i++) {
        const theta = Math.PI * (i / (points/2)); 
        const ey = point.lng() + (rlng * Math.cos(theta)); // center a + radius x * cos(theta) 
        const ex = point.lat() + (rlat * Math.sin(theta)); // center b + radius y * sin(theta) 
        extp.push(new google.maps.LatLng(ex, ey));
    }
    return extp;
}