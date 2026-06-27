import { useState } from "react";
import Avatar, {
  type AvatarFullConfig,
  type EarSize,
  type EyeStyle,
  type GlassesStyle,
  type HairStyle,
  type HatStyle,
  type MouthStyle,
  type NoseStyle,
  type ShirtStyle,
  type Sex,
} from "react-nice-avatar";
import { Tooltip } from "antd";
import {
  Ear,
  Eye,
  Glasses,
  HardHat,
  Palette,
  ScanFace,
  Scissors,
  Shirt,
  Smile,
  SmilePlus,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DEFAULT_AVATAR_CONFIG } from "../../domain/models/avatar";
import { profileAvatarPresets } from "./avatarPresets";

type AvatarFeatureKey =
  | "face"
  | "hair"
  | "hat"
  | "eyes"
  | "glasses"
  | "ear"
  | "nose"
  | "mouth"
  | "shirt";

type AvatarPatch = Partial<AvatarFullConfig>;

interface AvatarCustomizerProps {
  config?: AvatarFullConfig;
  selectedPresetId?: string;
  onChange: (config: AvatarFullConfig, presetId?: string) => void;
}

interface AvatarFeature {
  key: AvatarFeatureKey;
  label: string;
  icon: LucideIcon;
}

interface AvatarOption {
  label: string;
  patch: AvatarPatch;
  swatch?: string;
}

interface AvatarOptionGroup {
  label: string;
  options: AvatarOption[];
}

const AVATAR_FEATURES: AvatarFeature[] = [
  { key: "face", label: "Face", icon: ScanFace },
  { key: "hair", label: "Hair", icon: Scissors },
  { key: "hat", label: "Hat", icon: HardHat },
  { key: "eyes", label: "Eyes", icon: Eye },
  { key: "glasses", label: "Glasses", icon: Glasses },
  { key: "ear", label: "Ear", icon: Ear },
  { key: "nose", label: "Nose", icon: UserRound },
  { key: "mouth", label: "Mouth", icon: Smile },
  { key: "shirt", label: "Shirt", icon: Shirt },
];

const FACE_COLORS = ["#F9C9B6", "#AC6651"];
const HAIR_COLORS = ["#000", "#77311D", "#F48150", "#FC909F", "#6BD9E9", "#fff"];
const HAT_COLORS = ["#000", "#77311D", "#F48150", "#F4D150", "#506AF4", "#FC909F"];
const SHIRT_COLORS = ["#77311D", "#F48150", "#F4D150", "#6BD9E9", "#506AF4", "#FC909F"];
const BACKGROUND_COLORS = ["#FFEBA4", "#FFEDEF", "#D2EFF3", "#E0DDFF"];

const FEATURE_OPTION_GROUPS: Record<AvatarFeatureKey, AvatarOptionGroup[]> = {
  face: [
    {
      label: "Profile",
      options: [
        { label: "Man", patch: { sex: "man" satisfies Sex, eyeBrowStyle: "up" } },
        {
          label: "Woman",
          patch: { sex: "woman" satisfies Sex, eyeBrowStyle: "upWoman" },
        },
      ],
    },
    {
      label: "Tone",
      options: FACE_COLORS.map((color) => ({
        label: color,
        patch: { faceColor: color },
        swatch: color,
      })),
    },
    {
      label: "Background",
      options: BACKGROUND_COLORS.map((color) => ({
        label: color,
        patch: { bgColor: color },
        swatch: color,
      })),
    },
  ],
  hair: [
    {
      label: "Style",
      options: (["normal", "thick", "mohawk", "womanLong", "womanShort"] satisfies HairStyle[]).map(
        (hairStyle) => ({
          label: hairStyle,
          patch: { hairStyle },
        }),
      ),
    },
    {
      label: "Color",
      options: HAIR_COLORS.map((color) => ({
        label: color,
        patch: { hairColor: color },
        swatch: color,
      })),
    },
  ],
  hat: [
    {
      label: "Style",
      options: (["none", "beanie", "turban"] satisfies HatStyle[]).map((hatStyle) => ({
        label: hatStyle,
        patch: { hatStyle },
      })),
    },
    {
      label: "Color",
      options: HAT_COLORS.map((color) => ({
        label: color,
        patch: { hatColor: color },
        swatch: color,
      })),
    },
  ],
  eyes: [
    {
      label: "Eyes",
      options: (["circle", "oval", "smile"] satisfies EyeStyle[]).map((eyeStyle) => ({
        label: eyeStyle,
        patch: { eyeStyle },
      })),
    },
    {
      label: "Brow",
      options: [
        { label: "up", patch: { eyeBrowStyle: "up" } },
        { label: "upWoman", patch: { eyeBrowStyle: "upWoman" } },
      ],
    },
  ],
  glasses: [
    {
      label: "Style",
      options: (["none", "round", "square"] satisfies GlassesStyle[]).map(
        (glassesStyle) => ({
          label: glassesStyle,
          patch: { glassesStyle },
        }),
      ),
    },
  ],
  ear: [
    {
      label: "Size",
      options: (["small", "big"] satisfies EarSize[]).map((earSize) => ({
        label: earSize,
        patch: { earSize },
      })),
    },
  ],
  nose: [
    {
      label: "Shape",
      options: (["short", "long", "round"] satisfies NoseStyle[]).map((noseStyle) => ({
        label: noseStyle,
        patch: { noseStyle },
      })),
    },
  ],
  mouth: [
    {
      label: "Expression",
      options: (["smile", "laugh", "peace"] satisfies MouthStyle[]).map((mouthStyle) => ({
        label: mouthStyle,
        patch: { mouthStyle },
      })),
    },
  ],
  shirt: [
    {
      label: "Style",
      options: (["short", "polo", "hoody"] satisfies ShirtStyle[]).map((shirtStyle) => ({
        label: shirtStyle,
        patch: { shirtStyle },
      })),
    },
    {
      label: "Color",
      options: SHIRT_COLORS.map((color) => ({
        label: color,
        patch: { shirtColor: color },
        swatch: color,
      })),
    },
  ],
};

export function AvatarCustomizer({
  config,
  selectedPresetId,
  onChange,
}: AvatarCustomizerProps) {
  const [activeFeature, setActiveFeature] = useAvatarFeatureState();
  const currentConfig = config ?? DEFAULT_AVATAR_CONFIG;
  const activeFeatureItem = AVATAR_FEATURES.find((feature) => feature.key === activeFeature);

  function applyPatch(patch: AvatarPatch) {
    onChange(normalizeAvatarPatch(currentConfig, patch));
  }

  return (
    <div className="avatar-customizer">
      <div className="avatar-customizer-main">
        <div className="avatar-preview-stage">
          <Avatar
            className="avatar-preview-large"
            shape="rounded"
            style={{ width: 96, height: 96 }}
            {...currentConfig}
          />
        </div>
        <div className="avatar-feature-workbench">
          <div className="avatar-feature-rail" aria-label="Avatar feature controls">
            {AVATAR_FEATURES.map((feature) => {
              const Icon = feature.icon;
              const active = feature.key === activeFeature;
              return (
                <Tooltip key={feature.key} title={feature.label} placement="right">
                  <button
                    type="button"
                    className={`avatar-feature-button ${
                      active ? "avatar-feature-button-active" : ""
                    }`}
                    aria-label={feature.label}
                    aria-pressed={active}
                    onClick={() => setActiveFeature(feature.key)}
                  >
                    <Icon size={16} />
                  </button>
                </Tooltip>
              );
            })}
          </div>

          <div className="avatar-option-panel">
            <div className="avatar-option-heading">
              <span>{activeFeatureItem?.label}</span>
              <SmilePlus size={15} />
            </div>
            {FEATURE_OPTION_GROUPS[activeFeature].map((group) => (
              <div className="avatar-option-group" key={group.label}>
                <span>{group.label}</span>
                <div className="avatar-option-list">
                  {group.options.map((option) => {
                    const optionConfig = normalizeAvatarPatch(currentConfig, option.patch);
                    const active = isPatchActive(currentConfig, option.patch);
                    return (
                      <button
                        type="button"
                        key={`${group.label}-${option.label}`}
                        className={`avatar-option-button ${
                          active ? "avatar-option-button-active" : ""
                        }`}
                        title={option.label}
                        aria-label={`${group.label}: ${option.label}`}
                        aria-pressed={active}
                        onClick={() => applyPatch(option.patch)}
                      >
                        <span
                          className="avatar-option-preview"
                          style={
                            option.swatch
                              ? { backgroundColor: option.swatch }
                              : undefined
                          }
                        >
                          {option.swatch ? <Palette size={14} /> : (
                            <Avatar
                              shape="rounded"
                              style={{ width: 34, height: 34 }}
                              {...optionConfig}
                            />
                          )}
                        </span>
                        <small>{formatOptionLabel(option.label)}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="avatar-preset-column">
        <div className="avatar-preset-group">
          <div className="avatar-preset-heading">
            <span>Woman</span>
            <strong>4</strong>
          </div>
          <div className="avatar-preset-grid">
            {profileAvatarPresets
              .filter((preset) => preset.config.sex === "woman")
              .map((preset) => (
                <AvatarPresetButton
                  key={preset.id}
                  active={selectedPresetId === preset.id}
                  config={preset.config}
                  label={formatOptionLabel(preset.id)}
                  onClick={() => onChange(preset.config, preset.id)}
                />
              ))}
          </div>
        </div>

        <div className="avatar-preset-group">
          <div className="avatar-preset-heading">
            <span>Man</span>
            <strong>4</strong>
          </div>
          <div className="avatar-preset-grid">
            {profileAvatarPresets
              .filter((preset) => preset.config.sex === "man")
              .map((preset) => (
                <AvatarPresetButton
                  key={preset.id}
                  active={selectedPresetId === preset.id}
                  config={preset.config}
                  label={formatOptionLabel(preset.id)}
                  onClick={() => onChange(preset.config, preset.id)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarPresetButton({
  active,
  config,
  label,
  onClick,
}: {
  active: boolean;
  config: AvatarFullConfig;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`avatar-preset-choice ${active ? "avatar-preset-choice-active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      <Avatar shape="rounded" style={{ width: 46, height: 46 }} {...config} />
    </button>
  );
}

function normalizeAvatarPatch(
  config: AvatarFullConfig,
  patch: AvatarPatch,
): AvatarFullConfig {
  const next = {
    ...config,
    ...patch,
  };

  if (patch.sex === "man") {
    next.eyeBrowStyle = "up";
    if (next.hairStyle === "womanLong" || next.hairStyle === "womanShort") {
      next.hairStyle = "normal";
    }
  }

  if (patch.sex === "woman") {
    next.eyeBrowStyle = "upWoman";
  }

  return next;
}

function isPatchActive(config: AvatarFullConfig, patch: AvatarPatch): boolean {
  return Object.entries(patch).every(
    ([key, value]) => config[key as keyof AvatarFullConfig] === value,
  );
}

function formatOptionLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function useAvatarFeatureState() {
  return useState<AvatarFeatureKey>("face");
}
