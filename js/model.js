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
        scenarioId: null,
        bubbleplotId: null,
        site: {
            name: "Home",
            latitude: 36.15911,
            longitude: -95.99374,
            zoom: 18,
            scenarioCount: 0,
        },
        tnoTable: {},
        savedLat: null,
        savedLng: null,
        savedPath: [],
        tempPath: []
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
                scenarioCount: 0,
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
            scenarioId = "scenario-" + state.site.scenarioCount;
            state.site.scenarioCount +=  1;
        }
        state.mapItem = scenarioId;
        const type = getElementById('point-or-path').value;
        const { latitude, longitude, path } = getScenarioLocations(type, scenarioId);
        function getScenarioLocations(type, scenarioId) {
            if (type === "pipeline") {
                return { latitude: null, longitude: null, path: window.state.savedPath};
            }
            return { latitude: window.state.savedLat, longitude: window.state.savedLng, path: null };
        }

        try {
            state.site.scenarioList[scenarioId] = new Scenario({
                name: getElementById('name').value,
                scenarioId: scenarioId,
                material: getElementById('material').value,
                latitude,
                longitude,
                path,
                type,
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
        window.state.savedPath = [];
        window.state.savedLat = null;
        window.state.savedLng = null;
        window.state.panel = "site-content";
        window.state.mapItem = null;
        EM.emit("change-panel");
    });

    EM.on("create-bubbleplot", (bubbleplotId) => {
        if (!bubbleplotId) {
            bubbleplotId = "bubbleplot-" + state.site.scenarioCount;
            state.site.scenarioCount +=  1;
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
    if (!scenarioInputs.latitude && !scenarioInputs.path) throw new Error("Latitude is required (click to place on map)");    
    if (!scenarioInputs.longitude && !scenarioInputs.path) throw new Error("Longitude is required (click to place on map)");
    if (!scenarioInputs.scenarioId) throw new Error("ScenarioId is not being assigned");

    const defaultValues = {
        material: null,
        hidden: false,
        rangesHidden: false,
        model: {}
    };
    scenarioInputs.latitude = Number(scenarioInputs.latitude);
    scenarioInputs.longitude = Number(scenarioInputs.longitude);
    // order ranges
    const scenarioRanges = [scenarioInputs.range0, scenarioInputs.range1, scenarioInputs.range2];
    scenarioRanges.sort((a, b) => {return a.range-b.range;});
    for (let i = 0; i < 3; i++) { scenarioInputs["range" + i] = scenarioRanges[i]; }
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
    for (const scenarioName of Object.keys(rangelist)) {
        const scenario = window.state.site.scenarioList[scenarioName];
        const { latitude, longitude, path, type } = scenario;
        const nRangesInScenario = rangelist[scenarioName].length;
        const points = [];

        if (type === "pipeline") {
            for (const point of path) {
                const [ gridX, gridY ] = latLngToGrid(point.lat, point.lng, grid);
                points.push({gridX, gridY});
            }
        } else {
            const [ gridX, gridY ] = latLngToGrid(latitude, longitude, grid);
            points.push({gridX, gridY});
        }

        for (let i = 0; i < nRangesInScenario; i++) {
            const rangeName = rangelist[scenarioName][i];
            const radius = scenario[rangeName].range;
            let frequency = scenario[rangeName].frequency;
            for (let j = i + 1; j < nRangesInScenario; j++) { 
                const jRangeName = rangelist[scenarioName][j];
                frequency = frequency - scenario[jRangeName].frequency;
            }
            gridScenarios.push({type, points, radius, frequency});
        }
    }
    return gridScenarios;
}

function makeFmodelBubblePlot(rangelist) {
    // const grid = gridify(bubbleplotData);
    // bubbleplotData.bounds.extend(grid[1]);
    // bubbleplotData.bounds.extend(grid[0]);
}

function makeUnionBubblePlot(rangelist) {
    let path = [];
    const bounds = new window.googleAPI.maps.LatLngBounds();
    for (const scenario of Object.keys(rangelist)) {
        const location = window.state.site.scenarioList[scenario];
        const myLatLng = {lat: location.latitude, lng: location.longitude};
        for (const range of rangelist[scenario]) {
            const lats = [];
            const lngs = [];
            let shapePath = [];
            console.log(location.path, location[range].range)
            if (location.type === "pipeline") {
                shapePath = makeCapsulePathSets(location.path, location[range].range);
                console.log(shapePath)
                path = path.concat(shapePath);
                for (const shape of shapePath) {
                    for (const pair of shape) {
                        lats.push(pair.lat);
                        lngs.push(pair.lng);
                    }
                }
            } else {
                shapePath = makeCirclePath(myLatLng, location[range].range);
                path.push(shapePath);
                for (const pair of shapePath) {
                    lats.push(pair.lat);
                    lngs.push(pair.lng);
                }
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
    const lat = point.lat;
    const lng = point.lng;
    const points = 32; 
    const circlePath = [];
    for (let i=0; i < points + 1; i++) {
        const theta = toDeg(2 * Math.PI / points * i); 
        const newPoint = getNewLatLong(point, theta, radius);
        circlePath.push(newPoint);
    }
    return circlePath;
}

function getNewLatLong (point, bering, distance) {
    // bering: 0 is North, 90 is West, 180 is South, 270 is East
   distance = distance / 6367449;  
   bering = toRad(bering); 
   const lat1 = toRad(point.lat);
   const lon1 = toRad(point.lng);
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

function makeCapsulePathSets(path, radius) {
    console.log("makeCapsulePathSets")
    const capsulePathSet = [];
    for (let i = 0; i < path.length; i ++) {
        const point = path[i];
        const circlePath = makeCirclePath(point, radius);
        capsulePathSet.push(circlePath);
        if ( i === path.length-1) {
            continue;
        }
        const rectanglePath = [];
        const nextPoint = path[i+1];
        const theta = Math.atan((nextPoint.lat - point.lat)/(nextPoint.lng - point.lng))*180/Math.PI;
        console.log(theta)
        const R1 = getNewLatLong(nextPoint, (180 - theta), radius);
        const R2 = getNewLatLong(nextPoint, (360 - theta), radius);
        const R3 = getNewLatLong(point, (180 - theta), radius);
        const R4 = getNewLatLong(point, (360 - theta), radius);
        rectanglePath.push(R1, R2, R4, R3, R1);
        capsulePathSet.push(rectanglePath) ;
    }
    return capsulePathSet;
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

function gridify(bubbleplotData) {
    console.log("gridify")
    const northEast = { lat: bubbleplotData.bounds.getNorthEast().lat(), 
                        lng: bubbleplotData.bounds.getNorthEast().lng() };
    const southWest = { lat: bubbleplotData.bounds.getSouthWest().lat(), 
                        lng: bubbleplotData.bounds.getSouthWest().lng() };
    const { distanceX, distanceY } = getDistanceXYLatLngSquare(northEast, southWest);

    const gridSize = 5;
    const gridNx = Math.ceil(distanceX/gridSize);
    const gridNy = Math.ceil(distanceY/gridSize);
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
                  if (gridScenario.type === "pipeline") {
                      if (inCapsule((x*gridSize+gridSize/2), (y*gridSize+gridSize/2), gridScenario, gridSize)) {
                          frequencySum += parseFloat(gridScenario.frequency);
                      }
                      continue;
                  }
                  if (inPointScenario((x*gridSize+gridSize/2), (y*gridSize+gridSize/2), gridScenario)) {
                      frequencySum += parseFloat(gridScenario.frequency);
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

function inPointScenario(xCoord, yCoord, scenario){
    return inCircle(xCoord, yCoord, scenario.points[0].gridX, scenario.points[0].gridY, scenario.radius);
}

function inCircle(xCoord, yCoord, xCenter, yCenter, radius) {
    const distance = Math.sqrt( (xCenter - xCoord)**2 + (yCenter - yCoord)**2 );
    if (distance <= radius) return true;
    return false;
}

function inCapsule(xCoord, yCoord, scenario, gridSize){
    const numPoints = scenario.points.length;
    for (let i = 0; i < numPoints; i++) {
        // first check if the point is one of the bounding circles
        const isInCircle = inCircle(xCoord, yCoord, scenario.points[i].gridX, scenario.points[i].gridY, scenario.radius);
        if (isInCircle) return true;
        if (i === numPoints-1) {
            return false;
        }
        const x1 = scenario.points[i].gridX;
        const y1 = scenario.points[i].gridY;
        const x2 = scenario.points[i+1].gridX;
        const y2 = scenario.points[i+1].gridY;
        const maxx = Math.max(x1, x2);
        const minx = Math.min(x1, x2);
        const maxy = Math.max(y1, y2);
        const miny = Math.min(y1, y2);

        // below lines create a bounding box around the capsule
        if (xCoord > maxx + Number(scenario.radius)) continue;
        if (xCoord < minx - Number(scenario.radius)) continue;
        if (yCoord > maxy + Number(scenario.radius)) continue;
        if (yCoord < miny - Number(scenario.radius)) continue;

        if ( (xCoord > maxx || xCoord < minx)  && (yCoord > maxy || yCoord < miny) ) {
            // This shaves off the corners around the bounding circle
            continue;
        } 
        // This formula determines the distance from a line defined by
        // the two endpoints of the capsule.
        const distance = Math.abs( (y2 - y1) * xCoord - (x2 - x1) * yCoord +
                                    x2 * y1 - y2 * x1 ) /
                         Math.sqrt( (y2 - y1)**2 + (x2 - x1)**2 );  
        if (distance <= scenario.radius) {
            return true;
        }
    }
    return false;
}

function getDistanceXYLatLngSquare (northEast, southWest) {
    console.log("getDistanceXYLatLngSquare")
    const lngLeft = southWest.lng;
    const lngRight = northEast.lng;
    const latTop = northEast.lat;
    const latBottom = southWest.lat;
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

    const ne1 = getNewLatLong(grid.northEast, 90, moveX/2);
    const ne2 = getNewLatLong(ne1, 0, moveY/2);
    const sw1 = getNewLatLong(grid.southWest, 270, moveX/2);
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
        if (rbar) {
            const r = rbar*(model.tnoHeat*1000*model.tnoVolume/(model.tnoAtmPress*100))**(1/3);
            return r;
        } else { return false; }
    };
    this.TNOmodelFromPressArray = (arr) => {
        this.distances = [];
        for (const p of arr) {
            try {
                this.distances.push(this.TNOmodelfromPressure(p));
            } catch (error) {
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