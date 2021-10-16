//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

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
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

// const secret = process.env.SECRET
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });
// you have to position schema plugin before mongoose.model to work.

const User = new mongoose.model("User", userSchema);
// placed after mongoose model
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
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
