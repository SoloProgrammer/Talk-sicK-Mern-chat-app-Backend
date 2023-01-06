const mongoose = require('mongoose')
require('dotenv').config()
const colors = require("colors");

const connetToMongo = () =>{
    console.log('Connection is started...'.yellow.bold);
    mongoose.set('strictQuery', true).connect(process.env.mongoURI,{
        useNewUrlParser:true,
        useUnifiedTopology:true
    }).then(() =>{
        console.log('Connected to mongo sucessfully!'.cyan.underline)
    }).catch(err => console.log(`Connection to mongo fail due to error: ${err.message}`.red.bold))
    
}

module.exports = connetToMongo