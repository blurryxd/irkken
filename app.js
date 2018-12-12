'use strict';
require('dotenv').config();
const express = require('express');
const db = require('./modules/database');
const resize = require('./modules/resize');
const exif = require('./modules/exif');
const fs = require('fs');
const https = require('https');
const http = require('http');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const multer = require('multer');
const upload = multer({dest: 'public/uploads/'});

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

// parse application/json
app.use(bodyParser.json());

// enable cookies to send userID to client
app.use(cookieParser());

const connection = db.connect();

app.use(express.static('public'));

// login with passport
passport.serializeUser((user, done) => {
  console.log('serialize:', user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// function to check if the user has logged in, to be used in middleware
const loggedIn = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.send('{"error": "Not logged in!"}');
  }
};

app.use(session({
  secret: 'keyboard LOL cat',
  resave: true,
  saveUninitialized: true,
  cookie: {secure: true},
}));

passport.use(new LocalStrategy(
    (username, password, done) => {
      console.log('Here we go: ' + username);
      // let res = null;

      const doLogin = (username, password) => {
        return new Promise((resolve, reject) => {
          db.login([username], connection, (result) => {
            if (result.length < 1) {
              result.push({password: ''});
            }
            bcrypt.compare(password, result[0].password, function(err, res) {
              // res == true
              if (res) {
                resolve(result);
              } else {
                reject(err);
              }
            });
          });
        });
      };

      return doLogin(username, password).then((result) => {
        if (result.length < 1) {
          console.log('undone');
          return done(null, false);
        } else {
          console.log('done');
          result[0].password = ''; // remove password from user's data
          return done(null, result[0]); // result[0] is user's data, accessible as req.user
        }
      }).catch((err) => {
        console.log('Dologin errori', err);
        return done(null, false);
      });
    },
));

app.use(passport.initialize());
app.use(passport.session());

/*
app.post('/login',
    passport.authenticate('local',
        {
          successRedirect: '/node/front.html',
          failureRedirect: '/node/login.html',
        },
    ),
);
*/

// authentication with custom callback (http://www.passportjs.org/docs/authenticate/)
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) { // if login not happening
      return res.redirect('/node/login.html');
    }
    req.logIn(user, function(err) {
      // send userID as cookie:
      res.cookie('userID', req.user.ID);
      if (err) {
        return next(err);
      }
      return res.redirect('/node/front.html'); // if login succesful
    });
  })(req, res, next);
});

app.use('/register', (req, res, next) => {
  console.log(req.body);
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    console.log('hash', hash);
    db.register([req.body.username, hash], connection, () => {
      next();
    });
  });

});

app.post('/register', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) { // if login not happening
      return res.redirect('/node/login.html');
    }
    req.logIn(user, function(err) {
      // send userID as cookie:
      // res.cookie('userID', req.user.uID);
      if (err) {
        return next(err);
      }
      return res.redirect('/node/login.html'); // if login succesful
    });
  })(req, res, next);
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('./login.html');
});

app.get('/', (req, res) => {
  // check for https
  if (req.secure) {
    console.log('req.user', req.user);
    // if user is not logged
    if (req.user !== undefined) {
      res.redirect(301, 'front.html');
    } else {
      res.redirect(301, 'login.html');
    }
  } else {
    // if not https
    res.send('{"status": "not https"}');
  }
});

// serve static files
app.use(express.static('public'));
// serve node_modules
app.use('/modules', express.static('node_modules'));

// database select calback
/*const cb = (result, res) => {
  console.log(result);
  result.ID = req.user.ID;
  res.send(result);
};*/
const cb = (result, res) => {
  console.log(result);
  res.send(result);
};

// respond to post and save file
app.post('/upload', upload.single('mediafile'), (req, res, next) => {
  next();
});

// create thumbnail
app.use('/upload', (req, res, next) => {
  resize.doResize(req.file.path, 300,
      './public/thumbs/' + req.file.filename + '_thumb', next);
});

// create medium image
app.use('/upload', (req, res, next) => {
  resize.doResize(req.file.path, 640,
      './public/medium/' + req.file.filename + '_medium', next);
});

// get coordinates
app.use('/upload', (req, res, next) => {
  exif.getCoordinates(req.file.path).then(coords => {
    req.coordinates = coords;
    next();
  }).catch(() => {
    console.log('No coordinates');
    req.coordinates = {};
    next();
  });
});

// insert to database
app.use('/upload', (req, res, next) => {
//  console.log('user id', req.user.ID);

  const data = [
    req.body.category,
    req.body.title,
    req.body.details,
    'thumbs/' + req.file.filename + '_thumb',
    'medium/' + req.file.filename + '_medium',
    'uploads/' + req.file.filename,
    req.coordinates,
//   req.user.ID,
  ];
  db.insert(data, connection, next);
});

app.use('/comment', (req, res, next) => {
  const data = [
    req.user.ID,
    req.item.mID,
    req.body.kommentti,
  ];
  db.insertComment(data, connection, next);
});

// get updated data form database and send to client
app.use('/upload', (req, res) => {
  db.select(connection, cb, res);
});

app.get('/images', (req, res) => {
  db.select(connection, cb, res);
});

app.get('/comments/:id', (req, res) => {
  const id = req.params.id;
  db.getComments(connection, [id], (result) => {
    res.send(result);
  });
});

app.patch('/viewAdd/:id', (req, res) => {
  const id = [req.params.id];
  db.addView(connection, [id], (result) => {
    res.send(result);
  });
});

app.delete('/images/:ID', (req, res) => {
  const ID = [req.params.ID];
  db.delete(ID, connection);
  res.send('{"status": "OK"}');
});

// https setup
app.set('trust proxy');
const sslkey = fs.readFileSync('/etc/pki/tls/private/ca.key');
const sslcert = fs.readFileSync('/etc/pki/tls/certs/ca.crt');
const options = {
  key: sslkey,
  cert: sslcert,
};

// start http and https servers, server address is https://servername/node/ e.g. https://10.114.34.45/node/
// app.listen(3000);
http.createServer((req, res) => {
  const redir = 'https://' + req.headers.host + '/node' + req.url;
  console.log('redir', redir);
  res.writeHead(301, {'Location': redir});
  res.end();
}).listen(8000);
https.createServer(options, app).listen(3000);