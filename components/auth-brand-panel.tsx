import { FileText, MessageSquare, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

const PUNTOS = [
  { icon: FileText, texto: "Sube políticas, manuales y FAQs internas." },
  { icon: MessageSquare, texto: "Un asistente que responde solo con tus documentos." },
  { icon: ShieldCheck, texto: "Cada organización aislada — nunca se mezclan datos." },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 80%, white 0%, transparent 40%)",
        }}
      />
      <Logo className="relative text-primary-foreground" />

      <div className="relative space-y-8">
        <p className="text-2xl leading-snug font-medium text-balance">
          El asistente de IA de tu empresa, entrenado con tus propios documentos.
        </p>
        <ul className="space-y-4">
          {PUNTOS.map(({ icon: Icon, texto }) => (
            <li key={texto} className="flex items-start gap-3 text-sm text-primary-foreground/90">
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} Enterprise AI Assistant
      </p>
    </div>
  );
}
