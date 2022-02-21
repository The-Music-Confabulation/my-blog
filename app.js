//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

// Load the full build.
const _ = require('lodash');
const mongoose = require("mongoose")


const app = express();

var posts = [];

var pass = process.env.mongopass
mongoose.connect("mongodb+srv://ttran293:" + pass + "@cluster0.1wmqh.mongodb.net/blog_content?retryWrites=true&w=majority", {useNewUrlParser: true});

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


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


//use nodemon app.js
app.get("/",function(req, res){
  Post.find({}, function(err, foundItems){
      res.render("home",{
        newListItems: foundItems
      });
  });
});

app.get("/about",function(req, res){
  res.render("about", {aboutContent });
});

app.get("/contact",function(req, res){
  res.render("contact", {contactContent });
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

app.get("/posts/:topic", (req, res) =>{


const topic_title = _.lowerCase(req.params.topic)
  posts.forEach(element => {
    const post_header = _.lowerCase( element.title )
    const post_url = _.kebabCase(element.title)
    //console.log(pageURL)
      if ( post_header === topic_title){
          //console.log("found");
          res.render("post", {
            pageTitle : element.title,
            pageContent : element.content
          })

      }

  });

})









app.listen(3000, function() {
  console.log("Server started on port 3000");
});
