const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name : String,
    username : String,
    id : String,
    preference : String,
    firstInteraction : Date
})

module.exports = mongoose.model('user', userSchema)