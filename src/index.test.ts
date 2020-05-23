import express, { Application } from "express"
import request from "supertest"
// import Airtable from "airtable"
const { airtableToGeoJSON } = require(".")

const mockAirtableResponse = [
  {
    fields: {
      Address: "1000 Fifth Ave",
      ID: "42",
      "Geocoding Cache":
        "🔵 eyJpIjoiMTAwMCBGaWZ0aCBBdmUsIDEwMDI4LCBRdWVlbnMsIE5ZIiwibyI6eyJzdGF0dXMiOiJPSyIsImZvcm1hdHRlZEFkZHJlc3MiOiIxMDAwIDV0aCBBdmUsIE5ldyBZb3JrLCBOWSAxMDAyOCwgVVNBIiwibGF0Ijo0MC43NzkxNjU1LCJsbmciOi03My45NjI5Mjc4fSwiZSI6MTU5Mjc4NDk4NTA1NH0=",
    },
  },
]

jest.mock("Airtable", () => () => ({
  base: () => () => ({
    select: () => ({
      all: () => Promise.resolve(mockAirtableResponse),
    }),
  }),
}))

describe("GET /airtableToGeoJSON", () => {
  let app: Application

  beforeAll(() => {
    app = express()
    app.get("/airtableToGeoJSON", airtableToGeoJSON)
  })

  it("converts Airtable records to a GeoJSON FeatureCollection", async () => {
    const result = await request(app).get("/airtableToGeoJSON").query({
      tableName: "Foo Bars",
      idFieldName: "ID",
      geocodedFieldName: "Geocoding Cache",
    })

    expect(result.status).toEqual(200)
    expect(result.text).toEqual(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: "42" },
            geometry: { type: "Point", coordinates: [-73.9629278, 40.7791655] },
          },
        ],
      })
    )
  })
})
