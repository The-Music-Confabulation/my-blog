//dotenv config
require('dotenv').config();

//nodejs setup
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

//passport for auth
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local')
const passportLocalMongoose = require("passport-local-mongoose");

//password auth
const encrypt = require("mongoose-encryption");
const bcrypt = require("bcrypt");
const saltRounds = 10;

//mongodb plugin
const mongoose = require("mongoose");


//lodash for url processing
const _ = require('lodash');

//App Set Up
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {}
}))

app.use(passport.initialize());
app.use(passport.session());



const pass = process.env.MONGOPW;
const server = process.env.SERVER;
const server_option = process.env.SERVER_OPTION 
mongoose.connect(server + pass + server_option, {useNewUrlParser: true});


var posts = [];


const page = {
  // id: "number",
  // key: "number",
  // day: "number",
  // month: "number",
  // year: "number",
  title: "string",
  content: "string",
  // author : "string",
  url: "string",
  comments : {
              comment_name: "string",
              comment_content: "string"
             }
};



const Post = mongoose.model(
  "Post", page
);


const userSchema = new mongoose.Schema({
  username: "string",
  // name : "string",
  password: "string",
  email: "string"
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model(
  "User", userSchema
);


passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

let isLoggedIn = false;

//use nodemon app.js
app.get("/", async function (req, res) {
  var perPage = 3; //limit how many songs per page
  var total = await Post.count();
  // console.log(total);

  var pages = Math.ceil(total / perPage); //calculate how many pages needed
  //console.log(pages)
  var pageNumber = (req.query.page == null) ? 1 : req.query.page;

  var startFrom = (pageNumber - 1) * perPage;
  //console.log(startFrom)
  var songs = await Post.find({}).skip(startFrom).limit(perPage).sort({_id:-1});

  //console.log(songs.length)
  Post.find({}, function (err, foundItems) {
    res.render("home", {
      newListItems: foundItems,
      pages: pages,
      songs: songs,
      isLoggedIn: isLoggedIn
    });
  });
});

app.get("/help", function (req, res) {
  res.render("help", {isLoggedIn: isLoggedIn});
});


app.get("/signup", function (req, res) {
  res.render("signup", {isLoggedIn: isLoggedIn});
});



//https://stackoverflow.com/questions/48096378/bad-request-when-registering-with-passport
//passport.authenticate is a middleware, which means that you have to call it with 3 parameters (req, res, next)
//without 3 parameters it returns bad request error
app.post("/signup", function (req, res, next) {
  // console.log(req.body.username);
  // console.log(req.body.userpassword);
    var newUser = new User({
        username: req.body.username
    });

    //need to check if user already exists here


    
    User.register(newUser, req.body.userpassword, function (err, user) {
        if (err) {
            console.log(err);
            return res.redirect('/signup');
        }
        // go to the next middleware
        next();
    });
}, passport.authenticate('local', { 
    successRedirect: '/compose',
    failureRedirect: '/login' 
}
)
);

app.get('/login', (req, res) => {
  res.render("login", {isLoggedIn: isLoggedIn});
})


app.post('/login',function(req, res){

  // passport.authenticate('local', { failureRedirect: '/login' }),
  // function(req, res) {
  //   res.redirect('/compose');


  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        isLoggedIn = true;
        res.redirect("/compose");
      });
      // passport.authenticate("local", {failureRedirect: '/login'}),
      // function(req, res){
      //   isLoggedIn = true;
      //   res.redirect("/compose");
      // }
    }
  });
});

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", {isLoggedIn: isLoggedIn});
  } else {
    res.redirect("/login");
  }
});


app.post('/compose', (req, res) => {

  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody,
    url: req.body.postURL
  });

  post.save(function (err) {
    if (!err) {
      res.redirect("/");
    }
  })
  // posts.push(post);


})

app.get('/logout', (req, res) => {
  req.logout();
  isLoggedIn = false;
  res.redirect("/");
})



app.get("/posts/:postId", (req, res) => {


  const topic_title = _.lowerCase(req.params.postId)

  // posts.forEach(element => {
  //   const post_header = _.lowerCase( element.title )
  //   const post_url = _.kebabCase(element.title)
  //     if ( post_header === topic_title){
  //         console.log("found");
  //         res.render("post", {
  //           pageTitle : element.title,
  //           pageContent : element.content
  //         })y
  //     }
  // });

  const requestedPostId = req.params.postId;
  Post.findOne({
    _id: requestedPostId
  }, function (err, post) {
    res.render("post", {
      title: post.title,
      content: post.content,
      isLoggedIn: isLoggedIn
    });
  });

})

app.get('/test', (req, res) => {
  res.render('test');
})
//for debug local
// app.listen(3000, function() {
//   console.log("Server started");
// });

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started");
});