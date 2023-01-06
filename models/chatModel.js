const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chatSchema = new Schema({
    chatName:{
        type:String,
        trim:true,
        required:true
    },
    users:[{
        type:Schema.Types.ObjectId,
        ref:"users"
    }],
    isGroupchat:{
        type:Boolean,
        default:false
    },
    latestMessage:{
        type:String,
        ref:"messages"
    },
    groupAdmin:{
        type:Schema.Types.ObjectId,
        trim:true,
        ref:"users"
    },
},{timestamps:true})

module.exports = mongoose.model('chats',chatSchema)