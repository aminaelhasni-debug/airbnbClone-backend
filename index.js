const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config(); 
const dotenv = require('dotenv');
const cors = require('cors');
const userController = require("./controllers/userController");
const listingController = require("./controllers/listingContorller");
const bookingController = require("./controllers/bookingController");
const path = require('path');


const PORT = process.env.PORT || 5000;

// Load .env variables
dotenv.config();

const app =  express();
// allows json to read and accept data 
app.use(express.json());

app.get("/headers-test", (req, res) => {
  res.json(req.headers);
});

// uploads app

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors());
app.use(express.json());

// connect mongoose

mongoose.connect(process.env.dbconnect)
.then (()=> console.log("done"))
.catch(() => console.log("error"));


// router
app.use("/", userController );
app.use("/", listingController );
app.use("/", bookingController );
app.get("/test", (req, res) => {
    res.send("hello test page ")
});


app.listen(5000, () => { console.log ("server is runing in port 5000")});