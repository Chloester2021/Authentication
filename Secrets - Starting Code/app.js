//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");

// const encrypt = require('mongoose-encryption');

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// place session setting here.
app.use(
  session({
    secret: "rose is a rose.",
    resave: false,
    saveUninitialized: false,
    cookie: {},
  })
);
app.use(passport.initialize());
app.use(passport.session());
// use passport to deal with the session. See passport documentation

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  // it seems the plugin below changed 'email' to 'username' in the database. so whenever you create new user you have to use username.
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  username: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// const secret = process.env.SECRET
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });
// you have to position schema plugin before mongoose.model to work.

const User = new mongoose.model("User", userSchema);
// placed after mongoose model
passport.use(User.createStrategy());

// work with anykind of authentication
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


// google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile)
      User.findOrCreate({ googleId: profile.id, username: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://www.example.com/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, done) {
  User.findOrCreate({facebookId: profile.id, username:profile.id}, function(err, user) {
    if (err) { return done(err); }
    done(null, user);
  });
}
));




app.get("/", (req, res) => {
  res.render("home");
});

// use passport.authenticate to autenticate user using google strategy definde above.
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);


app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });


app.get('/auth/facebook',

  passport.authenticate('facebook', { scope: 'public_profile'})

);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/register", function (req, res) {
  // .register is from passport-local-mongoose package. It saves user infor to the userDB
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        //  redirect user to register page to try again
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(3000, () => console.log("At your service😊"));
