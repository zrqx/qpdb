const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const fileSchema = new Schema({
    id : String,
    type : String,
    uniqueId : String,
    messageId : String,
    name : String,
    size : Number,
    caption : {
        type: String,
        default: 'Forgot'
    },
    sender : String,
    code : {
        type : String,
        default : 'PENDING'
    }
})

module.exports = mongoose.model('file', fileSchema)