import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
import { default as cors } from 'cors';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8001;

let app = express();
app.use(express.json());
app.use(cors());

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
    console.log(req.query); 

    let query = "SELECT * FROM Codes";
    let input = " WHERE code ="; 

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
            res.status(400).type('html').send('Error! Invalid code, try codes?code=110,700');
        })
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); 

    let query = 'SELECT * FROM Neighborhoods';
    let input = " WHERE neighborhood_number = "; 

    for (const [key, value] of Object.entries(req.query)) {
        if (key === "id") {
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
            res.status(400).type('txt').send('Error! Invalid ID number, try neighborhoods?id=11,14');
        })
});


// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query);

    let query = 'SELECT * FROM Incidents';
    let input = " WHERE (";

    //limit
    let looplimit = 1000;


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
        else if (key === 'limit') {
            looplimit = value;


        }

        if (key !== 'limit') {
            query = query + ")";
        }
    }
    // Set  limit

    query = query + " ORDER BY date_time DESC LIMIT " + looplimit;


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
            res.status(500).type('html').send('Error! Try typing in incidents?desiredparameter=desirednumber. If looking for grid, desiredparameter = police_grid. If looking for neighborhood, desiredparameter = neighborhood_number');
        })
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {

    let dateTime = req.body.date + '-' + req.body.time;
    let query = "INSERT INTO Incidents (case_number, date_time, code, incident, police_grid, neighborhood_number, block) VALUES (?, ?, ?, ?, ?, ?, ?)";
    let input = [req.body.case_number, dateTime, req.body.code, req.body.incident, req.body.police_grid, req.body.neighborhood_number, req.body.block];

    dbSelect('SELECT * FROM Incidents WHERE case_number = ?', req.body.case_number)
        .then((rows) => {
            console.log(rows);
            if (rows.length > 0) {
                res.status(500).type('txt').send('Incident Case Number already exists');
                console.log("Incident Case Number already exists");
                return;
            }

            dbRun(query, input);
            res.status(200).type('txt').send("Entry added to database");
            console.log("Entry added to database");

        })
        .catch((err) => {
            res.status(400).type('txt').send('Something went wrong. Try again!');
            console.log("Something went wrong. Try again!");
        })
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); 

    let query = "DELETE FROM Incidents WHERE case_number = ?";
    let input = [req.body.case_number];

    dbSelect('SELECT * FROM Incidents WHERE case_number = ?', req.body.case_number)
        .then((rows) => {
            if (rows.length == 0) {
                res.status(500).type('txt').send('There exists no case with that number');
                console.log("There exists no case with that number")
                return;
            }

            dbRun(query, input)
            res.status(200).type('txt').send('Incident was deleted')
            console.log("Incident was deleted");
        })
        .catch((err) => {
            res.status(400).type('txt').send("Something went wrong. Try Again!");
            console.log("Something went wrong. Try Again!");
        });


});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
