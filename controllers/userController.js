const genToken = require('../config/generateToken');
const User = require('../models/userModel')
const { errorRespose, BadRespose } = require('../config/errorStatus');


const createUser = async (req, res) => {
    let status = true
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return BadRespose(res, status, "All feilds are required!")
        }

        let user = await User.find({ email })

        if (user.length > 0) return BadRespose(res, false, "User with this email already exists")

        let newUser = await new User({ ...req.body }).save();

        let token = genToken(newUser.id)

        res.status(201).json({ status, token, message: "Your account has been created sucessfully!" })
    } catch (error) {
        status = false
        errorRespose(res, status, error)
    }
}

const authUser = async (req, res) => {
    const { email, password } = req.body;
    let status = false

    if (!email || !password) {
        return BadRespose(res, status, "All fields are required!")
    }

    try {
        const user = await User.findOne({ email })
        if (!user) return res.status(400).json({ status, message: "Create an account to login" });

        if (user && (await user.comparePassword(password))) {
            const token = genToken(user.id)
            res.status(200).json({ status: true, token, message: "Login Sucessfull!" })
        }
        else {
            res.status(400).json({ status, message: "Invalid email or password" })
        }

    } catch (error) {
        return errorRespose(res, status, error)
    }
}

const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(400).json({ status: false, message: "Some error occured try again later" })

        res.status(200).json({ status: true, user })
    } catch (error) {
        res.status(400).json({ status: false, message: "Some error occured try again later", error: error.message })
    }
}

const searchuser = async (req, res) => {

    let status = false
    let query = req.query.search

    if (!query) return BadRespose(res, status, "Query params is not send with the request")

    try {
        const keyword = {
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ]
        }

        const searchResults = await User.find(keyword).find({ _id: { $ne: req.user.id } }).select('-password');

        res.status(200).json({ status:true, searchResults })

    } catch (error) {
        errorRespose(res, status, error)
    }
}

module.exports = { createUser, authUser, searchuser, getUser }