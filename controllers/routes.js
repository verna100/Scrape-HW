const express = require("express");
const router = express.Router();
const db = require("../models");
// const request = require("request"); //Makes http calls
const cheerio = require("cheerio");
const axios = require("axios");


// Routes
// A GET route for scraping the NYPost
router.get("/scrape", function (req, res) {
// First, we grab the body of the html with axios
axios.get("http://nypost.com/").then(function (response) {
// Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    // console.log(response);
// Now, we grab every h2 within an article tag, and do the following:
    $("article").each(function (i, element) {
// Save an empty result object
        var result = {};
// Add the text and href of every title, link, and summary and save them as properties of the result object
        result.title = $(this)
        .children("a")
        .text().trim();
        result.link = $(this)
        .children("a")
        .attr("href");
        result.summary = $(this)
        .children('.excerpt')
        .text().trim() ;

        db.Article.create(result)
            .then(function(dbArticle) {
            console.log(dbArticle);
  })
            .catch(function(err) {
            console.log(err.message);
  });

        // if (result.title && result.link && result.summary){
// Create a new Article using the `result` object built from scraping(above), but only if both values are present
//             db.Article.create(result)
//                 .then(function (dbArticle) {
//                     count++;
//                 })
//                 .catch(function (err) {
//                     // If an error occurred, send it to the client
//                 res.json(err);
//                 });
//         };
//     });
//     // If we were able to successfully scrape and save an Article, redirect to index
//     res.redirect('/');
// // else if (error || response.statusCode != 200){
// //     res.send("Error: Unable to obtain new articles")
// // }
// // });
// // });
    
    });
});

});


// Clear the DB
router.get("/clearall", function(req, res) {
    // Remove every note from the notes collection
    db.Article.deleteMany({}, function(error, response) {
      // Log any errors to the console
      if (error) {
        console.log(error);
        res.send(error);
      }
      else {
        // Otherwise, send the mongojs response to the browser
        // This will fire off the success function of the ajax request
        console.log(response);
        res.send(response);
      }
    });
  });
  
router.get("/", (req, res) => {
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            const retrievedArticles = dbArticle;
            let hbsObject;
            hbsObject = {
                articles: dbArticle
            };
            res.render("index", hbsObject);        
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

router.get("/saved", (req, res) => {
    db.Article.find({isSaved: true})
        .then(function (retrievedArticles) {
            // If we were able to successfully find Articles, send them back to the client
            let hbsObject;
            hbsObject = {
                articles: retrievedArticles
            };
            res.render("saved", hbsObject);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for getting all Articles from the db
router.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

router.put("/save/:id", function (req, res) {
    db.Article.findOneAndUpdate({ _id: req.params.id }, { isSaved: true })
        .then(function (data) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(data);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });;
});

router.put("/remove/:id", function (req, res) {
    db.Article.findOneAndUpdate({ _id: req.params.id }, { isSaved: false })
        .then(function (data) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(data)
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
router.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.find({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate({
            path: 'note',
            model: 'Note'
        })
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
router.post("/note/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: { note: dbNote._id }}, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

router.delete("/note/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.findByIdAndRemove({ _id: req.params.id })
        .then(function (dbNote) {

            return db.Article.findOneAndUpdate({ note: req.params.id }, { $pullAll: [{ note: req.params.id }]});
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});



module.exports = router