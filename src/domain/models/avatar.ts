import type { AvatarFullConfig } from "react-nice-avatar";

export const DEFAULT_AVATAR_CONFIG: AvatarFullConfig = {
  sex: "woman",
  faceColor: "#F9C9B6",
  earSize: "small",
  hairColor: "#77311D",
  hairStyle: "womanShort",
  hatColor: "#F48150",
  hatStyle: "none",
  eyeStyle: "circle",
  eyeBrowStyle: "upWoman",
  glassesStyle: "none",
  noseStyle: "short",
  mouthStyle: "smile",
  shirtStyle: "short",
  shirtColor: "#F48150",
  bgColor: "#FFEBA4",
};

export type UserAvatarConfig = AvatarFullConfig;
