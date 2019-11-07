const { EM } = require("./controller");

let myLocation = {};

EM.on("new-site", (siteData) => {
    myLocation = siteData;
    console.log(myLocation);
    EM.emit("mapLocation", myLocation);
    EM.emit("showHazMatMenu", myLocation);
});

exports.myLocation = myLocation;