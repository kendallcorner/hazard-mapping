var script = document.createElement('script');

SECRET_KEY = 'AIzaSyDUmNlxP-2Idp-JSC8Y0NAmU4JydjIijKs';

script.setAttribute('src','https://maps.googleapis.com/maps/api/js?key='+SECRET_KEY+'&callback=initMap&libraries=places');

document.body.appendChild(script);
