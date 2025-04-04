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
    let token = req.cookies.token || req.headers.authorization;
    
    // Handle Bearer token
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    if (!token) {
        console.log("No token found");
        return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    try {  
        const decoded = jwt.verify(token, process.env.key);
        // Add user ID to the request
        req.user = {
            id: decoded.id,  // Add this
            email: decoded.email,
            name: decoded.name
        };
        next();
    } catch (error) {
        console.log("Token verification failed:", error.message);
        return res.status(401).json({ 
            error: "Unauthorized - Invalid token",
            details: error.message 
        });
    }
};

module.exports = { authMiddleware, validateUser };