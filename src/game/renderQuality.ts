/** Coarse-pointer devices include phones and embedded WeChat browsers. */
export const mobileRenderProfile =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

export const renderProfile = mobileRenderProfile
  ? {
      initialDpr: 0.75,
      minDpr: 0.55,
      // A shorter far plane cuts through the sky sphere when the player is
      // far from the map origin, exposing a coloured dome on mobile.
      cameraFar: 2400,
      shadowMapSize: 512,
      shadowExtent: 16,
    }
  : {
      initialDpr: 1,
      minDpr: 0.7,
      cameraFar: 2400,
      shadowMapSize: 1024,
      shadowExtent: 24,
    };
