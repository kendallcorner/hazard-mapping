/*jshint esversion: 7 */
const { initController } = require("./controller");
const { initMap, initViews } = require("./views");
const { setupModel, gridToLatLng, latLngToGrid } = require("./model");
const events = require("events");
const EM = new events.EventEmitter();

window.initMap = initMap;
window.state = setupModel(EM);
initController(EM);
initViews(EM);
window.gridToLatLng = gridToLatLng;
window.latLngToGrid = latLngToGrid;

