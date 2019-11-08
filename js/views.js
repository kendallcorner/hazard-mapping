/*jshint esversion: 7 */
const Handlebars = require("handlebars");
exports.getElementById = getElementById;
exports.initMap = initMap;
exports.initViews = initViews;

/*
 * Sets up event listeners
 */
function initViews(EM) {
    EM.on("site-editor-open", (site) => {openSiteEditor(site,EM);});

    EM.on("map-site", mapLocation);

    // Sets up the Site content Panel
    EM.on("show-site-content-panel", (location) => {
        createHandlebarsViewFromTemplateId("navigator", "site-contents-panel", location);
        createHandlebarsViewFromTemplateId("edit-save-btn-group", "site-template-buttons", {});
        EM.emit("site-content-panel-created");
    });

    // Sets up the scenario panel
    EM.on("show-scenario-panel", (scenarioInfo) => {showScenarioPanel(scenarioInfo, EM);});
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

function showScenarioPanel (scenarioInfo, EM) {
    createHandlebarsViewFromTemplateId("navigator", "scenario-panel", scenarioInfo);
    EM.emit("scenario-panel-created");
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
 * Bring up site editor panel
 */
function openSiteEditor(site, EM) {
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
    EM.emit("site-editor-initialized");
}

/**
 * Finds location on the map and sets the title to the name of the site
 */
function mapLocation (location) {
    var myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);
    var mapOptions = {
        center: myLatLng,
        zoom: 18,
        mapTypeId: 'satellite'
    };
    map = new window.googleAPI.maps.Map(getElementById('map'), mapOptions);
    map.setTilt(0);

    createHandlebarsViewFromTemplate("title", "<h1>Site: {{name}} </h1>", {
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude
    });
}