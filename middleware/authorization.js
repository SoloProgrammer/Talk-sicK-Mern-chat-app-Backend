const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authorize = async (req, res, next) => {
    let status = false
    const token = req.headers.token
    if (!token) return res.status(401).json({ status, message: "Not authorized" })

    const invalidToken = (msg) => res.status(401).json({ status, message: msg });

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(decodedToken.id);

        if (!user) return invalidToken("Invalid Token - Not authorized")

        req.user = user;

        next();

    } catch (error) {
        return invalidToken("Not authorized - Session has been Expired or Token is Invalid")
    }

}

module.exports = authorize