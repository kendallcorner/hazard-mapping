/*jshint esversion: 7 */
const Handlebars = require("handlebars");
exports.getElementById = getElementById;
exports.initMap = initMap;
exports.initViews = initViews;
const NUMRANGES = 3;

/*
 * Sets up event listeners
 */
function initViews(EM) {
    EM.on("change-panel", () => {
        const panel = window.state.panel;
        const site = window.state.site;
        if (panel === "site-editor") {
            showSiteEditor(site, EM);
            mapSiteMarker(site);
        } else if (panel === "site-content") {
            showSiteContentPanel(site, EM);
            mapSiteMarker(site);
            mapAll(window.state.site.scenarioList);
            mapBubbleplots(window.state.site.bubbleplotList);
        } else if (panel === "scenario-editor") {
            showScenarioPanel(window.state.mapItem, EM);
            mapSiteMarker(site);
        } else if (panel === "bubbleplot-editor") {
            showBubbleplotPanel(window.state.mapItem, EM);
            mapSiteMarker(site);
            mapAll(window.state.site.scenarioList);
        } else {
            console.err("No panel of the name ", panel);
        }
    });
}


/*
 * Utility: Find an element on the page or throw a helpful error.
 */
function getElementById(id) {
    const input = document.getElementById(id);
    if (!input) {
        throw new Error(
            'Could not find the element with the id "' + id + '" on the page.'
        );
    }
    return input;
}

/**
 * Utility: Generic Function to create a Handlebars panel from a template script id
 */
function createHandlebarsViewFromTemplateId (elementId, templateId, context) {
    const templateInfo = getElementById(templateId).innerHTML;
    createHandlebarsViewFromTemplate(elementId,templateInfo, context);
}

/*
 * Utility: Generic Function to create a Handlebars panel from a template
 */
function createHandlebarsViewFromTemplate (elementId, templateInfo, context) {
    const element = getElementById(elementId);
    const template = Handlebars.compile(templateInfo);
    const templateData = template(context);
    element.innerHTML = templateData;
}

/*
 * Initializes the google maps map in the approriate div
 */
function initMap() {
    //Initialize map to arbitrary location.
    window.googleAPI = google;
    const myLatLng = new window.googleAPI.maps.LatLng(36.15911, -95.99374);
    //Home: 36.15911, -95.99374
    window.state.map = new window.googleAPI.maps.Map(getElementById('map'), {
        center: myLatLng,
        zoom: 18, 
        mapTypeId: 'satellite'});
    window.state.map.setTilt(0);
}

/*
 * Utility: Clears the Google Maps map of all markers and other features
 */
function clearMap() {
    const mapFeatures = window.state.mapFeatures;
    if(mapFeatures.siteMarker) { 
        mapFeatures.siteMarker.setMap(null); 
    }
    if(mapFeatures.scenarioList) { 
        for (const scenario of Object.values(mapFeatures.scenarioList)) {
            for (const mapFeature of Object.values(scenario)) {
                mapFeature.setMap(null);
            }
        }
    }
    if(mapFeatures.bubbleplotList) { 
        for (const mapFeature of Object.values(mapFeatures.bubbleplotList)) {
            mapFeature.setMap(null);
        }
    }
    window.state.mapFeatures = {};
}

/*
 * Utility: Sets the map back to the set middle location
 */
function returnHome(location) {
    const myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);
    window.state.map.panTo(myLatLng);
    window.state.map.setTilt(0);
    window.state.map.setZoom(location.zoom);
    // window.state.map.fitBounds(window.state.site.bounds);
}

/*
 * Clears map and maps the site marker
 */
function mapSiteMarker (location) {
    clearMap();
    const myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);
    window.state.map.panTo(myLatLng);
    window.state.map.setTilt(0);
    window.state.map.setZoom(18);
    createHandlebarsViewFromTemplate("title", "<h1>Site: {{name}} </h1>", location);
    if (window.state.mapFeatures.siteMarker) window.state.mapFeatures.siteMarker.setMap(null);
    window.state.mapFeatures.siteMarker = new window.googleAPI.maps.Marker({
        map: window.state.map,
        title: location.name,
        position: myLatLng,
        icon: "assets/sitePin.png"
    });
}

/*
 * Maps all scenario markers and hazard range circles
 */
function mapAll (scenarioList) {
    window.state.map.fitBounds(window.state.site.bounds);
    if (!window.state.mapFeatures) window.state.mapFeatures = {};
    if (!window.state.mapFeatures.scenarioList) window.state.mapFeatures.scenarioList = {};

    if (scenarioList && scenarioList != {}) {
        const scenarios = Object.entries(scenarioList);
        for (const [scenarioId, scenario] of scenarios) {
            const { hidden, rangesHidden } = scenario;
            if (!hidden) {
                mapScenario(scenarioId, scenario);
                if(!rangesHidden) { mapHazardRanges(scenarioId, scenario); }
            }
        }
    }
}

function mapBubbleplots (bubbleplotList) {
    if (!window.state.mapFeatures) window.state.mapFeatures = {};
    if (!window.state.mapFeatures.bubbleplotList) window.state.mapFeatures.bubbleplotList = {};

    if (bubbleplotList && bubbleplotList != {}) {
        const bubbleplots = Object.entries(bubbleplotList);
        for (const [ bubbleplotId, bubbleplot ] of bubbleplots) {
            const { hidden, name, path, paths, frequencyThresholds } = bubbleplot;
            if (!hidden) {
                if (path) {
                    window.state.mapFeatures.bubbleplotList[bubbleplotId] = new google.maps.Polygon({
                        paths: path,
                        strokeOpacity: 0,
                        strokeWeight: 0,
                        fillColor: "#F00",
                        fillOpacity: 0.35
                    });
                    window.state.mapFeatures.bubbleplotList[bubbleplotId].setMap(window.state.map);
                }
                if (paths) {
                    const colors =  ["#F0F", "#00F", "#0FF", "#0F0", "#FF0", "#F80","#F0F"];
                    for (let i = 0; i < paths.length; i++) {
                        if (paths[i]) console.log("map: ", frequencyThresholds[i], paths[i])
                        window.state.mapFeatures.bubbleplotList[bubbleplotId + i] = new google.maps.Polygon({
                            paths: paths[i],
                            strokeOpacity: 0,
                            strokeWeight: 0,
                            fillColor: colors[i],
                            fillOpacity: 0.35
                        });
                        window.state.mapFeatures.bubbleplotList[bubbleplotId + i].setMap(window.state.map);
                    }
                }
            }
        }
    }
}

function mapScenario (scenarioId, scenario) {
    const { name, latitude, longitude } = scenario;
    const myLatLng = new window.googleAPI.maps.LatLng(latitude, longitude);
    window.state.mapFeatures.scenarioList[scenarioId] = {};
    window.state.mapFeatures.scenarioList[scenarioId].marker = new window.googleAPI.maps.Marker({
        map: window.state.map,
        title: name,
        position: myLatLng,
        icon: "assets/scenario.png"
    });
}

function mapHazardRanges(scenarioId, scenario) {
    const { name, latitude, longitude } = scenario;
    const colors =  ["#F0F", "#F00", "#00F"];
    for (let i = 0; i < NUMRANGES; i++) {
        window.state.mapFeatures.scenarioList[scenarioId]['range'+i] = drawGoogleMapsCircle(
            latitude, longitude, scenario["range" + i].range, colors[i]);
    }
}

function drawGoogleMapsCircle(latitude, longitude, radius, color) {
    //creates Google Maps radius for HazMat
    const myLatLng = new google.maps.LatLng(Number(latitude), Number(longitude));
    const circle = new google.maps.Circle({
        map: window.state.map,
        radius: Number(radius),
        center: myLatLng,
        fillOpacity: 0,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
    });
    return circle;
}

/*
 * Bring up site editor panel
 */
function showSiteEditor(site, EM) {
    returnHome(site);
    createHandlebarsViewFromTemplateId("navigator", "site-template", site);

    getElementById("name").select();
    EM.emit("panel-created");
}

/*
 * Bring up site content panel
 */
function showSiteContentPanel (site, EM) {
    createHandlebarsViewFromTemplateId("navigator", "site-contents-panel", site);
    createHandlebarsViewFromTemplateId("edit-save-btn-group", "site-template-buttons", {});
    EM.emit("panel-created");
}

/*
 * Bring up scenario editor panel
 */
function showScenarioPanel (scenarioId, EM) {
    if(!window.state.mapFeatures.scenarioList) 
        window.state.mapFeatures.scenarioList = {};
    const site = window.state.site;
    const scenario = setNewOrGetScenario(site);
    const model = setNewOrGetModel(scenario);
    createHandlebarsViewFromTemplateId("navigator", "scenario-panel", scenario);
    createHandlebarsViewFromTemplateId("modalDiv", "model-modal", model);
    // remove from current scenario from map
    if(window.state.mapFeatures.scenarioList[scenarioId]) { 
        window.state.mapFeatures.scenarioList[scenarioId].marker.setMap(null); 
    }

    const dropdown = getElementById("tnoCurveSelect");
    for (const optionText of Object.keys(window.state.tnoTable)) {
        const option = document.createElement("option");
        option.text = optionText;
        dropdown.add(option);
    }
    dropdown.options[5].selected = true;

    getElementById("name").select();
    EM.emit("panel-created");

    function setNewOrGetScenario(site) {
        if (!scenarioId) {
            return {
                name: "scenario-" + window.state.scenarioCount, 
                latitude: site.latitude, 
                longitude: site.longitude
            };
        } else { 
            return site.scenarioList[scenarioId];
        }
    }

    function setNewOrGetModel(scenario) {
        if (!scenario.model) {
            return {
                metricEnglish: "metric",
                tnoVolume: "1000",
                tnoHeat: "3500",
                tnoAtmPress: "1013.25",
                tnoPressThresh: ["500", "100", "50"]
            };
        } else { 
            return scenario.model;
        }
    }
}

/*
 * Bring up bubbleplot editor panel
 */
function showBubbleplotPanel (scenarioId, EM) {
    createHandlebarsViewFromTemplateId("navigator", "bubbleplot-panel", window.state.site);
    EM.emit("panel-created");
}
