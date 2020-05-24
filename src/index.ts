import Airtable, { Record, Records } from "airtable"
import { Request, Response } from "express"
import * as turf from "@turf/turf"
import { Feature, FeatureCollection, Point } from "geojson"
// @ts-ignore
import hsl from "@davidmarkclements/hsl-to-hex";

const { AIRTABLE_API_KEY: apiKey, AIRTABLE_BASE_ID: baseId } = process.env

const client = new Airtable({ apiKey })
const base = client.base(baseId!)

/**
 * These parameters are required in order to fulfill a request.
 * Note that the Airtable base name is not required here, as it
 * is expected to be configured via an AIRTABLE_BASE_ID
 * environment value in the cloud function's environment settings
 * (along with an AIRTABLE_API_KEY that has read permissions on the base).
 */
interface Parameters {
  /** Name of the table within the Airtable base */
  tableName: string

  /** Name of the view within the Airtable base (default: "Grid view") */
  viewName: string

  /** Name of a column holding a (non-PII) unique identifier to include in the GeoJSON */
  idFieldName: string

  /** Name of a column holding the Airtable Map block's cached geocoding result  */
  geocodedFieldName: string

  /** (Optional) How many clusters to create from the retrieved locations */
  clusterCount: number
}

/**
 * Represents the result of an Airtable Map block's cached geocoding value.
 * This is base64 encoded and stored in a designated column on the table, configured
 * via the Map block's settings. That column name corresponds to the `geocodedFieldName`
 * required by this application.
 */
interface AirtableCachedGeocode {
  /** geocoder query string */
  i: string

  /** geocoder cached result */
  o: {
    /** status */
    status: string

    /** canonical address string */
    formattedAddress: string

    /** geocoded latitude */
    lat: number

    /** geocoded latitude */
    lng: number
  }

  /** cache expiry, in epoch milliseconds */
  e: number
}

/**
 * Use the supplied Airtable parameters to fetch a set of
 * records (optionally defined via an Airtable view),
 * and select only the columns of interest.
 */
async function fetchGeocodedRecords(params: Parameters) {
  const { tableName, viewName, idFieldName, geocodedFieldName } = params
  const criteria = {
    view: viewName,
    fields: [idFieldName, geocodedFieldName], // fetch only the fields we are interested in
  }
  const results = await base(tableName).select(criteria).all()
  return results
}

/**
 * Pull the lat/lng out of the base64-encoded geocoder result cached by Airtable
 */
const decodeAirtableGeodata = (value: string): AirtableCachedGeocode => {
  const geocode = value.substring(3) // lop off leading status indicator emoji
  const buffer = Buffer.from(geocode, "base64")
  const text = buffer.toString("ascii")
  return JSON.parse(text)
}

/**
 * Transform an Airtable record into a GeoJSON Feature,
 * with geometry coming from the geocoded & cached Airtable column,
 * and properties limited to ID for now.
 */
const toGeoJSONFeature = (
  record: Record<any>,
  {
    idFieldName,
    geocodedFieldName,
  }: Pick<Parameters, "idFieldName" | "geocodedFieldName">
) => {
  const id = record.fields[idFieldName]
  const cachedGeocoderResult = record.fields[geocodedFieldName]

  const geodata = decodeAirtableGeodata(cachedGeocoderResult)
  const {
    o: { lat, lng },
  } = geodata

  const feature: Feature<Point> = {
    type: "Feature",
    properties: { id },
    geometry: {
      type: "Point",
      coordinates: [lng, lat],
    },
  }

  return feature
}

/**
 * Take a set of Airtable records and transform it into a
 * GeoJSON FeatureCollection, one Feature for each record.
 */
const toGeoJSONFeatureCollection = (
  records: Records<any>,
  {
    idFieldName,
    geocodedFieldName,
  }: Pick<Parameters, "idFieldName" | "geocodedFieldName">
) => {
  const features = records.map((record) =>
    toGeoJSONFeature(record, { idFieldName, geocodedFieldName })
  )
  const featureCollection: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: features,
  }
  return featureCollection
}

/**
 * Fetch the records from the Airtable base and transform them
 * into a GeoJSON FeatureCollection object
 */
const fetchAndTransform = async (params: Parameters) => {
  const records = await fetchGeocodedRecords(params)
  const { idFieldName, geocodedFieldName } = params
  const jsonObject = toGeoJSONFeatureCollection(records, {
    idFieldName,
    geocodedFieldName,
  })
  return jsonObject
}

/**
 * Pull out the parameters from the http request — from either
 * querystring or request body, so that it is GET & POST compatible —
 * and complain if any required params are missing
 */
const processArguments = (req: Request): Parameters => {
  const defaults: Partial<Parameters> = {
    // tableName: "Deliveries 0519",
    // idFieldName: "Airtable ID",
    // geocodedFieldName: "Geocoding Cache",
    viewName: "Grid view",
  }
  const hasBody = Object.entries(req.body).length > 0
  const params: Parameters = hasBody ? req.body : req.query

  if (!params.tableName) throw new Error("Please supply tableName")
  if (!params.idFieldName) throw new Error("Please supply idFieldName")
  if (!params.geocodedFieldName)
    throw new Error("Please supply geocodedFieldName")

  return { ...defaults, ...params }
}

/**
 * Divide the FeatureCollection into the requested number of clusters,
 * and clean up and colorize the output while we're at it.
 */
const cluster = (
  featureCollection: FeatureCollection<Point>,
  numberOfClusters: number
) => {
  turf.clustersKmeans(featureCollection, {
    numberOfClusters,
    mutate: true,
  })
  featureCollection.features.forEach((feature) => {
    // remove centroid
    delete feature.properties!.centroid

    // add a hex color, from a diy divergent color scheme
    // @ts-ignore
    const { cluster } = feature.properties
    const hue = cluster * 360/numberOfClusters
    const hex = hsl(hue, 50, 50)
    feature.properties!['marker-color'] = hex
  })
}

/**
 * HTTP request handler that serves as the cloud function endpoint
 */
export const airtableToGeoJSON = async (req: Request, res: Response) => {
  try {
    const params = processArguments(req)
    let featureCollection = await fetchAndTransform(params)

    if (params.clusterCount) {
      cluster(featureCollection, params.clusterCount)
    }

    res.status(200).json(featureCollection)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}
