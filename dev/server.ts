require("dotenv").config()

import express from "express"
import bodyParser from "body-parser"
import { airtableToGeoJSON } from "../src"

const app = express()
app.use(bodyParser.json())

app.get("/", (req, res) => {
  res.send(`
  <html>
    <a href="/airtableToGeoJSON?tableName=Drivers%200523&idFieldName=Airtable%20ID&geocodedFieldName=Geocoding%20Cache">Sample /airtableToGeoJSON query</a>
  </html>
  `)
})
app.get("/airtableToGeoJSON", airtableToGeoJSON)
app.post("/airtableToGeoJSON", airtableToGeoJSON)

const port = 3000
app.listen(port, () =>
  console.log(`Dev server listening at http://localhost:${port}`)
)
