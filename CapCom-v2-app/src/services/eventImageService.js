import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/storage.js";

const EVENT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

function getImageExtension(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]+$/.test(extension)) return extension;
  return file.type.split("/").pop()?.toLowerCase() || "jpg";
}

export function validateEventImageFile(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    return "Choose an image file.";
  }
  if (file.size > EVENT_IMAGE_MAX_BYTES) {
    return "Event image must be 2 MB or smaller.";
  }
  return "";
}

export async function uploadEventImage(eventId, file) {
  const extension = getImageExtension(file);
  const imageRef = ref(storage, `event-images/${eventId}/event-image.${extension}`);
  await uploadBytes(imageRef, file, {
    contentType: file.type,
    customMetadata: {
      eventId,
    },
  });
  return getDownloadURL(imageRef);
}
