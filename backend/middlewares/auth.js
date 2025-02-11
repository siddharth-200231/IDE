
const zod = require("zod");
const user = require("../models/user");

const z = zod.object({
    email: zod.string().email(),
    password: zod.string().min(6)
});
const authMiddleware = async (req, res, next) => {
    try {
        const validatedData = z.parse(req.body);
        const { email, password } = validatedData;
        const existingUser = await user.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({ error: "User not found" });
        }
        if (existingUser.password !== password) {
            return res.status(401).json({ error: "Invalid password" });
        }
        req.user = existingUser;
        next(); 
    } catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors,
            });
        }
        return res.status(500).json({ error: "Something went wrong" });
    }

}

const jwt = require("jsonwebtoken");
const validateUser = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization ;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const user = jwt.verify(token, process.env.key);
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }
}



module.exports = { authMiddleware, validateUser };