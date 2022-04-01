//dotenv config
require("dotenv").config();

//nodejs setup
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const expressLayouts = require("express-ejs-layouts");


//for image file upload
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { uploadFile, getFileStream } = require("./s3");

//passport for auth
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");

//for time calculation
const dayjs = require("dayjs");

//connect flash for client notifications
const flash = require("connect-flash");

//mongodb plugin
const mongoose = require("mongoose");

//filter input from users to prevent XSS attacks
const xss = require("xss");

//lodash for url processing
const _ = require("lodash");

//App Set Up
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//Set up sesson for passport - it's important that this step is exec here before connecting to db
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2592000000 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

//connect to database MONGODB
const pass = process.env.MONGOPW;
const server = process.env.SERVER;
const server_option = process.env.SERVER_OPTION;
mongoose.connect(server + pass + server_option, {
  useNewUrlParser: true,
});

const postSchema = new mongoose.Schema({
  title: { type: String, require: true },
  content: { type: String, require: true },
  author: { type: String },
  url: { type: String },
  date: { type: String },
  like: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Like",
    },
  ],
  tag: { type: String },
  approved: { type: Boolean },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
});

const Post = mongoose.model("Post", postSchema);

const likeSchema = new mongoose.Schema({
  like_username: { type: String },
  like_title_id: { type: String },
});

const Like = mongoose.model("Like", likeSchema);

const commentSchema = new mongoose.Schema({
  comment_user: "string",
  comment_content: "string",
  comment_id: "string",
  comment_date: "string",
});

const Comment = mongoose.model("Comment", commentSchema);

const followerSchema = new mongoose.Schema({
  follower_username: "string",
  follower_id: "string",
});

const Follower = mongoose.model("Follower", followerSchema);

const followingSchema = new mongoose.Schema({
  following_username: "string",
  following_id: "string",
});

const Following = mongoose.model("Following", followingSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, require: true, allowNull: false, unique: true },
  password: { type: String, require: true },
  email: { type: String },
  animal: { type: String },
  profileImage: { type: String },
  profileImageApprove: {type: Boolean},
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Follower" }],
  numberOfPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  followings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Following" }],
  info: { type: String },
  socialLinks: { type: String },
  fullname: { type: String },
  dateJoin: { type: String },
  like: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Like",
    },
  ],
  comment: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static("public"));

let isLoggedIn = false;
let isAdmin = false;
var getYouTubeID = require("get-youtube-id");

app.get("/home", async function (req, res) {
  current_user_info = "";
  let imagepath = "893269f772429058a3c0d277256b1625";
  if (req.isAuthenticated()) {
    current_user_info = req.user.username;
    let curUser = await User.findOne({username: current_user_info});
    imagepath = curUser.profileImage;
  }

  //--Pagination && Load songs in homepage--//
  var perPage = 8; //limit how many songs per page
  var total = await Post.count();
  var pages = Math.ceil(total / perPage); //calculate how many pages needed
  var pageNumber = req.query.page == null ? 1 : req.query.page;
  var startFrom = (pageNumber - 1) * perPage;
  Post.find({ approved: { $eq: true } })
    .skip(startFrom)
    .limit(perPage)
    .sort({ _id: -1 })
    .populate("like")
    .populate("comments")
    .exec(function (err, songs) {
      if (err) {
        console.log(err);
      } else {
        res.render("home", {
          pages: pages,
          songs: songs,
          profileImage: imagepath,
          isLoggedIn: isLoggedIn,
          current_user_info: current_user_info,
        });
      }
    });
});

app.get("/help", function (req, res) {
  res.render("help", {
    isLoggedIn: isLoggedIn,
  });
});

app.get("/signup", function (req, res) {
  res.render("signup", {
    isLoggedIn: isLoggedIn,
  });
});

app.get("/login", (req, res) => {
  res.render("login", {
    isLoggedIn: isLoggedIn,
  });
});

function usernameConstraint(name) {
  //let format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  if (name.includes(" ")) {
    return true;
  } else {
    return false;
  }
}

//https://stackoverflow.com/questions/48096378/bad-request-when-registering-with-passport
//passport.authenticate is a middleware, which means that you have to call it with 3 parameters (req, res, next)
//without 3 parameters it returns bad request error
app.post(
  "/signup",
  function (req, res, next) {
    new_username = req.body.username;
    new_password = req.body.userpassword;
    new_password2 = req.body.userpassword_2;
    let errors = [];

    if (!new_username || !new_password) {
      errors.push({
        msg: "All the fields must be filled to proceed",
      });
    }

    if (usernameConstraint(new_username)) {
      errors.push({
        msg: "Username must have no spaces",
      });
    }
    if (new_password != new_password2) {
      errors.push({
        msg: "The two passwords must match to proceed",
      });
    }

    if (new_password.length < 5) {
      errors.push({
        msg: "Sorry the password must be at least 5 characters long",
      });
    }

    if (errors.length > 0) {
      res.render("signup", {
        errors,
        isLoggedIn,
      });
    } else {
      //Check if the user exists
      User.findOne({
        username: new_username,
      }).then((user) => {
        if (user) {
          errors.push({
            msg: "A user with this username already exists",
          });
          res.render("signup", {
            errors,
            isLoggedIn,
          });
        } else {
          let now = dayjs();
          //hash the password and register the user
          User.register(
            {
              username: new_username,
              email: req.body.email,
              animal: "undecided",
              info: "Something about yourself",
              fullname: "Full Name",
              profileImage: "",
              profileImageApprove: true,
              dateJoin: now.format("dddd, MMMM D YYYY"),
            },
            req.body.userpassword,
            function (err, user) {
              if (err) {
                console.log(err);
                return res.redirect("/signup");
              }
              // go to the next middleware
              next();
            }
          );
        }
      });
    }
  },
  passport.authenticate("local", {
    successRedirect: "/login",
    failureRedirect: "/login",
  })
);

app.post("/login", function (req, res) {
  let errors = [];
  //check the DB to see if the username that was used to login exists in the DB
  User.findOne(
    {
      username: req.body.username,
    },
    function (err, foundUser) {
      //if username is found in the database, create an object called "user" that will store the username and password
      //that was used to login
      if (foundUser) {
        const user = new User({
          username: req.body.username,
          password: req.body.password,
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
                res.redirect("/home");
              });
            } else {
              errors.push({
                msg: "Incorrect username or password.",
              });
              res.render("login", {
                errors,
                isLoggedIn,
              });
            }
          }
        })(req, res);
        //if no username is found at all, redirect to login page.
      } else {
        //user does not exists
        errors.push({
          msg: "The username that you've entered doesn't match any account. Sign up for an account.",
        });
        res.render("login", {
          errors,
          isLoggedIn,
        });
      }
    }
  );
});

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", {
      isLoggedIn: isLoggedIn,
    });
  } else {
    req.flash("error_msg", "You need to login to post.");
    res.redirect("/login");
  }
});

app.post("/compose", (req, res) => {
  let now = dayjs();
  console.log(req.body.postBody);
  const content_clean = xss(req.body.postBody);

  const post = new Post({
    title: req.body.postTitle,
    content: content_clean,
    author: req.user.username,
    url: getYouTubeID(req.body.postURL),
    tag: req.body.postTag,
    approved: false,
    date: now.format("dddd, MMMM D YYYY"),
  });

  post.save(function (err, result) {
    if (!err) {
      User.findById(req.user._id, (err, ret) => {
        if (err) {
          console.log(err);
        } else {
          ret.numberOfPosts.push(result);
          ret.save();
          res.redirect("/home");
        }
      });
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout();
  isLoggedIn = false;
  res.redirect("/home");
});

app.get("/posts/:postId", (req, res) => {
  Post.findById(req.params.postId)
    .populate("comments")
    .exec(function (err, post) {
      if (err) {
        console.log(err);
      } else {
        res.render("post", {
          title: post.title,
          postID: post._id,
          url: post.url,
          post_comments: post.comments,
          author: post.author,
          date: post.date,
          like: post.like,
          content: post.content,
          isLoggedIn: isLoggedIn,
        });
      }
    });
});

app.post("/comments/:view/:postId", (req, res) => {
  // find out which post are being commented on
  const post_id = req.params.postId;
  let route_back = req.params.view;
  
  // const comment_user = req.body.commentUsername;
  // const comment_content = req.body.commentContent;
  let now = dayjs();

  if (req.isAuthenticated()) {
    const comment = new Comment({
      comment_user: req.user.username,
      comment_content: req.body.commentContent,
      comment_id: post_id,
      comment_date: now.format("dddd, MMMM D YYYY"),
    });

    console.log(post_id);
    console.log(route_back);
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
            // res.redirect('/posts/' + post_id)
          }
        });

        User.findOne({ username: req.user.username }, (err, foundUser) => {
          if (err) {
            console.log(err);
          } else {
            foundUser.comment.push(result);
            foundUser.save();
            if (route_back==='home'){
              res.redirect("/home");  
            } 
            else if (route_back === "post") {
              res.redirect("/posts/" + post_id);
            }
            else {
              res.redirect("/home");  
            }
          }
        });
      }
    });
  } else {
    req.flash("error_msg", "You need to login to post.");
    res.redirect("/login");
  }
});

app.post("/:id/like", (req, res) => {
  if (req.isAuthenticated()) {
    const post_title = req.params.title;
    const like = new Like({
      like_username: req.user.username,
      like_title_id: req.params.id,
    });
    //check if user already like
    Like.findOne(
      { like_username: req.user.username, like_title_id: req.params.id },
      (err, foundLike) => {
        if (!foundLike) {
          like.save((err, result) => {
            if (err) {
              console.log(err);
            } else {
              Post.findById(req.params.id, function (err, ret) {
                if (err) {
                  console.log(err);
                } else {
                  ret.like.push(result);
                  ret.save();
                }
              });

              User.findOne(
                { username: req.user.username },
                function (err, ret_u) {
                  if (err) {
                    console.log(err);
                  } else {
                    console.log("Like updated");
                    ret_u.like.push(result);
                    ret_u.save();
                    res.redirect("/home");
                  }
                }
              );
            }
          });
        } else {
          res.redirect("/home");
        }
      }
    );
  } else {
    req.flash("error_msg", "You need to login to like.");
    res.redirect("/login");
  }
});

app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("followings")
      .populate("followers")
      .populate("numberOfPosts")
      .exec(function (err, results) {

        let imagepath = "893269f772429058a3c0d277256b1625";
        if (results.profileImage != "") {
          imagepath = results.profileImage;
        }

        res.render("profile", {
          alreadyFollow: false,
          current_user_id: req.user._id.valueOf(),
          id: results._id.valueOf(),
          username: results.username,
          userFullname: results.fullname,
          dateJoin: results.dateJoin,
          posts: results.numberOfPosts,
          followers: results.followers,
          following: results.followings,
          animal: results.animal,
          info: results.info,
          profileImage: imagepath,
          isLoggedIn: isLoggedIn,
        });
      });
  } else {
    req.flash("error_msg", "You need to login first.");
    res.redirect("/login");
  }
});

app.post("/profile", (req, res, next) => {
  console.log(req.body);
  User.updateOne(
    {
      username: req.body.username,
    },
    {
      $set: {
        fullname: req.body.nameEdit,
        info: req.body.bioEdit,
      },
    },
    function (err, result) {
      if (err) {
        console.log(err);
      } else {
        console.log("User info updated");
        res.redirect("/profile");
      }
    }
  );
});

app.get("/profile/:name", async function (req, res) {
  let alreadyFollow = false;
  let imagepath = "893269f772429058a3c0d277256b1625";
  current_user_info = null;
  //Post.findById(req.params.postId).populate("comments").exec(function (err, post)
  await User.findOne({
    username: req.params.name,
  })
    .populate("numberOfPosts")
    .populate("followings")
    .populate("followers")
    .exec(async function (err, results) {
      if (err) {
        //user not found
        console.log(err);
      } else {
        // console.log(foundUser.followers.length);
        console.log(results);
        if (req.isAuthenticated()) {
          current_user_info = req.user._id;
          console.log(req.params.name);
          console.log(req.user._id.valueOf());

          let result = await Following.findOne({
            following_username: results.username,
            following_id: req.user._id.valueOf(),
          });
          if (result != null) {
            alreadyFollow = true;
          }
        }
        if (current_user_info != null) {
          current_user_info = current_user_info.valueOf();
        }
        
        if (results.profileImage != ''){
          imagepath = results.profileImage;
        }
        console.log(alreadyFollow);
        res.render("profile", {
          //along with variables here
          alreadyFollow: alreadyFollow,
          current_user_id: current_user_info,
          id: results._id.valueOf(),
          username: results.username,
          userFullname: results.fullname,
          dateJoin: results.dateJoin,
          posts: results.numberOfPosts,
          followers: results.followers,
          following: results.followings,
          animal: results.animal,
          info: results.info,
          profileImage: imagepath,
          isLoggedIn: isLoggedIn,
        });
      }
    });
});

app.post("/profile/:name/follow/:id", (req, res) => {
  //need to check for authentication here in case people by pass api-url
  if (req.isAuthenticated()) {
    //User->id->username
    // console.log(req.params.name); //the person the current user want to follow
    // console.log(req.params.id); //this is id of current user
    const following = new Following({
      following_username: req.params.name,
      following_id: req.params.id,
    });

    const follower = new Follower({
      follower_username: req.user.username,
      follower_id: req.user.id,
    });
    //check if already follow
    //find in the Follower schema
    //check if there is an object
    //such that object.follower.id = req.params.id
    //and object.follower.name = req.params.name
    //if yes, mean person A already follow person B
    //thus no need to save
    Following.findOne(
      { following_username: req.params.name, following_id: req.params.id },
      (err, foundUser) => {
        if (foundUser) {
          //if user exists, no need to save, may do unfollow here
          console.log(foundUser);
          res.redirect("/profile/" + req.params.name);
        } else {
          //save in following schema
          following.save((err, result) => {
            if (err) {
              console.log(err);
            } else {
              User.findById(req.params.id, (err, ret) => {
                if (err) {
                  console.log(err);
                } else {
                  ret.followings.push(result);
                  ret.save();
                }
              });
            }
          });
          follower.save((err, result) => {
            if (err) {
              console.log(err);
            } else {
              User.findOne({ username: req.params.name }, (err, ret) => {
                if (err) {
                  console.log(err);
                } else {
                  ret.followers.push(result);
                  ret.save();
                }
              });
            }
          });
        }
      }
    );
  } else {
    req.flash("error_msg", "You need to login to post.");
    res.redirect("/login");
  }
});

app.get("/", (req, res) => {
  res.render("test");
});

app.get("/admin", (req, res) => {
  res.render("admin", {
    isLoggedIn: isLoggedIn,
  });
});

app.post("/admin", function (req, res) {
  let errors = [];
  //check the DB to see if the username that was used to login exists in the DB

  User.findOne(
    {
      username: req.body.username,
    },
    function (err, foundUser) {
      //if username is found in the database, create an object called "user" that will store the username and password
      //that was used to login
      if (foundUser) {
        let user = new User({
          username: "admin",
          password: process.env.ADMIN_PW,
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

            if (user.username === "admin") {
              //if true, then log the user in, else redirect to login page
              req.login(user, function (err) {
                isLoggedIn = true;
                isAdmin = true;

                res.redirect("/admin/dashboard");
              });
            } else {
              errors.push({
                msg: "Incorrect username or password.",
              });
              res.render("login", {
                errors,
                isLoggedIn,
              });
            }
          }
        })(req, res);
        //if no username is found at all, redirect to login page.
      } else {
        //user does not exists
        errors.push({
          msg: "The username that you've entered doesn't match any account. Sign up for an account.",
        });
        res.render("login", {
          errors,
          isLoggedIn,
        });
      }
    }
  );
});

app.get("/admin/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
    if (isAdmin) {
      Post.find({}, function (err, foundPost) {
        res.render("admindashboard", {
          foundPost: foundPost,
        });
      }).sort({ _id: -1 });
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/admin/dashboard/:id", (req, res) => {
  if (isAdmin) {
    todo = req.body.act;
    if (todo === "delete") {
      res.redirect("/admin/dashboard");
    } else if (todo === "approve") {
      console.log("Updating");
      Post.updateOne(
        { _id: req.params.id },
        { $set: { approved: "true" } },
        function (err) {
          if (err) return handleError(err);
        }
      );
      res.redirect("/admin/dashboard");
    }
  } else {
    res.redirect("/login");
  }
});


app.get("/images", (req, res) => {
  res.render("image")
});

app.get("/images/:key", (req, res) => {
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
});

app.post("/images", upload.single("avatar"), async function (req, res, next) {
  const file = req.file;
  var ObjectId = require("mongodb").ObjectId;

  console.log(file)
  if (file === undefined || file === null){
    console.log("Here");
    res.render("/profile");
  }
  
  const result = await uploadFile(file);
  await unlinkFile(file.path);


  User.updateOne(
    {
      _id: ObjectId(req.user._id),
    },
    {
      $set: {
        profileImage : file.filename.toString(),
      },
    },
    async function (err, done) {
      if (err) {
        console.log(err);
      } else {
          
        
        console.log("Profile pic updated");
        res.redirect("/profile");
      }
    }
  );



});



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started");
});
