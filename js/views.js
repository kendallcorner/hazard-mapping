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
        } else if (panel === "scenario-editor") {
            showScenarioPanel(window.state.scenarioId, EM);
            mapSiteMarker(site);
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
    map = new window.googleAPI.maps.Map(getElementById('map'), {
        center: myLatLng,
        zoom: 18, 
        mapTypeId: 'satellite'});
    map.setTilt(0);
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
    window.state.mapFeatures = {};
}

/*
 * Utility: Sets the map back to the set middle location
 */
function returnHome(location) {
    const myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);
    map.panTo(myLatLng);
    map.setTilt(0);
    map.setZoom(location.zoom);
}

/*
 * Clears map and maps the site marker
 */
function mapSiteMarker (location) {
    clearMap();
    const myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);
    map.panTo(myLatLng);
    map.setTilt(0);
    map.setZoom(18);
    createHandlebarsViewFromTemplate("title", "<h1>Site: {{name}} </h1>", location);
    if (window.state.mapFeatures.siteMarker) window.state.mapFeatures.siteMarker.setMap(null);
    window.state.mapFeatures.siteMarker = new window.googleAPI.maps.Marker({
        map: map,
        title: location.name,
        position: myLatLng,
        icon: "http://192.168.11.75:9966/assets/sitePin.png"
    });
}

/*
 * Maps all scenario markers and hazard range circles
 */
function mapAll (scenarioList) {
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

function mapScenario (scenarioId, scenario) {
    const { name, latitude, longitude } = scenario;
    const myLatLng = new window.googleAPI.maps.LatLng(latitude, longitude);
    window.state.mapFeatures.scenarioList[scenarioId] = {};
    window.state.mapFeatures.scenarioList[scenarioId].marker = new window.googleAPI.maps.Marker({
        map: map,
        title: name,
        position: myLatLng,
        icon: "http://192.168.11.75:9966/assets/scenario.png"
    });
}

function mapHazardRanges(scenarioId, scenario) {
    const { name, latitude, longitude } = scenario;
    const colors =  ["#F0F", "#F00", "#00F"];
    for (let i = 0; i < NUMRANGES; i++) {
        window.state.mapFeatures.scenarioList[scenarioId]['range'+i] = drawGoogleMapsCircle(latitude, longitude, scenario["range" + i], colors[i]);
    }
}

function drawGoogleMapsCircle(latitude, longitude, radius, color) {
    //creates Google Maps radius for HazMat
    const myLatLng = new google.maps.LatLng(Number(latitude), Number(longitude));
    const circle = new google.maps.Circle({
        map: map,
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
    createHandlebarsViewFromTemplateId("navigator", "scenario-panel", scenario);
    // remove from current scenario from map
    if(window.state.mapFeatures.scenarioList[scenarioId]) { 
        window.state.mapFeatures.scenarioList[scenarioId].marker.setMap(null); 
    }
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
}

