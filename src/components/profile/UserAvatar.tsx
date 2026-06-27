import Avatar from "react-nice-avatar";
import { UserProfile } from "../../domain/models/types";
import { DEFAULT_AVATAR_CONFIG } from "../../domain/models/avatar";
import { getAvatarPreset } from "./avatarPresets";

interface UserAvatarProps {
  profile: UserProfile;
  size?: number;
}

export function UserAvatar({ profile, size = 36 }: UserAvatarProps) {
  const config =
    profile.avatarConfig ??
    getAvatarPreset(profile.avatarPresetId)?.config ??
    DEFAULT_AVATAR_CONFIG;

  return (
    <Avatar
      style={{ width: size, height: size }}
      shape="rounded"
      {...config}
    />
  );
}
