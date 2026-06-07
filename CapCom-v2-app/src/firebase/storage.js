import { getStorage } from "firebase/storage";
import { firebaseApp } from "./firebaseConfig.js";

export const storage = getStorage(firebaseApp);
