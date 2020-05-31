require("dotenv").config()

import express from "express"
import bodyParser from "body-parser"
import { airtableToGeoJSON } from "../src"

const app = express()
app.use(bodyParser.json())

app.get("/", (req, res) => {
  res.send(`
  <html>
    <form action="/airtableToGeoJSON">
      <div style="margin-bottom: 1em">
        <label style="display: inline-block; min-width: 9em">
          Table name
        </label>
        <input type="text" name="tableName" value="Volunteers" />
      </div>

      <div style="margin-bottom: 1em">
        <label style="display: inline-block; min-width: 9em">
          View name
        </label>
        <input type="text" name="viewName" value="Map" />
      </div>

      <div style="margin-bottom: 1em">
        <label style="display: inline-block; min-width: 9em">
          ID field
        </label>
        <input type="text" name="idFieldName" value="Unique ID" />
      </div>

      <div style="margin-bottom: 1em">
        <label style="display: inline-block; min-width: 9em">
          Geocode cache field
        </label>
        <input type="text" name="geocodedFieldName" value="Geocode cache" />
      </div>

      <input type="submit" />
    </form>
  </html>
  `)
})
app.get("/airtableToGeoJSON", airtableToGeoJSON)
app.post("/airtableToGeoJSON", airtableToGeoJSON)
app.options("/airtableToGeoJSON", airtableToGeoJSON)

const port = 3001
app.listen(port, () =>
  console.log(`Dev server listening at http://localhost:${port}`)
)
