import express, { Application } from "express"
import bodyParser from "body-parser"
import request from "supertest"
import Airtable from "airtable"
import { airtableToGeoJSON } from "."

const mockAirtableResponse = [
  {
    fields: {
      ID: "BK69",
      Description: "Clinton Hill",
      "Geocoding Cache":
        "🔵 eyJpIjoiQnJvb2tseW46IENsaW50b24gSGlsbCwgQnJvb2tseW4sIE5ZIiwibyI6eyJzdGF0dXMiOiJPSyIsImZvcm1hdHRlZEFkZHJlc3MiOiJDbGludG9uIEhpbGwsIEJyb29rbHluLCBOWSwgVVNBIiwibGF0Ijo0MC42ODk2ODM0LCJsbmciOi03My45NjYxMTQ0fSwiZSI6MTU4NzE2NDk3NTgzM30=",
    },
  },
  {
    fields: {
      ID: "BK68",
      Description: "Fort Greene",
      "Geocoding Cache":
        "🔵 eyJpIjoiQnJvb2tseW46IEZvcnQgR3JlZW5lLCBCcm9va2x5biwgTlkiLCJvIjp7InN0YXR1cyI6Ik9LIiwiZm9ybWF0dGVkQWRkcmVzcyI6IkZvcnQgR3JlZW5lLCBCcm9va2x5biwgTlksIFVTQSIsImxhdCI6NDAuNjkyMDYzOCwibG5nIjotNzMuOTc0MTg3Mzk5OTk5OTl9LCJlIjoxNTg3MTY0OTg0ODMyfQ==",
    },
  },
  {
    fields: {
      ID: "QN28",
      Description: "Jackson Heights",
      "Geocoding Cache":
        "🔵 eyJpIjoiUXVlZW5zOiBKYWNrc29uIEhlaWdodHMsIFF1ZWVucywgTlkiLCJvIjp7InN0YXR1cyI6Ik9LIiwiZm9ybWF0dGVkQWRkcmVzcyI6IkphY2tzb24gSGVpZ2h0cywgUXVlZW5zLCBOWSwgVVNBIiwibGF0Ijo0MC43NTU2ODE4LCJsbmciOi03My44ODMwNzAxfSwiZSI6MTU4NzE2NDk4MDc4OH0=",
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

test("data mocking", async () => {
  const client = new Airtable()
  const base = client.base("some base")
  const data = await base("some table").select().all()
  expect(data).toEqual(mockAirtableResponse)
})

describe("/airtableToGeoJSON", () => {
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
            properties: {
              id: "BK69",
            },
            geometry: {
              type: "Point",
              coordinates: [-73.9661144, 40.6896834],
            },
          },
          {
            type: "Feature",
            properties: {
              id: "BK68",
            },
            geometry: {
              type: "Point",
              coordinates: [-73.97418739999999, 40.6920638],
            },
          },
          {
            type: "Feature",
            properties: {
              id: "QN28",
            },
            geometry: {
              type: "Point",
              coordinates: [-73.8830701, 40.7556818],
            },
          },
        ],
      })
    )
  })

  it("also responds to POSTs", async () => {
    const result = await request(app).post("/airtableToGeoJSON").send({
      tableName: "Foo Bars",
      idFieldName: "ID",
      geocodedFieldName: "Geocoding Cache",
    })

    expect(result.status).toEqual(200)
    const geoJSON = JSON.parse(result.text)
    expect(geoJSON.features).toHaveLength(3)
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
})
