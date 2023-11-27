import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

let app = express();
app.use(express.json());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Create Promise for SQLite3 database SELECT query 
function dbSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    let query = "SELECT * FROM Codes";
    let input = " WHERE code ="; // WHERE code = value to get the information for the code

    for (const [key, value] of Object.entries(req.query)) {
        if (key === "code") {
            let values = value.split(',');
            for (let i = 0; i < values.length; i++) {
                query = query + input + values[i];
                input = " OR code = ";
            }
        }
    }

    query = query + " Order by code";

    dbSelect(query, [])
        .then((data) => {
            console.log(data);
            res.status(200).type('json').send(data);
        })
        .catch((err) => {
            res.status(200).type('html').send('Error! Invalid code'); // add what they should enter as code
        })
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    let query = 'SELECT * FROM Neighborhoods';
    let input = " WHERE neighborhood_number = "; //WHERE code = value to get information fpr the code

    for (const [key, value] of Object.entries(req.query)) {
        if (key === "neighborhood_number") {
            let values = value.split(",");
            for (let i = 0; i < values.length; i++) {
                query = query + input + values[i];
                input = " OR neighborhood_number = ";
            }
        }
    }

    query = query + " Order by neighborhood_number ASC";

    dbSelect(query, [])
        .then((data) => {
            console.log(data);
            res.status(200).type('json').send(data);
        })
        .catch((err) => {
            res.status(200).type('txt').send('Error! Invalid neighborhood number, try neighborhoods?neighborhood_number=1');
        })
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    let query = 'SELECT * FROM Incidents';
    let input = " WHERE (";

    //limit
    let limit = 100;
    /** 
    for(const [key, value] of Object.entries(req.query)){
        if(key === 'case_number'){
            let values = value.split(",");
            for(let i=0; i<values.length; i++){
                query = query + input + "case_number = " + values[i];
                input = " OR ";
            }
            input = ") AND ("
        }
        else if(key === 'start_date'){
            query = query + input + "date(date_time) >= " + "'" +  value + "'";
            input = ") AND (";
        }
        else if(key === 'end_date'){
            query = query + input + "date(date_time) <= "  + "'" +  value + "'";
            input = ") AND ("
        }
        else if(key === "code"){
            let values = value.split(",");
            for(let i=0; i<values.length; i++){
                query = query + input + "code = " + values[i];
                input = " OR ";
            }
            input = ") AND ("
        }
        else if(key === "incident"){
            let values = value.split(",");
            for(let i=0; i<values.length; i++){
                query = query + input + "incident = " + values[i];
                input = " OR ";
            }
            input = ") AND ("
        }
        else if(key === 'grid'){
            let values = value.split(",");
            for(let i=0; i<values.length; i++){
                query = query + input + "police_grid = " + values[i];
                input = " OR ";
            }
            input = ") AND ("
        }

        else if(key === "block"){
            let values = value.split(",");
            for(let i=0; i<values.length; i++){
                query = query + input + "block = " + values[i];
                input = " OR ";
            }
            input = ") AND ("
        }
        else if(key === "neighborhood_number"){
            let values = value.split(",");
            for(let i=0; i<values.length; i++){
                query = query + input + "neighborhood_number = " + values[i];
                input = " OR ";
            }
            input = ") AND ("
        }
    }
    */

    for (const [key, value] of Object.entries(req.query)) {
        if (key === 'case_number' || key === 'code' || key === 'incident' || key === 'police_grid' || key === 'neighborhood_number' || key === 'block') {
            let values = value.split(",");
            for (let i = 0; i < values.length; i++) {
                query = query + input + `${key} = ${values[i]}`;
                input = " OR ";
            }
            input = ") AND (";
        } else if (key === 'start_date') {
            query = query + input + "(date_time) >= '" + value + "'";
            input = ") AND (";
        } else if (key === 'end_date') {
            query = query + input + "(date_time) <= '" + value + "'";
            input = ") AND (";
        }
    }
    // Set  limit
    query = query + " LIMIT " + limit;

    query = query + ")";
    // Need to order by date

    console.log(query);
    dbSelect(query, [])
        .then((data) => {
            data.forEach((item) => item["date"] = item.date_time.substring(0, 10));
            data.forEach((item) => item["time"] = item.date_time.substring(11));
            data.forEach((item) => delete item["date_time"]);
            console.log(data);
            res.status(200).type('json').send(data);
        })
        .catch((err) => {
            console.error(err);
            console.log("Error is on line number: " + err.lineNumber);
            res.status(200).type('html').send('Error! Try typing in incidents?code=110&grid=5');
        })
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    let data = req.body;
    db.get('SELECT case_number From Incidents WHERE case_number = ?', [data.case_number], (err, existingData) => {

        if (err) {
            res.status(500).json({ Error: "Select query problem, unable to check if Case Number is valid." })
        } else if (existingData) {
            res.status(400).json({ Error: "Case Number is already on file" })
        } else
            db.run("INSERT INTO incidents (case_number, date, time, code, incident, police_grid, neighborhood_number, block) VALUES (?, ?, ?, ?, ?, ?, ?, ?", [data.case_number, data.date, data.time, data.code, data.incident, data.police_grid, data.neighborhood_number, data.block], (err) => {
                if (err) {
                    res.status(500).json({ Error: "Insert was unsuccessful, please try again" });
                } else {
                    res.status(201).json({ Response: "Success" });
                }
            })
    })

    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); // uploaded data

    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
