"use client";

import { ActionMenu, Button } from "@navikt/ds-react";
import { MonitorIcon, MoonIcon, SunIcon } from "@navikt/aksel-icons";
import { useThemeMode, type ThemeMode } from "@/components/ThemeProvider";

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Lyst", Icon: SunIcon },
  { value: "dark", label: "Mørkt", Icon: MoonIcon },
  { value: "system", label: "Følg systemet", Icon: MonitorIcon },
];

export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();
  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[2];
  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button
          variant="tertiary"
          data-color="neutral"
          size="small"
          aria-label={`Fargetema: ${current.label}`}
          title={`Fargetema: ${current.label}`}
          icon={<current.Icon aria-hidden />}
        />
      </ActionMenu.Trigger>
      <ActionMenu.Content align="end">
        <ActionMenu.RadioGroup label="Fargetema" value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
          {OPTIONS.map((o) => (
            <ActionMenu.RadioItem key={o.value} value={o.value}>
              {o.label}
            </ActionMenu.RadioItem>
          ))}
        </ActionMenu.RadioGroup>
      </ActionMenu.Content>
    </ActionMenu>
  );
}
