const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server is running in http://localhost:3000/")
    );
  } catch (e) {
    console.log(`DB Error :${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertingStateTable = (DbObject) => {
  return {
    stateId: DbObject.state_id,
    stateName: DbObject.state_name,
    population: DbObject.population,
  };
};

const convertingDistrictTable = (DbObject) => {
  return {
    districtId: DbObject.district_id,
    districtName: DbObject.district_name,
    stateId: DbObject.state_id,
    cases: DbObject.cases,
    cured: DbObject.cured,
    active: DbObject.active,
    deaths: DbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStateQuery = `
    SELECT * 
    FROM state`;
  const stateArray = await db.all(getStateQuery);
  response.send(stateArray.map((eachState) => convertingStateTable(eachState)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getSingleState = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId}`;
  const stateObj = await db.get(getSingleState);
  response.send(convertingStateTable(stateObj));
});

app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;

  const postDistrictQuery = `
    INSERT INTO 
    district (state_id,district_name,cases,cured,active,deaths)
    VALUES 
    (${stateId},'${districtName}',${cases},${cured},${active},${deaths});`;
  await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getSingleDistrict = `
    SELECT *
    FROM district
    WHERE district_id = ${districtId};`;
  const districtObj = await db.get(getSingleDistrict);
  response.send(convertingDistrictTable(districtObj));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId}`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const putDistrictQuery = `
    UPDATE district
    SET 
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    WHERE district_id = ${districtId};`;
  await db.run(putDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM  district
    WHERE state_id=${stateId};`;

  const stats = await db.get(getStateStatsQuery);

  console.log(stats);

  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateId = `
  SELECT state_id
  FROM district
  WHERE district_id = ${districtId};`;

  const stateId = await db.get(getStateId);
  const getStateNameQuery = `
  SELECT state_name as stateName
  FROM state
  WHERE state_id = ${stateId.state_id};`;

  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
