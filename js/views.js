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
 * Listener to bring up new site panel
 */
getElementById("new-site").addEventListener("click", function () {
    //creates a new site and gathers inputs for it.
    const navigator = getElementById("navigator");
    navigator.innerHTML = "";
    const templateInfo = getElementById("site-template").innerHTML;
    const template = Handlebars.compile(templateInfo);
    const context = {
        siteName: "Home",
        lat: 36.15911,
        lon: -95.99374
    };
    const templateData = template(context);
    navigator.innerHTML += templateData;
    getElementById("name").select();
    google.maps.event.addListener(map, "click", function (event) {
        getElementById("lat").value = event.latLng.lat().toFixed(5);
        getElementById("lon").value = event.latLng.lng().toFixed(5);
    });

    EM.emit("site-editor-initialized");


});

EM.on("site-editor-cancel", clearDiv);
function clearDiv (div) {
    getElementById(div).innerHTML = "";
}
