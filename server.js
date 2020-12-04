// use the express module 
var express = require('express');
let User = require('./user');
// create an app 
var app = express();


// app.use((req, res) => {
//     res.header('Access-Control-Allow-Origin', '*');
// });



var cookieParser = require('cookie-parser');
app.use(cookieParser());

var session = require('express-session')

const path = require("path");

app.set("views", __dirname + "/views");
app.engine('html', require('ejs').renderFile);
app.set('trust proxy', 1) // trust first proxy

// Create session
app.use(session({
    name: 'feraas',
    secret: 'tayeh',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: (30 * 24 * 60 * 1000) }
}))

// app.use(express.static(__dirname));
var bodyParser = require('body-parser');

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(express.static(__dirname + '/public'));


// Storing user coordinates


var mqtt = require('mqtt');
//var client = mqtt.connect('mqtt://broker.hivemq.com:8000',{qos:1});
var client = mqtt.connect('ws://localhost:9003');

client.on('connect', function () {

    client.subscribe('map/coordinates', function (err) { if(err)console.log(err); });
    // client.subscribe('userLocation/latitude', function(err){

    //     console.log(err);
    // });
    // client.subscribe('userLocation/longitude');
    // console.log("Subscribed to userlocation!! ")
})


// Add the user's coordinates from the map after he adds a destination (on click of the map)
client.on('message', function (topic, message) {
    x = JSON.parse(message);
    console.log(x);

    if (message.destinationName === "map/coordinates") {

        User.findOneAndUpdate({email: x.username},{latitude: x.current.sourceLat.toString()});
        User.findOneAndUpdate({email: x.username},{longitude: x.current.sourceLng.toString()});

    } 

})


app.get('/', (req, res) => {


    if (req.session.rememberMe) {

        if (req.session.loggedInState) {

            res.render('map.html');

        }

    }

    else {

        req.session.loggedInState = 0;
        res.redirect('/login.html');

    }
});



app.get('/register', (req, res) => {
    res.redirect('/register.html');
});

// When you log out, destroy session, delete cookies and redirect to login page.
app.get('/logout', (req, res) => {

    req.session.destroy();
    req.session = null // Deletes the cookie and destroys the session
    res.redirect('/'); // Go back to homepage (login)
})

// Only allow logged in users to access the map and arrow
app.get('/map', (req, res) => {

    if (req.session.loggedInState) {
        res.render('map.html');
    }
    else {

        res.redirect('error.html');
    }

})

app.get('/arrow', (req, res) => {

    if (req.session.loggedInState) {
        res.render('arrow.html');
    } else {

        res.redirect('error.html');
    }

})

app.get('/login', (req, res) => {


    // If this is on, then we remember the user
    if (req.query.cookieAllow === "on") {
        req.session.allow_cookies = true;
    }

    else {

        req.session.allow_cookies = false;
    }

    let cookiesAllowed = req.session.allow_cookies;
    console.log(cookiesAllowed);

    if (!cookiesAllowed) {
        // No cookies, so don't save any of the user's data, just render the map like in hw2
        console.log("Are cookies allowed?");
        console.log(cookiesAllowed);
        console.log("Are cookies allowed?");

        res.render('map.html');
    }

    if (cookiesAllowed) {
        console.log(cookiesAllowed);
        User.findOne({ email: req.query.email, password: req.query.psw }, function (err, img) {
            if (err) {
                console.log("This user does not exist.");
            } else {

                // On successful login, we need to store the user's email so that we can display it on 
                // The navbar
                // console.log(req.query.email);

                // If this is on, then we remember the user
                if (req.query.remember === "on") {
                    req.session.rememberMe = true;
                }

                req.session.email = req.query.email;
                req.session.save();

                // On successful login, we set loginstate to true
                // This allows our user to access the inner pages
                req.session.loggedInState = 1;

                // Nobody can access this externally.
                res.render('map.html');
            }
        })

    }

});

app.get('/userInfo', (req, res) => {


    // console.log(loggedInUserEmail);
    //console.log(dateAndTimeVisited);

    // If cookies are allowed, we save the user's details to dynamically display them
    if (req.session.allow_cookies) {

        if (req.session.page_views) {
            req.session.page_views++;
        } else {
            req.session.page_views = 1;
            let accessDate = "";
            req.session.accessDate = accessDate;
        }
        to_send = {
            email: req.session.email,
            dateAndTimeVisited: req.session.accessDate,
            pageViews: req.session.page_views,
            cookiesAllowed: req.session.allow_cookies
        };
        req.session.accessDate = new Date().toLocaleString();

        // console.log(req.session.accessDate);
        // console.log("sending", to_send);
        res.json(to_send);

    }

})

app.post('/register', urlencodedParser, (req, res) => {

    const newUser = new User({

        email: req.body.email,
        password: req.body.psw

    });
    console.log(newUser);
    newUser.save();

    res.redirect('/login.html');

});


// custom 404 page 
app.use(function (req, res) {
    res.type('text/plain');
    res.status(404);
    res.send("Error 404");
});

// custom 500 page 
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.type('text/plain');
    res.status(500);
    res.send("I dont understand what you mean. ");
});

// specify the port to listen to. 
app.set('port', process.env.PORT || 5000);


// launch 
app.listen(app.get('port'), function () {
    console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});