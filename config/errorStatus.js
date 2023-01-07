const errorRespose = (res, status, error) => {
    return res.status(400).json({ status, message: "Some error occured please try again later!", error: error.message })
}
const BadRespose = (res, status, msg) => {
    return res.status(400).json({ status, message: msg })
}

module.exports = { errorRespose, BadRespose }