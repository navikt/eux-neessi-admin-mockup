import {
  AT, BE, BG, CH, CY, CZ, DE, DK, EE, ES, EU, FI, FR, GB, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, MT, NL, NO, PL, PT, RO, SE, SI, SK,
} from "country-flag-icons/react/3x2";

const FLAGS: Record<string, typeof SE> = {
  AT, BE, BG, CH, CY, CZ, DE, DK, EE, ES, EU, FI, FR, GB, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, MT, NL, NO, PL, PT, RO, SE, SI, SK,
};

export function Flag({ code, size = "md", title }: { code: string; size?: "md" | "lg"; title?: string }) {
  const Svg = FLAGS[code];
  return (
    <span className={`flag${size === "lg" ? " flag--lg" : ""}`} title={title ?? code}>
      {Svg ? <Svg aria-hidden /> : null}
    </span>
  );
}
