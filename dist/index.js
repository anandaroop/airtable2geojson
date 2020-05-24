"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.airtableToGeoJSON = void 0;
var airtable_1 = __importDefault(require("airtable"));
var turf = __importStar(require("@turf/turf"));
// @ts-ignore
var hsl_to_hex_1 = __importDefault(require("@davidmarkclements/hsl-to-hex"));
var _a = process.env, apiKey = _a.AIRTABLE_API_KEY, baseId = _a.AIRTABLE_BASE_ID;
var client = new airtable_1.default({ apiKey: apiKey });
var base = client.base(baseId);
/**
 * Use the supplied Airtable parameters to fetch a set of
 * records (optionally defined via an Airtable view),
 * and select only the columns of interest.
 */
function fetchGeocodedRecords(params) {
    return __awaiter(this, void 0, void 0, function () {
        var tableName, viewName, idFieldName, geocodedFieldName, criteria, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tableName = params.tableName, viewName = params.viewName, idFieldName = params.idFieldName, geocodedFieldName = params.geocodedFieldName;
                    criteria = {
                        view: viewName,
                        fields: [idFieldName, geocodedFieldName],
                    };
                    return [4 /*yield*/, base(tableName).select(criteria).all()];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, results];
            }
        });
    });
}
/**
 * Pull the lat/lng out of the base64-encoded geocoder result cached by Airtable
 */
var decodeAirtableGeodata = function (value) {
    var geocode = value.substring(3); // lop off leading status indicator emoji
    var buffer = Buffer.from(geocode, "base64");
    var text = buffer.toString("ascii");
    return JSON.parse(text);
};
/**
 * Transform an Airtable record into a GeoJSON Feature,
 * with geometry coming from the geocoded & cached Airtable column,
 * and properties limited to ID for now.
 */
var toGeoJSONFeature = function (record, _a) {
    var idFieldName = _a.idFieldName, geocodedFieldName = _a.geocodedFieldName;
    var id = record.fields[idFieldName];
    var cachedGeocoderResult = record.fields[geocodedFieldName];
    var geodata = decodeAirtableGeodata(cachedGeocoderResult);
    var _b = geodata.o, lat = _b.lat, lng = _b.lng;
    var feature = {
        type: "Feature",
        properties: { id: id },
        geometry: {
            type: "Point",
            coordinates: [lng, lat],
        },
    };
    return feature;
};
/**
 * Take a set of Airtable records and transform it into a
 * GeoJSON FeatureCollection, one Feature for each record.
 */
var toGeoJSONFeatureCollection = function (records, _a) {
    var idFieldName = _a.idFieldName, geocodedFieldName = _a.geocodedFieldName;
    var features = records.map(function (record) {
        return toGeoJSONFeature(record, { idFieldName: idFieldName, geocodedFieldName: geocodedFieldName });
    });
    var featureCollection = {
        type: "FeatureCollection",
        features: features,
    };
    return featureCollection;
};
/**
 * Fetch the records from the Airtable base and transform them
 * into a GeoJSON FeatureCollection object
 */
var fetchAndTransform = function (params) { return __awaiter(void 0, void 0, void 0, function () {
    var records, idFieldName, geocodedFieldName, jsonObject;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetchGeocodedRecords(params)];
            case 1:
                records = _a.sent();
                idFieldName = params.idFieldName, geocodedFieldName = params.geocodedFieldName;
                jsonObject = toGeoJSONFeatureCollection(records, {
                    idFieldName: idFieldName,
                    geocodedFieldName: geocodedFieldName,
                });
                return [2 /*return*/, jsonObject];
        }
    });
}); };
/**
 * Pull out the parameters from the http request — from either
 * querystring or request body, so that it is GET & POST compatible —
 * and complain if any required params are missing
 */
var processArguments = function (req) {
    var defaults = {
        // tableName: "Deliveries 0519",
        // idFieldName: "Airtable ID",
        // geocodedFieldName: "Geocoding Cache",
        viewName: "Grid view",
    };
    var hasBody = Object.entries(req.body).length > 0;
    var params = hasBody ? req.body : req.query;
    if (!params.tableName)
        throw new Error("Please supply tableName");
    if (!params.idFieldName)
        throw new Error("Please supply idFieldName");
    if (!params.geocodedFieldName)
        throw new Error("Please supply geocodedFieldName");
    return __assign(__assign({}, defaults), params);
};
/**
 * Divide the FeatureCollection into the requested number of clusters,
 * and clean up and colorize the output while we're at it.
 */
var cluster = function (featureCollection, numberOfClusters) {
    turf.clustersKmeans(featureCollection, {
        numberOfClusters: numberOfClusters,
        mutate: true,
    });
    featureCollection.features.forEach(function (feature) {
        // remove centroid
        delete feature.properties.centroid;
        // add a hex color, from a diy divergent color scheme
        // @ts-ignore
        var cluster = feature.properties.cluster;
        var hue = cluster * 360 / numberOfClusters;
        var hex = hsl_to_hex_1.default(hue, 50, 50);
        feature.properties['marker-color'] = hex;
    });
};
/**
 * HTTP request handler that serves as the cloud function endpoint
 */
exports.airtableToGeoJSON = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var params, featureCollection, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                params = processArguments(req);
                return [4 /*yield*/, fetchAndTransform(params)];
            case 1:
                featureCollection = _a.sent();
                if (params.clusterCount) {
                    cluster(featureCollection, params.clusterCount);
                }
                res.set('Access-Control-Allow-Origin', '*');
                res.status(200).json(featureCollection);
                return [3 /*break*/, 3];
            case 2:
                e_1 = _a.sent();
                res.status(400).json({ error: e_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
