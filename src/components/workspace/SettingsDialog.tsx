import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VellumButton } from "@/components/common/VellumButton";
import { useTheme, type ThemePreference } from "@/components/common/ThemeProvider";
import { testIds } from "@/testids";
import { cn } from "@/lib/utils";

const THEMES: ThemePreference[] = ["light", "dark", "system"];
const VERSIONS = ["11.4.1", "11.3.0", "10.9.1"];
const LANGUAGES = ["en", "ar", "de", "ja"];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mermaidVersion: string;
  onMermaidVersionChange: (version: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  mermaidVersion,
  onMermaidVersionChange,
  language,
  onLanguageChange,
}: SettingsDialogProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testIds.settings.dialog} className="bg-surface-raised">
        <DialogHeader>
          <DialogTitle className="text-h2">{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <fieldset data-testid={testIds.settings.theme}>
            <legend className="mb-xs text-body-sm font-medium text-ink">
              {t("settings.theme.label")}
            </legend>
            <div className="inline-flex rounded-sm border border-border p-2xs">
              {THEMES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={theme === option}
                  data-testid={`${testIds.settings.themeOption}.${option}`}
                  onClick={() => setTheme(option)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-sm px-sm text-body-sm vellum-motion transition-colors",
                    theme === option ? "bg-lagoon text-on-lagoon" : "text-slate hover:text-ink",
                  )}
                >
                  {t(`settings.theme.${option}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="settings-mermaid-version"
              className="mb-xs block text-body-sm font-medium text-ink"
            >
              {t("settings.mermaidVersion.label")}
            </label>
            <Select value={mermaidVersion} onValueChange={onMermaidVersionChange}>
              <SelectTrigger
                id="settings-mermaid-version"
                data-testid={testIds.settings.mermaidVersion}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERSIONS.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="settings-language"
              className="mb-xs block text-body-sm font-medium text-ink"
            >
              {t("settings.language.label")}
            </label>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger id="settings-language" data-testid={testIds.settings.language}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`settings.language.${code}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <VellumButton data-testid={testIds.settings.cancel} onClick={() => onOpenChange(false)}>
            {t("settings.cancel")}
          </VellumButton>
          <VellumButton
            variant="primary"
            data-testid={testIds.settings.save}
            onClick={() => onOpenChange(false)}
          >
            {t("settings.save")}
          </VellumButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
