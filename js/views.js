/*jshint esversion: 7 */
const Handlebars = require("handlebars");
const { EM } = require("./controller");
const model = require("./model");
exports.getElementById = getElementById;

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
 * Initialized the google maps map in the approriate div
 */
window.initMap = function initMap() {
    //Initialize map to arbitrary location.
    const myLatLng = new google.maps.LatLng(36.15911, -95.99374);
    //Home: 36.15911, -95.99374
    map = new google.maps.Map(getElementById('map'), {
        center: myLatLng,
        zoom: 18, 
        mapTypeId: 'satellite'});
    map.setTilt(0);
};

/**
 * Listener to bring up site editor panel
 */
getElementById("new-site").addEventListener("click", function () {
    //creates a new site and gathers inputs for it.
    createHandlebarsView("navigator", "site-template", {
        siteName: "Home",
        lat: 36.15911,
        lon: -95.99374
    });
    getElementById("name").select();
    google.maps.event.addListener(map, "click", function (event) {
        getElementById("lat").value = event.latLng.lat().toFixed(5);
        getElementById("lon").value = event.latLng.lng().toFixed(5);
    });

    EM.emit("site-editor-initialized");
});

/**
 * Generic Function to creat an Handlebars panel from a template
 */
function createHandlebarsView (elementId, templateId, context) {
    const element = getElementById(elementId);
    const templateInfo = getElementById(templateId).innerHTML;
    const template = Handlebars.compile(templateInfo);
    const templateData = template(context);
    element.innerHTML = templateData;
}

/**
 * Finds location on the map and sets the title to the name of the site
 */
EM.on("mapLocation", (location) => {
    var myLatLng = new google.maps.LatLng(location.latitude, location.longitude);
    var mapOptions = {
        center: myLatLng,
        zoom: 18,
        mapTypeId: 'satellite'
    };
    map = new google.maps.Map(getElementById('map'), mapOptions);
    map.setTilt(0);

    createHandlebarsView("title", "site-title-template", {
        name: location.name,
        lat: location.latitude,
        lon: location.longitude
    });
});

/**
 * Sets up the Site content Panel
 */
EM.on("show-site-content-panel", (location) => {
    createHandlebarsView("navigator", "site-contents-panel", location);
    EM.emit("site-content-panel-created");
});

/**
 * Sets up the scenario panel
 */
EM.on("show-scenario-panel", (scenarioInfo) => {
    createHandlebarsView("navigator", "scenario-panel", scenarioInfo);
    EM.emit("scenario-panel-created");
});