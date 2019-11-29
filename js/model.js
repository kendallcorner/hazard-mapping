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

        // try {
            state.site.bubbleplotList[bubbleplotId] = new Bubbleplot({
                name: getElementById('name').value,
                bubbleplotId: bubbleplotId,
                rangelist: rangelist
            }); 
        // } catch (error) {
        //     window.alert(error);
        //     EM.emit("change-panel");
        //     return;
        // // }
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
    defaultValues.bounds = new window.googleAPI.maps.LatLngBounds();

    for (const scenario of Object.keys(inputs.rangelist)) {
        const location = window.state.site.scenarioList[scenario];
        const myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);

        for (const range of inputs.rangelist[scenario]) {
            const circlePath = makeCirclePath(myLatLng, location[range]);
            defaultValues.path.push(circlePath);
            const lats = [];
            const lngs = [];
            for (const pair of circlePath) {
                lats.push(pair.lat);
                lngs.push(pair.lng);
            }
            const northEast = new window.googleAPI.maps.LatLng(Math.max(...lats), Math.max(...lngs));
            const southWest = new window.googleAPI.maps.LatLng(Math.min(...lats), Math.min(...lngs));
            defaultValues.bounds.union(new window.googleAPI.maps.LatLngBounds(southWest, northEast));
        }
    }
    const grid = gridify(defaultValues.bounds.getNorthEast(), defaultValues.bounds.getSouthWest());
    defaultValues.bounds.extend(grid[1]);
    defaultValues.bounds.extend(grid[0]);
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
    const lat = point.lat();
    const lng = point.lng();
    const points = 32; 
    const circlePath = [];
    for (let i=0; i < points + 1; i++) {
        const theta = toDeg(2 * Math.PI / points * i); 
        const newPoint = getNewLatLong(point, theta, radius);
        circlePath.push(newPoint);
    }

    return circlePath;
}

function getNewLatLong (point, bering, distance) {
    // bering: 0 is North, 90 is East, 180 is South, 270 is West
   distance = distance / 6367449;  
   bering = toRad(bering); 
   const lat1 = toRad(point.lat());
   const lon1 = toRad(point.lng());
   const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance) + 
                        Math.cos(lat1) * Math.sin(distance) * Math.cos(bering));
   const lon2 = lon1 + Math.atan2(Math.sin(bering) * Math.sin(distance) *
                                Math.cos(lat1), 
                                Math.cos(distance) - Math.sin(lat1) *
                                Math.sin(lat2));
   if (isNaN(lat2) || isNaN(lon2)) return null;
   return {lat: toDeg(lat2), lng: toDeg(lon2)};
}

function toRad (degrees) { return degrees * Math.PI / 180; }
function toDeg (radians) { return radians * 180 / Math.PI; }

function gridify(northEast, southWest) {
    const lngLeft = southWest.lng();
    const lngRight = northEast.lng();
    const latTop = northEast.lat();
    const latBottom = southWest.lat();
    const TL = new window.googleAPI.maps.LatLng({lat: latTop, lng: lngLeft});
    const TR = new window.googleAPI.maps.LatLng({lat: latTop, lng: lngRight});
    const BL = new window.googleAPI.maps.LatLng({lat: latBottom, lng: lngLeft});
    const distanceX = google.maps.geometry.spherical.computeDistanceBetween(TL, TR);
    const distanceY = google.maps.geometry.spherical.computeDistanceBetween(TL, BL);

    const gridSize = 10;

    const gridNx = Math.ceil(distanceX/10);
    const gridNy = Math.ceil(distanceY/10);

    const moveX = gridNx*gridSize - distanceX;
    const moveY = gridNy*gridSize - distanceY;
    console.log(moveY, moveX);

    const ne1 = new window.googleAPI.maps.LatLng(getNewLatLong(northEast, 90, moveX/2));
    const ne2 = getNewLatLong(ne1, 0, moveY/2);
    const sw1 = new window.googleAPI.maps.LatLng(getNewLatLong(southWest, 270, moveX/2));
    const sw2 = getNewLatLong(sw1, 180, moveY/2);

    return [ne2, sw2];
    // for (let x = 0; x > gridNx; x++) {
    //   for (let y = 0; y < gridNy; y++) {

    //   }
    // }
}