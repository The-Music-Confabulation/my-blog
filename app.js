//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

// Load the full build.
const _ = require('lodash');
const mongoose = require("mongoose")


const app = express();

var posts = [];

var pass = process.env.MONGOPASS;

mongoose.connect("mongodb+srv://ttran293:" + 
                                      pass + 
                "@cluster0.1wmqh.mongodb.net/blog_content?retryWrites=true&w=majority", 
                {useNewUrlParser: true});


// mongoose.connect("mongodb://localhost:27017/blog_content",{useNewUrlParser:true});


const page = {
  // id: "number",
  // key: "number",
  // day: "number",
  // month: "number",
  // year: "number",
  title: "string",
  content : "string",
  // author : "string",
  url : "string"
};



const Post = mongoose.model(
  "Post", page
);


const user = {
  user_name :"string",
  // name : "string",
  password : "string",
  email : "string"
}

const User = mongoose.model(
  "User", user 
);



app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


//use nodemon app.js
app.get("/",async function(req, res){

  var perPage = 3; //limit how many songs per page
  var total = await Post.count();
  console.log(total);

  var pages = Math.ceil(total/perPage);//calculate how many pages needed
  //console.log(pages)
  var pageNumber = (req.query.page == null) ? 1 : req.query.page;

  var startFrom = (pageNumber - 1) * perPage;
  //console.log(startFrom)
  var songs = await Post.find({}).skip(startFrom).limit(perPage);

  //console.log(songs.length)
  Post.find({}, function(err, foundItems){
      res.render("home",{
        newListItems: foundItems,
        pages:pages,
        songs:songs
      });
  });



});

app.get("/help",function(req, res){
  res.render("help");
});


app.get("/signup",function(req, res){
  res.render("signup");
});


app.post('/signup', (req, res) => {

  const client = new User ({
    user_name: req.body.userName,
    password: req.body.userPassword,
    email: req.body.userEmail
  });

  client.save(function(err){
    if (!err){
      res.redirect("/");
    }
  })
})

app.get("/login",function(req, res){
  res.render("login");
});

app.get("/compose",function(req, res){
  res.render("compose");
});


app.post('/compose', (req, res) => {

  const post = new Post ({
    title: req.body.postTitle,
    content: req.body.postBody,
    url: req.body.postURL
  });

  post.save(function(err){
    if (!err){
      res.redirect("/");
    }
  })
  // posts.push(post);


})


app.get("/posts/:postId", (req, res) =>{


  const topic_title = _.lowerCase(req.params.postId)
  
  // posts.forEach(element => {
  //   const post_header = _.lowerCase( element.title )
  //   const post_url = _.kebabCase(element.title)
  //     if ( post_header === topic_title){
  //         console.log("found");
  //         res.render("post", {
  //           pageTitle : element.title,
  //           pageContent : element.content
  //         })
  //     }
  // });

  const requestedPostId = req.params.postId;
  Post.findOne({_id: requestedPostId}, function(err, post){
    res.render("post", {
      title: post.title,
      content: post.content
    });
  });

})


//for debug local
// app.listen(3000, function() {
//   console.log("Server started");
// });

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started");
});
