For the final project in our Web Development course, two teammates and I created a single-page application focused on crime in St. Paul. We integrated data from three 
different APIs. The first API, Leaflet, allowed us to render interactive maps on our webpage to show where crimes were occurring in the St. Paul area. The second API, 
Nominatim, enabled users to search for locations by name or retrieve a location's name based on latitude and longitude coordinates. The third API was a RESTful server we 
developed in a previous project, which provided various routes related to crime data in St. Paul.

To efficiently complete the project, we divided the tasks among the group. My main responsibility was creating a 'new incident form' and a 'delete incident form.' The 
new incident form allowed users to add crimes to the database via a PUT request. Users filled out details about the crime, such as the time and location. Upon submitting 
the form, the information was sent to the server and added to the database. This new data could then be searched and would appear in a table on the main page and on the 
interactive map if a valid location was provided.

The delete incident form was a straightforward form prompting users to enter the ID of the crime they wanted to remove. Additional features of our application included 
UI elements for filtering crime data and color-coded markers representing different types of crimes. This project helped my teammates and I learn how to use APIs to 
dynamically update a server and its associated webpage.

To run the program, clone the code and run it on port 8001.
