/*jshint esversion: 7 */
const Handlebars = require("handlebars");
const { EM } = require("./controller");
const model = require("./model");
exports.getElementById = getElementById;
exports.initMap = initMap;

/*
 * Sets up event listeners
 */
function init() {
    getElementById("new-site").addEventListener("click", openSiteEditor);

    EM.on("map-site", mapLocation);

    // Sets up the Site content Panel
    EM.on("show-site-content-panel", (location) => {
        createHandlebarsView("navigator", "site-contents-panel", location);
        EM.emit("site-content-panel-created");
    });

    // Sets up the scenario panel
    EM.on("show-scenario-panel", showScenarioPanel);
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
function createHandlebarsView (elementId, templateId, context) {
    const element = getElementById(elementId);
    const templateInfo = getElementById(templateId).innerHTML;
    const template = Handlebars.compile(templateInfo);
    const templateData = template(context);
    element.innerHTML = templateData;
}

function showScenarioPanel (scenarioInfo) {
    createHandlebarsView("navigator", "scenario-panel", scenarioInfo);
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
function openSiteEditor() {
    //creates a new site and gathers inputs for it.
    createHandlebarsView("navigator", "site-template", {
        siteName: "Home",
        lat: 36.15911,
        lon: -95.99374
    });
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

    createHandlebarsView("title", "site-title-template", {
        name: location.name,
        lat: location.latitude,
        lon: location.longitude
    });
}

init();