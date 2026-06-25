import Avatar from "react-nice-avatar";
import { UserProfile } from "../../domain/models/types";
import { SquirrelIcon } from "../brand/SquirrelIcon";
import { getAvatarPreset } from "./avatarPresets";

interface UserAvatarProps {
  profile: UserProfile;
  size?: number;
}

export function UserAvatar({ profile, size = 36 }: UserAvatarProps) {
  const preset = getAvatarPreset(profile.avatarPresetId);

  if (!preset) {
    return <SquirrelIcon size={size} />;
  }

  return (
    <Avatar
      style={{ width: size, height: size }}
      shape="rounded"
      {...preset.config}
    />
  );
}
