import mongoose from "mongoose";

export async function connectToMongoDB() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("MONGO_URL is not defined in environment variables");
  }
  try {
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// event Listenerns
mongoose.connection.on("connected", () => {
  console.log("Event: Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Event: Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Event: Mongoose disconnected from MongoDB");
});

export default mongoose;
