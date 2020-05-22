import Airtable, { Record } from "airtable"
import { Request, Response } from "express"

const { AIRTABLE_API_KEY: apiKey, AIRTABLE_BASE_ID: baseId } = process.env

const airtable = new Airtable({ apiKey })
const base = airtable.base(baseId!)

// base("Deliveries 0523")
//   .select({ maxRecords: 3 })
//   .all()
//   .then((result) => console.log(result))

async function fetchGeocodedRecords({
  tableName,
  idFieldName,
  geocodedFieldName,
}: {
  tableName: string
  idFieldName: string
  geocodedFieldName: string
}) {
  const criteria = {
    // maxRecords: 3,
    view: "Grid view",
    fields: [idFieldName, geocodedFieldName], // fetch only the fields we are interested in
    // filterByFormula: "{Confirmed?} = 'Yes'"
  }

  const results = await base(tableName).select(criteria).all()
  return results
}

const decodeAirtableGeodata = (value: string) => {
  const geocode = value.substring(3) // lop off leading status indicator emoji
  let buffer = Buffer.from(geocode, "base64")
  let text = buffer.toString("ascii")
  return JSON.parse(text)
}

const toGeoJSONFeature = ({
  record,
  idFieldName,
  geocodedFieldName,
}: {
  record: Record<any>
  idFieldName: string
  geocodedFieldName: string
}) => {
  const id = record.fields[idFieldName]
  const cachedGeocoderResult = record.fields[geocodedFieldName]

  // pull the lat/lng out of the base64-encoded geocoder result cached by Airtable
  const geodata = decodeAirtableGeodata(cachedGeocoderResult)
  const {
    o: { lat, lng },
  } = geodata

  return {
    type: "Feature",
    properties: { id },
    geometry: {
      type: "Point",
      coordinates: [lng, lat],
    },
  }
}

const toGeoJSONFeatureCollection = ({
  records,
  idFieldName,
  geocodedFieldName,
}: {
  records: Record<any>[]
  idFieldName: string
  geocodedFieldName: string
}) => {
  const features = records.map((record) =>
    toGeoJSONFeature({ record, idFieldName, geocodedFieldName })
  )
  const featureCollection = {
    type: "FeatureCollection",
    features: features,
  }
  return featureCollection
}

const fetchAndTransform = async ({
  tableName,
  idFieldName,
  geocodedFieldName,
}: {
  tableName: string
  idFieldName: string
  geocodedFieldName: string
}) => {
  const records = await fetchGeocodedRecords({
    tableName,
    idFieldName,
    geocodedFieldName,
  })

  const jsonObject = toGeoJSONFeatureCollection({
    // @ts-ignore
    records,
    idFieldName,
    geocodedFieldName,
  })
  return jsonObject
}

exports.airtableToGeoJSON = async (req: Request, res: Response) => {
  let tableName = req.query.tableName || req.body.tableName || "Deliveries 0519"
  let idFieldName =
    req.query.idFieldName || req.body.idFieldName || "Airtable ID"
  let geocodedFieldName =
    req.query.geocodedFieldName ||
    req.body.geocodedFieldName ||
    "Geocoding Cache"

  const featureCollection = await fetchAndTransform({
    tableName,
    idFieldName,
    geocodedFieldName,
  })

  res.status(200).json(featureCollection)
}

// fetchAndTransform({
//   tableName: "Deliveries 0519",
//   idFieldName: "Airtable ID",
//   geocodedFieldName: "Geocoding Cache",
// })
//   .then((data: any) => console.log(JSON.stringify(data)))
//   .catch((e) => console.error(e.toString()))
