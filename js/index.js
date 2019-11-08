/*jshint esversion: 7 */
const { initController } = require("./controller");
const { initMap, initViews } = require("./views");
const { setupModel } = require("./model");
const events = require("events");
const EM = new events.EventEmitter();

window.initMap = initMap;
window.state = setupModel(EM);
initController(EM);
initViews(EM);

