import { User } from "../models/User";
import { UserInterface } from "../Types/user";

export const createUser = async (userData: UserInterface) => {
  try {
    const user = new User({
      whatsappId: userData.WhatsappId,
      name: userData.Name || "unknown",
    });

    await user.save();
    console.log("User created:", user);
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const findUserByWhatsappId = async (whatsappId: string) => {
  try {
    const user = await User.findOne({ whatsappId: whatsappId });
    return user;
  } catch (error) {
    console.error("Error finding user:", error);
    throw error;
  }
};
