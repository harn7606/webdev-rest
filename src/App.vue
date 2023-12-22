<script setup>
import { reactive, ref, onMounted} from 'vue'


let crime_url = ref('http://localhost:8001');
let dialog_err = ref(false);
let crimes = ref([]);
let map = reactive(
    {
        leaflet: null,
        center: {
            lat: 44.955139,
            lng: -93.102222,
            address: ''
        },
        zoom: 12,
        bounds: {
            nw: {lat: 45.008206, lng: -93.217977},
            se: {lat: 44.883658, lng: -92.993787}
        },
        neighborhood_markers: [
            {location: [44.942068, -93.020521], marker: null},
            {location: [44.977413, -93.025156], marker: null},
            {location: [44.931244, -93.079578], marker: null},
            {location: [44.956192, -93.060189], marker: null},
            {location: [44.978883, -93.068163], marker: null},
            {location: [44.975766, -93.113887], marker: null},
            {location: [44.959639, -93.121271], marker: null},
            {location: [44.947700, -93.128505], marker: null},
            {location: [44.930276, -93.119911], marker: null},
            {location: [44.982752, -93.147910], marker: null},
            {location: [44.963631, -93.167548], marker: null},
            {location: [44.973971, -93.197965], marker: null},
            {location: [44.949043, -93.178261], marker: null},
            {location: [44.934848, -93.176736], marker: null},
            {location: [44.913106, -93.170779], marker: null},
            {location: [44.937705, -93.136997], marker: null},
            {location: [44.949203, -93.093739], marker: null}
        ],

        markers: []
    }
);
let formData = ref(null);

async function submitForm(){
    const formData =  {
        case_number: form.elements.case_number.value,
        date: form.elements.date.value,
        time: form.elements.time.value,
        code: form.elements.code.value,
        incident: form.elements.incident.value,
        police_grid: form.elements.police_grid.value,
        neighborhood_number: form.elements.neighborhood_number.value,
        block: form.elements.block.value
    };
    
   console.log(formData.case_number);
    if(formData.case_number.trim() == '' || formData.date.trim() == '' || formData.time.trim() == '' || formData.code.trim() == '' ||
        formData.incident.trim() == '' || formData.police_grid.trim() == '' || formData.neighborhood_number.trim() == '' || formData.block.trim() == ''){
        alert("Please fill out all fields in the form.")
    } 
    else {
        fetch("http://localhost:8001/new-incident", {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
        .then((response) => {
            if (response.ok) {
            
            
            console.log("Success");
            } else {
            // Handle non-successful response (e.g., server error)
            alert("Error submitting new incident. Please try again.");
            console.error("Unsuccessful response:", response);
            }
        })
        .catch((error) => {
            // Handle network errors or other issues
            alert("An error occurred while submitting the form. Please try again.");
            console.error("Error:", error);
        });
        //reset the form
        form.reset();
    }
}

async function deleteForm() {
    try {
        const value = document.getElementById('delete').value;
        console.log(value);

        const response = await fetch('http://localhost:8001/remove-incident', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ case_number: value }),
        });

        if (response.ok) {
            const result = await response.text();
            console.log(result);
            console.log("Case Deleted");
            location.reload();
        } else {
            const errorText = await response.text();
            console.log(errorText);

            if (response.status === 404) {
                console.log("Case not found");
            } else {
                console.log("Did not delete");
            }
        }
    } catch (error) {
        console.log(error);
        console.log("Did not delete - error ");
        // Handle network errors or other issues
    }
}



// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
    // Create Leaflet map (set bounds and valied zoom levels)
    map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18
    }).addTo(map.leaflet);
    map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
    district_boundary.addTo(map.leaflet);
    fetch('data/StPaulDistrictCouncil.geojson')
    .then((response) => {
        return response.json();
    })
    .then((result) => {
        result.features.forEach((value) => {
            district_boundary.addData(value);
        });
    })
    .catch((error) => {
        console.log('Error:', error);
    });

    const neighborhoodLocations = map.neighborhood_markers.map(neigh => neigh.location);
    addMarkers(neighborhoodLocations);
});


// FUNCTIONS
// Function called once user has entered REST API URL
async function initializeCrimes() {
    try {
        const [incidents, codes, neighborhoods] = await Promise.all([
            fetch(crime_url.value + '/incidents').then(response => response.json()),
            fetch(crime_url.value + '/codes').then(response => response.json()),
            fetch(crime_url.value + '/neighborhoods').then(response => response.json())
        ]);

        const codeMap = new Map(codes.map(code => [code.code, code.incident_type]));
        const neighborhoodMap = new Map(neighborhoods.map(neighborhood => [neighborhood.neighborhood_number, neighborhood.neighborhood_name]));

        crimes.value = incidents.map(incident => ({
            case_number: incident.case_number,
            date: incident.date,
            time: incident.time,
            code: codeMap.get(incident.code) || 'Unknown',
            incident: incident.incident,
            police_grid: incident.police_grid,
            neighborhood_number: incident.neighborhood_number, // Ensure neighborhood_number is directly set
            neighborhood_name: neighborhoodMap.get(incident.neighborhood_number) || 'Unknown',
            block: incident.block
        }));
    } catch (error) {
        console.log('Error Fetching Data:' + error);
    }
}

function addMarkers(locations) {
    // Remove existing markers from the map
    map.markers.forEach(marker => marker.remove());
    map.markers = []; // Clear the markers array

    // Create a map to store incident counts for each neighborhood
    const incidentCounts = new Map();

    // Count incidents for each neighborhood
    crimes.value.forEach(incident => {
        const neighborhood = incident.neighborhood_number;
        incidentCounts.set(neighborhood, (incidentCounts.get(neighborhood) || 0) + 1);
    });

    console.log('Incident Counts:', incidentCounts);

    // Add new markers to the map
    locations.forEach((location, index) => {
        const marker = L.marker(location).addTo(map.leaflet);

        // Get the neighborhood number for this marker
        const neighborhoodNumber = index + 1;

        // Get incident count for this neighborhood
        const incidentCount = incidentCounts.get(neighborhoodNumber) || 0;

        // Get neighborhood name
        const neighborhoodName = crimes.value.find(incident => incident.neighborhood_number === neighborhoodNumber)?.neighborhood_name || 'Unknown';

        // Create a tooltip with neighborhood name and incident count
        marker.bindTooltip(`Neighborhood ${neighborhoodName}: ${incidentCount} incidents`, { permanent: true, direction: 'top' });

        map.markers.push(marker);
    });
}

// Function called when user presses 'OK' on dialog box
function closeDialog() {
    let dialog = document.getElementById('rest-dialog');
    let url_input = document.getElementById('dialog-url');
    if (crime_url.value !== '' && url_input.checkValidity()) {
        dialog_err.value = false;
        dialog.close();
        initializeCrimes();
    }
    else {
        dialog_err.value = true;
    }
}

function findLocation() {

    let inputLocation = document.getElementById('inputLocation');
    let inputLocationUpdate = inputLocation.value;

    let qry = 'https://nominatim.openstreetmap.org/search?q=' + inputLocationUpdate + '&format=json&&limit=1';

    fetch(qry)
    .then((res) => {
        return res.json();
    })
    .then((data) => {
        if(data.length > 0) {
            let latitude = data[0].lat;
            let longitude = data[0].lon;
            map.leaflet.setView([latitude, longitude], 14);
            inputLocation.placeholder = inputLocationUpdate;
        } else {
            console.log("The location could not be found");
            alert("The location could not be found")
        }
    })
    .catch((err) => {
        console.log(err);
        alert("There was an error. Please try again.");
    });

}


</script>

<template>
    
    <h1 style="text-align: center;"><b>St. Paul Crime Map</b></h1>
    <dialog id="rest-dialog" open>
        <h1 class="dialog-header">St. Paul Crime REST API</h1>
        <label class="dialog-label">URL: </label>
        <input id="dialog-url" class="dialog-input" type="url" v-model="crime_url" placeholder="http://localhost:8001" />
        <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
        <br/>
        <button class="button" type="button" @click="closeDialog">OK</button>
    </dialog>
    <div class="grid-container ">
        <div class="grid-x grid-padding-x">
            <div id="leafletmap" class="cell auto"></div>
        </div>
    </div>

    <div class="grid-container">
        <div class="grid-x grid-padding-x">
            <h1 class="cell auto center" style="font-family:arial">Search Location</h1>
        </div>
    </div>

    <div class="grid-container">
        <div class="grid-x grid-padding-x">
            <div id="location" class="cell auto">
                <input id="inputLocation" class="dialog-input" type="text" v-model="location" placeholder="Enter a location"/>
            </div>
            <button class="button" type="button" @click="findLocation">GO</button>
        </div>
    </div>

    <div class="grid-container">
            <div class="grid-x grid-padding-x">
                <h1 class="cell auto center" style="font-family:arial">New Incident Report Form</h1>
            </div>
                <form ref = "form" id = "form" @submit.prevent="submitForm">
                    <label for="case_number">Case Number:</label><br>
                    <input type="text" placeholder="Ex: 12345678" id="case_number" name="case_number" required>
                    <label for="date">Date:</label><br>
                    <input type="text" placeholder="Ex: 2022-07-15" id="date" name="date" required>
                    <label for="time">Time:</label><br>
                    <input type="text" placeholder="Ex: 13:10:00" id="time" name="time" required>
                    <label for ="code">Code:</label><br>
                    <input type = "text" placeholder="Ex: 530" id="code" name="code" required>
                    <label for="incident">Incident:</label><br>
                    <input type="text" placeholder="Ex: Burglary" id="incident" name="incident" required>
                    <label for="police_grid">Police Grid:</label><br>
                    <input type="text" placeholder="Ex: 53" id="police_grid" name="police_grid" required>
                    <label for="neighborhood_number">Neighborhood Number:</label><br>
                    <input type="text" placeholder="Ex: 4" id="neighborhood_number" name="neighborhood_number" required>
                    <label for="block">Block:</label><br>
                    <input type="text" placeholder="Ex: HUDSON RD AND FRANK" id="block" name="block" required>
                    <button class="button" type="button" @click="submitForm">Submit</button>
                </form>
    </div>

    <div class="grid-container">
        <div class="grid-x grid-padding-x">
            <h1 class="cell auto center" style="font-family:arial">Delete Incident Form</h1>
        </div>
        <label for="date">Incident Number:</label><br>
        <form>
            <input type="text" placeholder="Type here" id="delete" name="delete" required>
            <button class="button" type="button" @click="deleteForm">Submit</button>
        </form>
    </div>

    <div class="grid-container">
        <div class="grid-x grid-padding-x">
            <h1 class="cell auto center" style="font-family:arial">Incident Information</h1>
            <table class="unstriped">
        <thead>
            <tr>
                <th>Case Number</th>
                <th>Date</th>
                <th>Time</th>
                <th>Incident Type</th>
                <th>Description</th>
                <th>Police Grid</th>
                <th>Neighborhood</th>
                <th>Block</th>
            </tr>
        </thead>
  <tbody>
        <tr v-for="incident in crimes" :key="incident.case_number">
            <td>{{ incident.case_number }}</td>
            <td>{{ incident.date }}</td>
            <td>{{ incident.time }}</td>
            <td>{{ incident.code }}</td>
            <td>{{ incident.incident }}</td>
            <td>{{ incident.police_grid }}</td>
            <td>{{ incident.neighborhood_name }}</td>
            <td>{{ incident.block }}</td>
        </tr>
    </tbody>
    </table>
        </div>
    </div>


</template>

<style>
#rest-dialog {
    width: 20rem;
    margin-top: 1rem;
    z-index: 1000;
}

#leafletmap {
    height: 500px;
}

.dialog-header {
    font-size: 1.2rem;
    font-weight: bold;
}

.dialog-label {
    font-size: 1rem;
}

.dialog-input {
    font-size: 1rem;
    width: 100%;
}

.dialog-error {
    font-size: 1rem;
    color: #D32323;
}

body {
    background-color: rgb(208, 208, 211);
}

</style>
