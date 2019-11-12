/*jshint esversion: 7 */
const Handlebars = require("handlebars");
exports.getElementById = getElementById;
exports.initMap = initMap;
exports.initViews = initViews;

/*
 * Sets up event listeners
 */
function initViews(EM) {
    EM.on("change-panel", () => {
        const panel = window.state.panel;
        const site = window.state.site;
        if (panel === "site-editor") {
            showSiteEditor(site, EM);
        } else if (panel === "site-content") {
            showSiteContentPanel(site, EM);
        } else if (panel === "scenario-editor") {
            showScenarioPanel(window.state.scenarioId, EM);
        } else {
            console.err("No panel of the name ", panel);
        }
    });

    EM.on("map-site", mapLocation);
    EM.on("map-scenarios", mapScenarios);
}

/**
 * Find an element on the page or throw a helpful error.
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
 * Generic Function to creat a Handlebars panel from a template script id
 */

function createHandlebarsViewFromTemplateId (elementId, templateId, context) {
    const templateInfo = getElementById(templateId).innerHTML;
    createHandlebarsViewFromTemplate(elementId,templateInfo, context);
}

function createHandlebarsViewFromTemplate (elementId, templateInfo, context) {
    const element = getElementById(elementId);
    const template = Handlebars.compile(templateInfo);
    const templateData = template(context);
    element.innerHTML = templateData;
}

/**
 * Initialized the google maps map in the approriate div
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

/**
 * Finds location on the map and sets the title to the name of the site
 */
function mapLocation (location) {
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

function mapScenarios (editScenarioid) {
    const scenarios = Object.entries(window.state.site.scenarioList);
    for (const [scenarioId, scenario] of scenarios) {
        if (window.state.mapFeatures.scenarioMarker[scenarioId]) {
        // if the scenario marker already exists
            if (editScenarioid == scenarioId) {
            // update if it's the one updating
                window.state.mapFeatures.scenarioMarker[editScenarioid].setMap(null);
            } else {
            // or else skip the making of the marker below
                continue;
            }
        }
        const myLatLng = new window.googleAPI.maps.LatLng(scenario.latitude, scenario.longitude);
        window.state.mapFeatures.scenarioMarker[scenarioId] = new window.googleAPI.maps.Marker({
            map: map,
            title: scenario.name,
            position: myLatLng,
            icon: "http://192.168.11.75:9966/assets/scenario.png"
        });
    }
}


/**
 * Bring up site editor panel
 */
function showSiteEditor(site, EM) {
    if (!site) {
        site = {
            name: "Home",
            latitude: 36.15911,
            longitude: -95.99374
        };
    }
    createHandlebarsViewFromTemplateId("navigator", "site-template", site);
    controls = getElementById("controls");
    getElementById("name").select();
    EM.emit("panel-created");
}

function showSiteContentPanel (site, EM) {
    createHandlebarsViewFromTemplateId("navigator", "site-contents-panel", site);
    createHandlebarsViewFromTemplateId("edit-save-btn-group", "site-template-buttons", {});
    EM.emit("panel-created");
}

function showScenarioPanel (scenarioId, EM) {
    const scenario = window.state.site.scenarioList[scenarioId];
    createHandlebarsViewFromTemplateId("navigator", "scenario-panel", scenario);
    EM.emit("panel-created");
}