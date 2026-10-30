"use client";

import { useQueryStates } from "nuqs";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MAX_FIGURES_PER_ROW,
  MIN_FIGURES_PER_ROW,
  clampFiguresPerRow,
  printOptionParsers,
} from "@/lib/print-options";

interface PrintControlsProps {
  backHref: string;
}

const COLUMN_CHOICES = Array.from(
  { length: MAX_FIGURES_PER_ROW - MIN_FIGURES_PER_ROW + 1 },
  (_, index) => MIN_FIGURES_PER_ROW + index,
);

export function PrintControls({ backHref }: PrintControlsProps) {
  const [options, setOptions] = useQueryStates(printOptionParsers, { shallow: false });
  const figuresPerRow = clampFiguresPerRow(options.figuresPerRow);

  return (
    <div className="bg-card mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border p-3 print:hidden">
      <Button asChild variant="ghost" size="sm">
        <Link href={backHref}>
          <ArrowLeft /> Back
        </Link>
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm">Figures per row</span>
        <div className="flex gap-1">
          {COLUMN_CHOICES.map((count) => (
            <Button
              key={count}
              size="xs"
              variant={count === figuresPerRow ? "default" : "outline"}
              onClick={() => void setOptions({ figuresPerRow: count })}
              aria-pressed={count === figuresPerRow}
            >
              {count}
            </Button>
          ))}
        </div>
      </div>

      <OptionSwitch
        id="opt-cues"
        label="Cues"
        checked={options.cues}
        onCheckedChange={(cues) => void setOptions({ cues })}
      />
      <OptionSwitch
        id="opt-sanskrit"
        label="Sanskrit"
        checked={options.sanskrit}
        onCheckedChange={(sanskrit) => void setOptions({ sanskrit })}
      />
      <OptionSwitch
        id="opt-outline"
        label="Outline only"
        checked={options.outlineOnly}
        onCheckedChange={(outlineOnly) => void setOptions({ outlineOnly })}
      />

      <Button className="ml-auto" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </div>
  );
}

interface OptionSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function OptionSwitch({ id, label, checked, onCheckedChange }: OptionSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
