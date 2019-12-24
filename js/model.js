/*jshint esversion: 7 */
const { getElementById } = require("./views");
const { makeThresholdPaths } = require("./isolines.js");
exports.setupModel = setupModel;
exports.latLngToGrid = latLngToGrid;
exports.gridToLatLng = gridToLatLng;

function setupModel(EM) {
    const state = {
        panel: "home",
        mapFeatures: {},
        scenarioCount: 0,
        scenarioId: null,
        bubbleplotId: null,
        site: {
            name: "Home",
            latitude: 36.15911,
            longitude: -95.99374,
            zoom: 18,
        },
        tnoTable: {}
    };

    /**
     * Create new site
     */
    EM.on("new-site-submitted", () => {
        try {
            const latDelta = 0.001;
            const lngDelta = 0.001;
            const latitude = Number(getElementById('latitude').value);
            const longitude = Number(getElementById('longitude').value);
            state.site = makeSite({
                name:  getElementById('name').value,
                latitude,
                longitude,
                zoom: 18,
                bounds: new window.googleAPI.maps.LatLngBounds(
                    {lat: latitude - latDelta, lng: longitude - lngDelta},
                    {lat: latitude + latDelta, lng: longitude + lngDelta} )
            });
        } catch (error) {
            window.alert(error);
            EM.emit("change-panel");
            return;
        }
        state.panel = "site-content";
        EM.emit("change-panel");
    });

    /**
     * Grab info from scenario input panel
     */
    EM.on("create-edit-scenario", (scenarioId) => {
        if (!scenarioId) {
            scenarioId = "scenario-" + state.scenarioCount;
            state.scenarioCount +=  1;
        }
        state.mapItem = scenarioId;
        try {
            state.site.scenarioList[scenarioId] = new Scenario({
                name: getElementById('name').value,
                scenarioId: scenarioId,
                material: getElementById('material').value,
                latitude: Number(getElementById('latitude').value),
                longitude: Number(getElementById('longitude').value),
                range0: {
                    range: getElementById('range-0').value,
                    frequency: getElementById('frange-0').value
                },
                range1: {
                    range: getElementById('range-1').value,
                    frequency: getElementById('frange-1').value
                },
                range2: {
                    range: getElementById('range-2').value,
                    frequency: getElementById('frange-2').value
                },
                model: state.currentModel
            }); 
        } catch (error) {
            window.alert(error);
            EM.emit("change-panel");
            return;
        }
        window.state.panel = "site-content";
        window.state.mapItem = null;
        EM.emit("change-panel");
    });

    EM.on("create-bubbleplot", (bubbleplotId) => {
        if (!bubbleplotId) {
            bubbleplotId = "bubbleplot-" + state.scenarioCount;
            state.scenarioCount +=  1;
        }
        state.bubbleplotId = bubbleplotId;
        const rangelist = {};
        const modellist = [];
        for (const scenario of Object.keys(state.site.scenarioList)) {
            const scenarioCheck = getElementById(scenario);
            const range0check = getElementById(scenario + "-range0");
            const range1check = getElementById(scenario + "-range1");
            const range2check = getElementById(scenario + "-range2");
            if (range0check || range1check || range2check) rangelist[scenario] = [];
            if (scenarioCheck.checked) modellist.push(scenario);
            if (range0check.checked) rangelist[scenario].push("range0");
            if (range1check.checked) rangelist[scenario].push("range1");
            if (range2check.checked) rangelist[scenario].push("range2");
        }

        // try {
             const bubbleplot = new Bubbleplot({
                name: getElementById('name').value,
                bubbleplotId: bubbleplotId,
                rangelist,
                modellist,
                bubbleplotType: getElementById("bubbleplot-type").value,
                minThreshold: getElementById("min-threshold").value
            }); 
            console.log(bubbleplot.bounds);
            state.site.bounds.union(bubbleplot.bounds);
            state.site.bubbleplotList[bubbleplotId] = bubbleplot;
        // } catch (error) {
        //     window.alert(error);
        //     EM.emit("change-panel");
        //     return;
        // // }
        window.state.panel = "site-content";
        window.state.mapItem = null;
        EM.emit("change-panel");
    });

    EM.on("delete-siteItem", () => {
        if(state.site.scenarioList[state.mapItem]) {
           delete state.site.scenarioList[state.mapItem];
           window.state.panel = "site-content";
           window.state.mapItem = null;
           EM.emit("change-panel");
         } else if (state.site.bubbleplotList[state.mapItem]) {
           delete state.site.bubbleplotList[state.mapItem];
           window.state.panel = "site-content";
           window.state.mapItem = null;
           EM.emit("change-panel");
         } else {
             throw new Error("No scenarioMarker exists for " + state.mapItem);
         }
    });

    try {
        $.getJSON("data/tnoTable.json", function(json) {
            state.tnoTable = json;
        });
    } catch (error) {
        throw new Error("Error Loading data: ", error);
    }

    EM.on("get-model-info", () => { getModelData("tnoModel", state, EM); });

    return state;
}

function Scenario (scenarioInputs) {
    if (!scenarioInputs.name) throw new Error("Name is required");
    if (!scenarioInputs.latitude) throw new Error("Latitude is required (click to place on map)");    
    if (!scenarioInputs.longitude) throw new Error("Longitude is required (click to place on map)");
    if (!scenarioInputs.scenarioId) throw new Error("ScenarioId is not being assigned");

    const defaultValues = {
        material: null,
        hidden: false,
        rangesHidden: false,
        model: {}
    };
    scenarioInputs.latitude = Number(scenarioInputs.latitude).toFixed(5);
    scenarioInputs.longitude = Number(scenarioInputs.longitude).toFixed(5);
    return Object.assign(this, defaultValues, scenarioInputs);
}

function Bubbleplot (inputs) {
    if (!inputs.name) throw new Error("Name is required");
    if (!inputs.bubbleplotId) throw new Error("bubbleplotId is not being assigned");
    if (inputs.rangelist === []) throw new Error("At least one range must be selected");
    if (inputs.bubbleplotType=="f-model" && inputs.minThreshold == "") { 
        throw new Error("Minimum threshold is required for modeling type");
    }

    const defaultValues = {
        hidden: false,
        rangesHidden: false,
        frequencyThresholds: [1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 0.01, 0.1]
    };

    const bubbleplotData = {
        path: [],
        fMap: [],
        bounds: new window.googleAPI.maps.LatLngBounds()
    };

    Object.assign(bubbleplotData, defaultValues, inputs);

    if (inputs.bubbleplotType=="union") {
        [ bubbleplotData.path, bubbleplotData.bounds ] = 
            makeUnionBubblePlot(inputs.rangelist);

    } else if (inputs.bubbleplotType=="f-input") { 
        [ bubbleplotData.notused, bubbleplotData.bounds ] = 
            makeUnionBubblePlot(inputs.rangelist);
        bubbleplotData.paths = 
            makeFinputBubblePlot(bubbleplotData);
        //     makeUnionBubblePlot(inputs.rangelist);
        // const grid = gridify(bubbleplotData);

    } else if (inputs.bubbleplotType=="f-model") {
        //find circles from minthreshold and add to path and bounds
        [ bubbleplotData.path, bubbleplotData.bounds ] = 
            makeFmodelBubblePlot(bubbleplotData);

    } else { throw new Error('Incorrect bubbleplotType', bubbleplotType); }

    return Object.assign(this, bubbleplotData);
}

function makeFinputBubblePlot(bubbleplotData) {
    console.log("makeFinputBubblePlot")
    const paths = gridify(bubbleplotData);
    return paths;
}

// function frequencyPathsFromGrid(frequencyGrid) {
//     // body...
// }

function latLngScenarioToGridScenarios(rangelist, grid) {
    console.log("latLngScenarioToGridScenarios")
    const gridScenarios = [];
    for (const scenario of Object.keys(rangelist)) {
        const [ gridX, gridY ] = latLngToGrid(window.state.site.scenarioList[scenario].latitude,
            window.state.site.scenarioList[scenario].longitude, grid );
        for (const range of rangelist[scenario]) {
            console.log(range);
            const radius = window.state.site.scenarioList[scenario][range].range;
            console.log(radius);
            const frequency = window.state.site.scenarioList[scenario][range].frequency;
            gridScenarios.push({gridX, gridY, radius, frequency});
        }
    }
    console.log(gridScenarios);
    return gridScenarios;
}

function makeFmodelBubblePlot(rangelist) {
    // const grid = gridify(bubbleplotData);
    // bubbleplotData.bounds.extend(grid[1]);
    // bubbleplotData.bounds.extend(grid[0]);
}

function makeUnionBubblePlot(rangelist) {
    const path = [];
    const bounds = new window.googleAPI.maps.LatLngBounds();
    for (const scenario of Object.keys(rangelist)) {
        const location = window.state.site.scenarioList[scenario];
        const myLatLng = new window.googleAPI.maps.LatLng(location.latitude, location.longitude);

        for (const range of rangelist[scenario]) {
            const circlePath = makeCirclePath(myLatLng, location[range].range);
            path.push(circlePath);
            const lats = [];
            const lngs = [];
            for (const pair of circlePath) {
                lats.push(pair.lat);
                lngs.push(pair.lng);
            }
            bounds.union({
                east: Math.max(...lngs), 
                north: Math.max(...lats), 
                south: Math.min(...lats), 
                west: Math.min(...lngs)
            });
        }
    }
    return [path, bounds];
}


function makeSite (overrides) {
    if (!overrides.name) throw new Error("Name is required");
    if (!overrides.latitude) throw new Error("Latitude is required (click to place on map)");    
    if (!overrides.longitude) throw new Error("Longitude is required (click to place on map)");

    const defaultValues = {
        scenarioList: {},
        bubbleplotList: {}
    };
    overrides.latitude = Number(overrides.latitude).toFixed(5);
    overrides.longitude = Number(overrides.longitude).toFixed(5);
    return Object.assign(defaultValues, overrides);
}

function makeCirclePath(point, radius) { 
    const lat = point.lat();
    const lng = point.lng();
    const points = 32; 
    const circlePath = [];
    for (let i=0; i < points + 1; i++) {
        const theta = toDeg(2 * Math.PI / points * i); 
        const newPoint = getNewLatLong(point, theta, radius);
        circlePath.push(newPoint);
    }

    return circlePath;
}

/*
 * Converts lat lng to grid x and y
 *       A             B
 *        +---+---+---+
 *        |   |   |   |
 *        +---+---+---+
 *        |   |   |   |
 *        +---+---+---+
 *        |   |   |   |
 *        +---+---+---+
 *       C             D
 *   A: (x,y) = (0, gridNy*gridSize)
 *      (lat, lng) = northEast.lat(), southWest.lng()
 *   B: (x,y) = (gridNx*gridSize, gridNy*gridSize)
 *      (lat, lng) = northEast.lat(), northEast.lng()
 *   C: (x,y) = (0, 0)
 *      (lat, lng) = southWest.lat(), southWest.lng()
 */
function latLngToGrid (lat, lng, grid) {
    console.log("latlngToGrid")
    console.log(lat, lng, grid);
    // interpolate(x1, y1, x2, y2, x)
    // interpolating for x is along AB.
    // interp_x is lng, interp_y is x
    // x1 = A.lng y1 = A.x x2 = B.lng y2 = B.x
    const x = interpolate(
        grid.southWest.lng,
        0, 
        grid.northEast.lng,
        grid.gridNx*grid.gridSize,
        lng
    );
    // interpolating for x is along AC.
    // interp_x is lat, interp_y is y
    // x1 = A.lat y1 = A.y x2 = C.lat y2 = C.y
    const y = interpolate(
        grid.northEast.lat,
        grid.gridNy*grid.gridSize,
        grid.southWest.lat,
        0,
        lat
    );
    console.log(x, y)
    return [x, y];
}
/*
 * Converts x, y grid coordinates to lat and lng
 * see graphic for latLngToGrid above for line segment references
 */
function gridToLatLng (x, y, grid) {
    // interpolate(x1, y1, x2, y2, x)
    // interpolating for lat is along AC.
    // interp_x is y, interp_y is lat
    // x1 = A.y y1 = A.lat x2 = C.y y2 = C.lat
    const lat = interpolate(
        grid.gridNy*grid.gridSize,
        grid.northEast.lat,
        0,
        grid.southWest.lat,
        y
    );
    // interpolating for lng is along AB.
    // interp_x is x, interp_y is lng
    // x1 = A.x y1 = A.lng x2 = B.x y2 = B.lng
    const lng = interpolate(
        0,
        grid.southWest.lng,
        grid.gridNx*grid.gridSize,
        grid.northEast.lng,
        x
    );
    return[lat, lng];
}

function getNewLatLong (point, bering, distance) {
    // bering: 0 is North, 90 is East, 180 is South, 270 is West
   distance = distance / 6367449;  
   bering = toRad(bering); 
   const lat1 = toRad(point.lat());
   const lon1 = toRad(point.lng());
   const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance) + 
                        Math.cos(lat1) * Math.sin(distance) * Math.cos(bering));
   const lon2 = lon1 + Math.atan2(Math.sin(bering) * Math.sin(distance) *
                                Math.cos(lat1), 
                                Math.cos(distance) - Math.sin(lat1) *
                                Math.sin(lat2));
   if (isNaN(lat2) || isNaN(lon2)) return null;
   return {lat: toDeg(lat2), lng: toDeg(lon2)};
}

function toRad (degrees) { return degrees * Math.PI / 180; }
function toDeg (radians) { return radians * 180 / Math.PI; }

function gridify(bubbleplotData) {
    console.log("gridify")
    const northEast = bubbleplotData.bounds.getNorthEast();
    const southWest = bubbleplotData.bounds.getSouthWest();
    const { distanceX, distanceY } = getDistanceXYLatLngSquare(northEast, southWest);

    const gridSize = 5;
    const gridNx = Math.ceil(distanceX/gridSize);
    const gridNy = Math.ceil(distanceY/gridSize);
    console.log("gridify: ", gridNx, gridNy);
    const grid = {gridNx, gridNy, gridSize, northEast, southWest};

    const [ newNorthEast, newSouthWest ] = centerNESWonGrid(grid, distanceX, distanceY);
    grid.northEast = newNorthEast;
    grid.southWest = newSouthWest;

    const frequencyGrid = Array.from(
        { length: gridNx }, () => Array.from(
            { length: gridNy }, () => 0
        )
    );
    const latLngPaths = Array.from({ length: bubbleplotData.frequencyThresholds.length }, () => []);
    const gridScenarios = latLngScenarioToGridScenarios(bubbleplotData.rangelist, grid);
    // TODO: convert modellist to use grid coordinates
    // grid size is rounded up from area size and is centered on the available area

    for (let x = 0; x < gridNx; x++) {
      for (let y = 0; y < gridNy; y++) {
          //build frequency grid based on rangelist or modellist
          let frequencySum = 0;
          if (bubbleplotData.bubbleplotType == "f-input") {
              for (const gridScenario of gridScenarios) {
                  if (inCircle((x*gridSize+gridSize/2), (y*gridSize+gridSize/2), gridScenario)) {
                      frequencySum += parseFloat(gridScenario.frequency);
                      // TODO: smaller circles shoudl subtract f of larger circles.
                  }
              }
              if (frequencySum > 0) {
                  for (let i = 0; i < bubbleplotData.frequencyThresholds.length; i++){
                      const square = latLngSquareFromXY(x, y, grid);
                      if (frequencySum >= bubbleplotData.frequencyThresholds[i]) {
                          if (i == bubbleplotData.frequencyThresholds.length-1 || frequencySum < bubbleplotData.frequencyThresholds[i+1]){
                              latLngPaths[i].push(square);
                        }
                      }
                  }
              }
          } else if (bubbleplotData,bubbleplotType == "f-model") {
              for (const model in bubbleplotData.modellist) {
                  const distance = gridSize*((x-model.lng)^2 + (y-model.lat)^2)^(1/2);
                  const f = modelVulnerability(model(distance));
                  frequencySum += f;
              }

          } else { 
              throw new Error(
                  "bubbleplotType not correct for gridify: ", 
                  bubbleplotData.bubbleplotType
              ); 
          }
          frequencyGrid[x][y] += frequencySum;
        }
    }
    console.log("frequencyGrid: ", frequencyGrid);
    // const paths = makeThresholdPaths(bubbleplotData.frequencyThresholds, gridSize, frequencyGrid);
    // console.log(paths)
    // const latLngPaths = makeLatLngPaths(paths, grid);
    // console.log(latLngPaths)
    return latLngPaths;
}

function latLngSquareFromXY(x, y, grid) {
    const square = [];
    let [ lat, lng ] = gridToLatLng(x*grid.gridSize, y*grid.gridSize, grid);
    square.push({lat, lng});
    [ lat, lng ] = gridToLatLng(x*grid.gridSize + grid.gridSize, y*grid.gridSize, grid);
    square.push({lat, lng});
    [ lat, lng ] = gridToLatLng(x*grid.gridSize + grid.gridSize, y*grid.gridSize + grid.gridSize, grid);
    square.push({lat, lng});
    [ lat, lng ] = gridToLatLng(x*grid.gridSize, y*grid.gridSize + grid.gridSize, grid);
    square.push({lat, lng});
    return square;
}

// function makeLatLngPaths(paths, grid) {
//     const latLngPaths = [];
//     for (const path of paths) {
//         const latLngPath = [];
//         for (const point of path) {
//             const [lat, lng] = gridToLatLng(point.x, point.y, grid);
//             const latLngPoint = {lat, lng};
//             latLngPath.push(latLngPoint);
//         }
//         latLngPaths.push(latLngPath);
//     }
//     return latLngPaths;
// }

function inCircle(xCoord, yCoord, scenario){
    // console.log(xCoord, yCoord, scenario.gridX, scenario.gridY)
    const distance = Math.sqrt( (scenario.gridX - xCoord)**2 + 
        (scenario.gridY - yCoord)**2 );
    // console.log(distance, scenario.radius)
    if (distance < scenario.radius) {
        return true;
    }
    return false;
}

function getDistanceXYLatLngSquare (northEast, southWest) {
    console.log("getDistanceXYLatLngSquare")
    const lngLeft = southWest.lng();
    const lngRight = northEast.lng();
    const latTop = northEast.lat();
    const latBottom = southWest.lat();
    const topLeft = new window.googleAPI.maps.LatLng({lat: latTop, lng: lngLeft});
    const topRight = new window.googleAPI.maps.LatLng({lat: latTop, lng: lngRight});
    const bottomLeft = new window.googleAPI.maps.LatLng({lat: latBottom, lng: lngLeft});
    const distanceX = google.maps.geometry.spherical.computeDistanceBetween(topLeft, topRight);
    const distanceY = google.maps.geometry.spherical.computeDistanceBetween(topLeft, bottomLeft);

    return { distanceX, distanceY };
}

function centerNESWonGrid(grid, distanceX, distanceY) {
    console.log("centerNESWonGrid")
    const moveX = grid.gridNx*grid.gridSize - distanceX;
    const moveY = grid.gridNy*grid.gridSize - distanceY;
    console.log(moveY, moveX);

    const ne1 = new window.googleAPI.maps.LatLng(getNewLatLong(grid.northEast, 90, moveX/2));
    const ne2 = getNewLatLong(ne1, 0, moveY/2);
    const sw1 = new window.googleAPI.maps.LatLng(getNewLatLong(grid.southWest, 270, moveX/2));
    const sw2 = getNewLatLong(sw1, 180, moveY/2);

    return [ne2, sw2];
}

function getModelData(modelName, state, EM) {
    const model = {};
    model.name = modelName;
    let tnoModel;
    if (modelName == "tnoModel") {
        model.metricEnglish = getElementById("metric-english-toggle").getAttribute("data");
        model.tnoVolume = getElementById("tnoVolume").value;
        model.tnoHeat = getElementById("tnoHeat").value;
        model.tnoAtmPress = getElementById("tnoAtmPress").value;
        model.tnoCurveSelect = getElementById("tnoCurveSelect").value;
        model.tnoPressThresh = [
            getElementById("tnoPressThresh1").value, 
            getElementById("tnoPressThresh2").value, 
            getElementById("tnoPressThresh3").value
        ];

        model.tnoPressThresh.sort((a, b) => {return b-a;});
        tnoModel = new TNOmodel(model);
    }

    state.currentModel = tnoModel;
    EM.emit("model-stored");
}

function TNOmodel (model) {
    Object.assign(this, model);
    this.table = window.state.tnoTable;
    this.TNOmodelfromPressure =  (pressure) => {
        const scaledP = (pressure/this.tnoAtmPress);
        const curve = this.table[this.tnoCurveSelect];
        const rbar = tableLookup(curve, scaledP);
        console.log("rbar = " + rbar);
        if (rbar) {
            const r = rbar*(model.tnoHeat*1000*model.tnoVolume/(model.tnoAtmPress*100))**(1/3);
            console.log(r);
            return r;
        } else { return false; }
    };
    this.TNOmodelFromPressArray = (arr) => {
        this.distances = [];
        for (const p of arr) {
            try {
                this.distances.push(this.TNOmodelfromPressure(p));
            } catch (error) {
                console.log(error);
            }
        }
        return this.distances;
    };

    const defaultValues = {
        hidden: false,
        rangesHidden: false,
    };
    return this;
}

function tableLookup(table, scaledPressure) {
    if (scaledPressure > table.overpressure[0]) {
        return false;
    } else {
        for (let i=0; i < table.overpressure.length; i++) {
            if (scaledPressure > table.overpressure[i]) {
                let interp = logInterpolateX (
                    table.distance[i], 
                    table.overpressure[i], 
                    table.distance[i-1], 
                    table.overpressure[i-1], 
                    scaledPressure);
                console.log(interp);
                return interp;
            }
        }
    }
}

function interpolate(x1, y1, x2, y2, x) { 
    // When solving for x, swap all xs and ys
    return y1+(y2-y1)*(x-x1)/(x2-x1); 
}

function logInterpolateX(x1, y1, x2, y2, y) { 
    // https://math.stackexchange.com/questions/1777303/interpolation-point-fitting-onto-a-logarithmic-line-segment
    // https://en.wikipedia.org/wiki/Log%E2%80%93log_plot
    const slope = Math.log(y2/y1)/Math.log(x2/x1);
    return x1*(y/y1)**(1/slope); 
}