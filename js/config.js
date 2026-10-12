// Everything Kaif still needs to fill in lives here.
// Replace each "[...]" value with the real link. Anything still in square
// brackets shows as a dashed placeholder on the page, so it is easy to spot.
export const CONFIG = {
  name: "Kaif Nadeem",
  email: "kfnadeem@gmail.com",
  linkedin: "https://www.linkedin.com/in/kaif-nadeem-0a026231a/", // e.g. https://www.linkedin.com/in/your-name/
  github: "https://github.com/kfnadeem-sudo", // e.g. https://github.com/kaifnadeem
  etsy: "https://www.etsy.com/shop/KNLayerworks", // e.g. https://www.etsy.com/shop/YourShopName
  photo: "img/kaif.jpg", // add the photo at site/img/kaif.jpg (4:5 portrait works best)
};

/** True once a value has been filled in (not a "[PLACEHOLDER]"). */
export const isSet = (v) => typeof v === "string" && v.length > 0 && !/^\[.*\]$/.test(v);
