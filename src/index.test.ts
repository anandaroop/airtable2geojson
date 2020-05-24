import express, { Application } from "express"
import bodyParser from "body-parser"
import request from "supertest"
import Airtable from "airtable"
import { airtableToGeoJSON } from "."

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
    // configure the test app to serve up the function
    app = express()
    app.use(bodyParser.json())
    app.get("/airtableToGeoJSON", airtableToGeoJSON)
    app.post("/airtableToGeoJSON", airtableToGeoJSON)
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

  describe("input parameters", () => {
    let params: any

    beforeEach(() => {
      params = {
        tableName: "Foo Bars",
        idFieldName: "foo",
        geocodedFieldName: "foo",
      }
    })

    it("requires a table name", async () => {
      delete params.tableName

      const result = await request(app).post("/airtableToGeoJSON").send(params)

      expect(result.status).toEqual(400)
      expect(result.text).toMatch(/tableName/)
    })

    it("requires a column with record ID", async () => {
      delete params.idFieldName

      const result = await request(app).post("/airtableToGeoJSON").send(params)

      expect(result.status).toEqual(400)
      expect(result.text).toMatch(/idFieldName/)
    })

    it("requires a column holding the geocoding cached value", async () => {
      delete params.geocodedFieldName

      const result = await request(app).post("/airtableToGeoJSON").send(params)

      expect(result.status).toEqual(400)
      expect(result.text).toMatch(/geocodedFieldName/)
    })
  })

  xit("uses a mock", () => {
    const client = new Airtable()
    const base = client.base("some base")
    const data = base("some table").select().all()
    expect(data).toEqual(mockAirtableResponse)
  })
})
