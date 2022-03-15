//dotenv config
require('dotenv').config();

//nodejs setup
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const expressLayouts = require('express-ejs-layouts')

//passport for auth
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local')
const passportLocalMongoose = require("passport-local-mongoose");

//for time calculation 
const dayjs = require('dayjs');

//connect flash for client notifications 
const flash = require('connect-flash');

//mongodb plugin
const mongoose = require("mongoose");


//filter input from users to prevent XSS attacks
const xss = require("xss");


//lodash for url processing
const _ = require('lodash');

//App Set Up
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//Set up sesson for passport - it's important that this step is exec here before connecting to db
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {}
}))

app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

//connect to database MONGODB 
const pass = process.env.MONGOPW;
const server = process.env.SERVER;
const server_option = process.env.SERVER_OPTION
mongoose.connect(server + pass + server_option, {
  useNewUrlParser: true
});


var posts = [];


const postSchema = new mongoose.Schema({
  title: {
    type: String,
    require: true
  },
  content: {
    type: String,
    require: true
  },
  author: {
    type: String
  },
  url: {
    type: String
  },
  date: {
    type: String
  },
  like: {
    type: Number
  },
  tag: {
    type: String
  },
  approved: {
    type: Boolean
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }]
});


const Post = mongoose.model(
  "Post", postSchema
);

const commentSchema = new mongoose.Schema({
  comment_user: "string",
  comment_content: "string",
  comment_date: "string"
});

const Comment = mongoose.model(
  "Comment", commentSchema
);


const followerSchema = new mongoose.Schema({
  follower_username: "string",
  follower_since: "string"
});

const Follower = mongoose.model(
  "Follower", followerSchema
);

const followingSchema = new mongoose.Schema({
  follower_username: "string",
  follower_since: "string"
});

const Following = mongoose.model(
  "Following", followingSchema
);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    require: true,
    allowNull: false,
    unique: true
  },
  password: {
    type: String,
    require: true
  },
  email: {
    type: String
  },
  animal: {
    type: String
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Follower'
  }],
  numberOfPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  followings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Following'
  }],
  info: {
    type: String
  },
  socialLinks: {
    type: String
  },
  fullname: {
    type: String
  },
  dateJoin: {
    type: String
  },
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model(
  "User", userSchema
);


passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

let isLoggedIn = false;


//use nodemon app.js

var getYouTubeID = require('get-youtube-id');



app.get("/", async function (req, res) {
  //--Pagination && Load songs in homepage--//
  var perPage = 4; //limit how many songs per page
  var total = await Post.count();
  var pages = Math.ceil(total / perPage); //calculate how many pages needed
  var pageNumber = (req.query.page == null) ? 1 : req.query.page;
  var startFrom = (pageNumber - 1) * perPage;
  var songs = await Post.find({
    approved: {
      $eq: true
    }
  }).skip(startFrom).limit(perPage).sort({
    _id: -1
  });

  //--Pagination--//
  res.render("home", {
    pages: pages,
    songs: songs,
    isLoggedIn: isLoggedIn
  });
});

app.get("/help", function (req, res) {
  res.render("help", {
    isLoggedIn: isLoggedIn
  });
});


app.get("/signup", function (req, res) {
  res.render("signup", {
    isLoggedIn: isLoggedIn
  });
});

app.get('/login', (req, res) => {
  res.render("login", {
    isLoggedIn: isLoggedIn
  });
});


function usernameConstraint(name) {
  let format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;


  if (format.test(name) || name.includes(" ")) {
    return true;
  } else {
    return false;
  }
}


//https://stackoverflow.com/questions/48096378/bad-request-when-registering-with-passport
//passport.authenticate is a middleware, which means that you have to call it with 3 parameters (req, res, next)
//without 3 parameters it returns bad request error
app.post("/signup", function (req, res, next) {
  new_username = req.body.username;
  new_password = req.body.userpassword;
  new_password2 = req.body.userpassword_2;
  let errors = []




  if (!new_username || !new_password) {
    errors.push({
      msg: 'All the fields must be filled to proceed'
    });
  }



  if (new_password != new_password2) {
    errors.push({
      msg: 'The two passwords must match to proceed'
    });
  }

  if (new_password.length < 5) {
    errors.push({
      msg: 'Sorry the password must be at least 5 characters long'
    });
  }

  if (errors.length > 0) {
    res.render('signup', {
      errors,
      isLoggedIn
    });
  } else {
    //Check if the user exists
    User.findOne({
      username: new_username
    }).then(user => {
      if (user) {
        errors.push({
          msg: 'A user with this username already exists'
        })
        res.render('signup', {
          errors,
          isLoggedIn
        })
      } else {
        let now = dayjs();
        //hash the password and register the user
        User.register({
          username: new_username,
          email: req.body.email,
          animal: "undecided",
          info: "Something about yourself",
          fullname: "Full Name",
          dateJoin: now.format("dddd, MMMM D YYYY")
        }, req.body.userpassword, function (err, user) {
          if (err) {
            console.log(err);
            return res.redirect('/signup');
          }
          // go to the next middleware
          next();
        });
      }
    })
  }
}, passport.authenticate('local', {
  successRedirect: '/login',
  failureRedirect: '/login'
}));


app.post("/login", function (req, res) {
  let errors = []
  //check the DB to see if the username that was used to login exists in the DB
  User.findOne({
    username: req.body.username
  }, function (err, foundUser) {


    //if username is found in the database, create an object called "user" that will store the username and password
    //that was used to login
    if (foundUser) {
      const user = new User({
        username: req.body.username,
        password: req.body.password
      });
      //use the "user" object that was just created to check against the username and password in the database
      //in this case below, "user" will either return a "false" boolean value if it doesn't match, or it will
      //return the user found in the database
      passport.authenticate("local", function (err, user) {
        if (err) {
          console.log(err);
        } else {
          //this is the "user" returned from the passport.authenticate callback, which will be either
          //a false boolean value if no it didn't match the username and password or
          //a the user that was found, which would make it a truthy statement
          if (user) {
            //if true, then log the user in, else redirect to login page
            req.login(user, function (err) {
              isLoggedIn = true;
              res.redirect("/");
            });
          } else {
            errors.push({
              msg: "Incorrect username or password."
            })
            res.render('login', {
              errors,
              isLoggedIn
            })
          }
        }
      })(req, res);
      //if no username is found at all, redirect to login page.
    } else {
      //user does not exists
      errors.push({
        msg: 'The username that you\'ve entered doesn\'t match any account. Sign up for an account.'
      })
      res.render('login', {
        errors,
        isLoggedIn
      });
    }
  });
});


app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", {
      isLoggedIn: isLoggedIn,
    });
  } else {
    req.flash('error_msg', 'You need to login to post.')
    res.redirect("/login");
  }
});


app.post('/compose', (req, res) => {


  let now = dayjs();
  console.log(req.body.postBody);
  const content_clean = xss(req.body.postBody)
  console.log(content_clean);
  const post = new Post({
    title: req.body.postTitle,
    content: content_clean,
    author: req.user.username,
    url: getYouTubeID(req.body.postURL),
    like: 0,
    tag: req.body.postTag,
    approved: false,
    date: now.format("dddd, MMMM D YYYY")
  });

  console.log(post);

  post.save(function (err) {
    if (!err) {
      res.redirect("/");
    }
  })

})

app.get('/logout', (req, res) => {
  req.logout();
  isLoggedIn = false;
  res.redirect("/");
})



app.get("/posts/:postId", (req, res) => {

  Post.findById(req.params.postId).populate("comments").exec(function (err, post) {
    if (err) {
      console.log(err);
    } else {
      res.render('post', {
        title: post.title,
        postID: post._id,
        url: post.url,
        post_comments: post.comments,
        author: post.author,
        date: post.date,
        like: post.like,
        content: post.content,
        isLoggedIn: isLoggedIn
      })
    }
  });

});


app.post("/posts/:postId", (req, res) => {

  // find out which post are being commented on 
  const post_id = req.params.postId;
  // const comment_user = req.body.commentUsername;
  // const comment_content = req.body.commentContent;

  let now = dayjs();

  const comment = new Comment({
    comment_user: req.body.commentUsername,
    comment_content: req.body.commentContent,
    comment_date: now.format("dddd, MMMM D YYYY")
  });


  comment.save((err, result) => {
    if (err) {
      console.log(err);
    } else {
      Post.findById(post_id, (err, ret) => {
        if (err) {
          console.log(err);
        } else {
          ret.comments.push(result);
          ret.save();
          res.redirect('/posts/' + post_id)
        }
      });
    }
  })
});

app.post('/:id/like', (req, res, next) => {
  const post_id = mongoose.Types.ObjectId(req.params.id);

  Post.updateOne({
    _id: post_id
  }, {
    $inc: {
      like: 1
    }
  }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      console.log("Like updated");
      res.redirect('/');
    }
  });

});


app.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {

    res.render("profile", {
      id: req.user._id,
      username: req.user.username,
      userFullname: req.user.fullname,
      dateJoin: req.user.dateJoin,
      posts: req.user.numberOfPosts,
      followers: req.user.follower,
      following: req.user.following,
      animal: req.user.animal,
      info: req.user.info,
      isLoggedIn: isLoggedIn,
    });
  } else {
    req.flash('error_msg', 'You need to login to post.')
    res.redirect("/login");
  }
})

app.post('/profile', (req, res, next) => {

  console.log(req.body);
  User.updateOne({
    username: req.body.username
  }, {
    $set: {
      fullname: req.body.nameEdit,
      info: req.body.bioEdit
    }
  }, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      console.log("User info updated");
      res.redirect('/profile');
    }
  });

});


app.get('/profile/:name', (req, res) => {
  current_user_info = null
  User.findOne({
    username: req.params.name
  }, (err, foundUser) => {
    if (err) {
      //user not found
      console.log(err);
    } else {
      // console.log(foundUser.followers.length);
      if (req.isAuthenticated()) {
          current_user_info= req.user._id
      } 
      if (current_user_info!= null )
      {
        current_user_info= current_user_info.valueOf()
      }
      console.log(foundUser._id.valueOf());
      res.render('profile', {
        //along with variables here

        current_user_id:current_user_info,
        id: foundUser._id.valueOf(),
        username: foundUser.username,
        userFullname: foundUser.fullname,
        dateJoin: foundUser.dateJoin,
        posts: foundUser.numberOfPosts,
        followers: foundUser.followers,
        following: foundUser.followings,
        animal: foundUser.animal,
        info: foundUser.info,
        isLoggedIn: isLoggedIn
      })
    }
  })
});

app.get('/profile/:name/following/:id/:current/', (req, res) => {
   if (req.isAuthenticated()) {
        //User->id->username
        const follower = new Follower({
        //here are the follower of 
        comment_user: req.body.commentUsername,
        comment_content: req.body.commentContent,
        comment_date: now.format("dddd, MMMM D YYYY")
      });

  } else {
    req.flash('error_msg', 'You need to login to post.')
    res.redirect("/login");
  }
  // comment.save((err, result) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     Post.findById(post_id, (err, ret) => {
  //       if (err) {
  //         console.log(err);
  //       } else {
  //         ret.comments.push(result);
  //         ret.save();
  //         res.redirect('/posts/' + post_id)
  //       }
  //     });
  //   }
  // })
});




app.get('/test', (req, res) => {
  res.render('test', {
    isLoggedIn: isLoggedIn
  });
})


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started");
});