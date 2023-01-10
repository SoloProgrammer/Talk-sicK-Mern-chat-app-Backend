const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const bcyrpt = require('bcryptjs')

const userSchama = new Schema({
    avatar: {
        default: "",
        type: String,
    },
    name: {
        type: String,
        trim: true,
        require: true
    },
    email: {
        type: String,
        require: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        require: true,
        trim: true
    },
    phone: {
        type: Number,
        default: 0
    },
    about:{
        type:String,
        default:"Hey my Talk-o-Meter is on now"
    }
}, { timestamps: true });

userSchama.methods.comparePassword = async function (enteredPass){
  return await bcyrpt.compare(enteredPass,this.password)
}

userSchama.pre('save', async function (next) {
    if (!this.isModified) {
        next()
    }
    const salt = await bcyrpt.genSalt(10)
    this.password = await bcyrpt.hash(this.password, salt)
})

module.exports = mongoose.model('users', userSchama)
